import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {entryInput,type Entry} from '../lib/content';
import {createGame,act,type GameView} from '../lib/game';
import {getEntry,gamePrompts,insertRoom} from '../db/repository';

const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
assert.ok(process.env.TEST_DATABASE_HOST&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===process.env.TEST_DATABASE_HOST,'Use the isolated QA database.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),stamp=Date.now(),ids:string[]=[],codes:string[]=[],cookies=new Map<string,string>();
type Payload={entry:Entry;room:GameView;error?:string;user?:{id:string}};
async function request(path:string,method='GET',data?:unknown,token?:string){
  const response=await fetch(base+path,{method,headers:{Origin:base,...(data?{'Content-Type':'application/json'}:{}),Cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join('; '),...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
  for(const raw of response.headers.getSetCookie()){const [pair]=raw.split(';'),index=pair.indexOf('=');cookies.set(pair.slice(0,index),pair.slice(index+1));}
  return {status:response.status,data:await response.json() as Payload};
}
const clean=(entry:Entry)=>entryInput.parse({...entry,audioId:entry.audioId??undefined,challenge:entry.challenge??undefined,regionId:entry.regionId??undefined,contextId:entry.contextId??undefined});
try{
  const signup=await request('/api/auth/sign-up/email','POST',{email:`qa-hints-${stamp}@sprachwelten.invalid`,password:crypto.randomUUID()+'!Aa1',name:'QA Dialect Hints'});assert.equal(signup.status,200,JSON.stringify(signup.data));
  const sources:Entry[]=[];
  for(let i=0;i<4;i++){
    const added=await request('/api/entries','POST',{kind:'dialect',phrase:`QA Tipp ${stamp} ${i}`,language:'de',regionId:'ch',literal:`Bedeutung ${i}`,hint:`Ein deutscher Hinweis ${i}.`,sourceLocale:'de',translation:{literal:`Meaning ${i}`,hint:`An English clue ${i}.`},translationReviewed:true});
    assert.equal(added.status,201,JSON.stringify(added.data));ids.push(added.data.entry.id);sources.push(added.data.entry);
    assert.equal(added.data.entry.hint,`Ein deutscher Hinweis ${i}.`);assert.equal((await getEntry(ids[i]))?.translations?.en?.hint,`An English clue ${i}.`);
  }
  const edited=await request('/api/me/entries/'+ids[0],'PATCH',{...clean(sources[0]),hint:'Ein neuer Hinweis.',translation:{literal:'Meaning 0',hint:'A new clue.'},translationReviewed:true,revision:0});assert.equal(edited.status,200,JSON.stringify(edited.data));
  const reloaded=await request('/api/entries/'+ids[0]);assert.equal(reloaded.data.entry.hint,'Ein neuer Hinweis.');assert.equal(reloaded.data.entry.translations?.en?.hint,'A new clue.');sources[0]=reloaded.data.entry;
  assert.equal((await request('/api/me/entries/'+ids[0],'PATCH',{...clean(sources[0]),hint:'Stale',revision:0})).status,409);
  const previous=await sql`SELECT id FROM content_entries WHERE kind='dialect' AND NOT(id=ANY(${ids}::uuid[]))`;
  const sampled=await gamePrompts('dialect-detective',{playedPrompts:previous.map(row=>({id:row.id as string,key:''}))});
  assert.ok(sampled.some(entry=>entry.id===ids[0]&&entry.hint==='Ein neuer Hinweis.'));
  for(const mode of ['meaning-quiz','dialect-detective'] as const)for(const locale of ['de','en'] as const){
    const bytes=crypto.getRandomValues(new Uint8Array(32)),token=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),tokenHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    const code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase(),host={id:crypto.randomUUID(),name:'QA Hint Game',tokenHash,score:0},game=createGame(code,host,locale,mode);
    act(game,host.id,{action:'start'},sources);await insertRoom(game);codes.push(code);
    const view=await request('/api/rooms/'+code,'GET',undefined,token);assert.equal(view.status,200,JSON.stringify(view.data));assert.equal(view.data.room.hint?.text,game.round!.entry.hint);
    assert.equal(view.data.room.hint?.status,locale==='de'?'original':'translated');assert.equal(view.data.room.revelation,null);assert.ok(!JSON.stringify(view.data.room).includes(game.prompts[1].hint!));
    const right=game.round!.options.find(option=>option.solution??(option.categoryId===game.round!.entry.regionId))!;
    const voted=await request('/api/rooms/'+code,'POST',{action:'vote',optionId:right.id},token);assert.equal(voted.status,200);assert.equal(voted.data.room.hint,null);assert.equal(voted.data.room.players[0].score,1);
  }
  const removed=await request('/api/me/entries/'+ids[0],'PATCH',{...clean(sources[0]),hint:'',translation:{literal:'Meaning 0'},translationReviewed:true,revision:1});assert.equal(removed.status,200,JSON.stringify(removed.data));assert.equal((await getEntry(ids[0]))?.hint,'');assert.equal((await getEntry(ids[0]))?.translations?.en?.hint,undefined);
  console.log('PASS: bilingual hints survive creation, own edits and room snapshots, stay scoped to the current card, preserve hidden answers, score normally and can be removed; stale revisions are rejected.');
}finally{
  for(const code of codes)await sql`DELETE FROM game_rooms WHERE code=${code}`;
  for(const id of ids){await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;await sql`DELETE FROM content_entries WHERE id=${id}`;}
}
