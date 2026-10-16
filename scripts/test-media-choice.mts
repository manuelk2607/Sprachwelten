import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {addEntry,gamePrompts,insertRoom} from '../db/repository';
import {entryInput,type Entry} from '../lib/content';
import {act,createGame,type GameView} from '../lib/game';
import {audioSampleRate,encodeAudioWave} from '../lib/audio-format';
const base='http://localhost:5176',expected=process.env.TEST_DATABASE_HOST;
assert.ok(expected&&expected!=='','Use an isolated QA database.');assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname,expected);
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),stamp=Date.now(),entries:string[]=[],rooms:string[]=[],clips:{id:string;jar:Map<string,string>}[]=[];
type Payload={entry?:Entry;room?:GameView;audio?:{id:string};user?:{id:string};error?:string;duplicate?:{id:string};removed?:boolean};
const jar=new Map<string,string>(),otherJar=new Map<string,string>();
const cookies=(v:Map<string,string>)=>[...v].map(([k,value])=>`${k}=${value}`).join('; ');
async function request(path:string,data?:unknown,auth=jar,token?:string){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,...(data?{'Content-Type':'application/json'}:{}),Cookie:cookies(auth),...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});for(const raw of response.headers.getSetCookie()){const [part]=raw.split(';'),n=part.indexOf('=');auth.set(part.slice(0,n),part.slice(n+1));}return {status:response.status,data:await response.json() as Payload};}
const wave=(frequency:number)=>new Uint8Array(encodeAudioWave(Float32Array.from({length:1600},(_,i)=>Math.sin(2*Math.PI*frequency*i/audioSampleRate)*0.1)));
async function upload(bytes:Uint8Array,auth=jar){const response=await fetch(base+'/api/audio',{method:'POST',headers:{Origin:base,Cookie:cookies(auth),'Content-Type':'audio/wav'},body:new Uint8Array(bytes).buffer});const payload=await response.json() as Payload;assert.equal(response.status,201,JSON.stringify(payload));const id=payload.audio!.id;clips.push({id,jar:auth});return id;}
async function contribute(body:unknown){const result=await request('/api/entries',body);if(result.status===201)entries.push(result.data.entry!.id);return result;}
try{
 const probe=await addEntry(entryInput.parse({kind:'word',language:'en',phrase:'QA-media-probe-'+stamp}),'qa-media-probe-'+stamp,'QA Media');entries.push(probe.id);assert.equal((await request('/api/entries/'+probe.id)).status,200,'The server must point at this isolated database.');
 const signup=await request('/api/auth/sign-up/email',{email:`qa-media-${stamp}@sprachwelten.invalid`,password:crypto.randomUUID()+'!Aa1',name:'QA Media'});assert.equal(signup.status,200);const owner=signup.data.user!.id;
 const text=await contribute({kind:'word',language:'en',phrase:'QA media text '+stamp,presentation:'text'});assert.equal(text.status,201);assert.equal(text.data.entry!.audioId,null);assert.equal(text.data.entry!.presentation,'text');
 const first=await upload(wave(440)),clone=await upload(wave(440)),second=await upload(wave(660));
 assert.equal((await fetch(base+'/api/audio/'+first)).status,404,'Draft recordings remain private.');
 const audio=await contribute({kind:'word',language:'en',presentation:'audio',audioId:first,audioHash:'0'.repeat(64),authorId:'forged-owner'});assert.equal(audio.status,201,JSON.stringify(audio.data));assert.equal(audio.data.entry!.phrase,'');assert.equal(audio.data.entry!.presentation,'audio');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',wave(440))),b=>b.toString(16).padStart(2,'0')).join('');const stored=await sql`SELECT audio_hash,author_id FROM content_entries WHERE id=${audio.data.entry!.id}`;assert.equal(stored[0].audio_hash,hash);assert.equal(stored[0].author_id,owner);
 assert.equal((await fetch(base+'/api/audio/'+first)).status,200);
 const duplicate=await contribute({kind:'word',language:'en',presentation:'audio',audioId:clone});assert.equal(duplicate.status,409);assert.equal(duplicate.data.duplicate!.id,audio.data.entry!.id);
 const audio2=await contribute({kind:'word',language:'en',presentation:'audio',audioId:second});assert.equal(audio2.status,201);assert.notEqual(audio.data.entry!.id,audio2.data.entry!.id);
 const ambiguous=await contribute({kind:'word',language:'de',presentation:'audio',audioId:clone});assert.equal(ambiguous.status,201);const playable=await gamePrompts('language-quiz');assert.ok(!playable.some(e=>e.id===ambiguous.data.entry!.id||e.id===audio.data.entry!.id),'The same sound with conflicting language answers is not an unambiguous quiz.');assert.ok(playable.some(e=>e.id===audio2.data.entry!.id),'Different recordings do not collapse through an empty phrase.');await sql`DELETE FROM content_entries WHERE id=${ambiguous.data.entry!.id}`;
 const combinedClip=await upload(wave(990));const combined=await contribute({kind:'word',language:'en',phrase:'QA media combined '+stamp,presentation:'both',audioId:combinedClip});assert.equal(combined.status,201);assert.equal(combined.data.entry!.presentation,'both');
 const legacy=await contribute({kind:'tongue_twister',language:'en',phrase:'QA legacy spoken sentence '+stamp,audioId:combinedClip});assert.equal(legacy.status,201);assert.equal(legacy.data.entry!.presentation,'both');
 for(const body of [{kind:'word',language:'en',presentation:'audio'},{kind:'word',language:'en',presentation:'both',audioId:first},{kind:'word',language:'en',presentation:'text',audioId:first,phrase:'Invalid media'}])assert.equal((await contribute(body)).status,422);
 const signup2=await request('/api/auth/sign-up/email',{email:`qa-media-other-${stamp}@sprachwelten.invalid`,password:crypto.randomUUID()+'!Aa1',name:'QA Other Media'},otherJar);assert.equal(signup2.status,200);assert.equal((await request('/api/entries',{kind:'word',language:'en',presentation:'audio',audioId:first},otherJar)).status,422);
 const raceClips=[await upload(wave(880)),await upload(wave(880))];const racing=await Promise.all(raceClips.map((audioId,i)=>contribute({kind:'word',language:'en',presentation:'both',audioId,phrase:`QA audio race ${stamp} ${i}`})));assert.deepEqual(racing.map(r=>r.status).sort(),[201,409]);
 await assert.rejects(sql`INSERT INTO content_entries(kind,phrase,language,meaning,author_name,presentation,audio_id) VALUES ('word','QA media invalid database','en','','QA Media','text',${first})`);
 for(const source of [text.data.entry!,audio.data.entry!,combined.data.entry!]){
  const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');const p={id:crypto.randomUUID(),name:'QA Media Player',tokenHash:digest,score:0};const code='M'+crypto.randomUUID().slice(0,5).toUpperCase(),game=createGame(code,p,'en','language-quiz');game.totalRounds=1;act(game,p.id,{action:'start'},[source]);await insertRoom(game);rooms.push(code);
  const view=await request('/api/rooms/'+code,undefined,jar,token);assert.equal(view.status,200);assert.equal(view.data.room!.prompt?.presentation,source.presentation);assert.equal(view.data.room!.prompt?.phrase,source.presentation==='audio'?'':source.phrase);assert.equal(view.data.room!.prompt?.audioId,source.presentation==='text'?undefined:source.audioId);assert.equal(view.data.room!.revelation,null);
  const correct=game.round!.options.find(o=>o.language===source.language)!.id;const result=await request('/api/rooms/'+code,{action:'vote',optionId:correct},jar,token);assert.equal(result.status,200);assert.equal(result.data.room!.phase,'reveal');assert.equal(result.data.room!.players[0].score,1);
 }
 console.log('PASS: text/audio/both, private draft and playback, server hashes, ownership, no-text contributions, distinct recordings, ambiguous-language exclusion, duplicate races, legacy input and persisted game projections.');
}finally{
 for(const code of rooms)await sql`DELETE FROM game_rooms WHERE code=${code}`;
 for(const id of entries)await sql`DELETE FROM content_entries WHERE id=${id}`;
 for(const clip of clips)await fetch(base+'/api/audio/'+clip.id,{method:'DELETE',headers:{Origin:base,Cookie:cookies(clip.jar)}});
 await request('/api/auth/sign-out',{},jar);if(otherJar.size)await request('/api/auth/sign-out',{},otherJar);
}
