import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {gamePrompts} from '../db/repository';
import type {Game,GameView} from '../lib/game';
const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));assert.ok(process.env.TEST_DATABASE_HOST&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===process.env.TEST_DATABASE_HOST,'Use the isolated QA database.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),codes:string[]=[],ip=`198.18.${crypto.getRandomValues(new Uint8Array(1))[0]}.17`;
type Payload={room:GameView;token:string;error?:string};
async function request(path:string,data?:unknown,token?:string){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{Origin:base,'Content-Type':'application/json'}:{}),'cf-connecting-ip':ip,...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,data:await response.json() as Payload};}
async function complete(code:string,tokens:string[],seen:Set<string>){
 let current=await request('/api/rooms/'+code,undefined,tokens[0]);assert.equal(current.data.room.phase,'speaking');const key=current.data.room.prompt!.audioId??current.data.room.prompt!.phrase;assert.ok(!seen.has(key));seen.add(key);
 for(let index=0;index<tokens.length;index++){
   const target={speakerId:current.data.room.pronunciation!.speaker.id,roundNumber:current.data.room.roundNumber,matchId:current.data.room.matchId};
   assert.equal((await request('/api/rooms/'+code,{action:'performed',...target},tokens[index])).status,200);
   current=await request('/api/rooms/'+code,{action:'rate',...target,clarity:5,accuracy:5,rhythm:5},tokens[1-index]);assert.equal(current.status,200,JSON.stringify(current.data));
 }
 assert.equal(current.data.room.phase,'reveal');const finished=await request('/api/rooms/'+code,{action:'next'},tokens[0]);assert.equal(finished.data.room.phase,'finished');
}
try{
 const created=await request('/api/rooms',{name:'QA Language Host',mode:'tongue-twisters',locale:'de'});assert.equal(created.status,201,JSON.stringify(created.data));const code=created.data.room.code,token=created.data.token;codes.push(code);assert.equal(created.data.room.pronunciationLanguage,'de');
 const guest=await request('/api/rooms/'+code+'/join',{name:'QA Language Listener'});assert.equal(guest.status,201);const tokens=[token,guest.data.token];
 assert.equal((await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'fr'},tokens[1])).status,403);
 assert.equal((await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'invented-language'},token)).status,422);
 for(const language of ['de','fr','en'])for(const category of ['both','twister','sound'] as const){
   const configured=await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:language,pronunciationCategory:category},token);assert.equal(configured.status,200,JSON.stringify(configured.data));assert.equal(configured.data.room.pronunciationLanguage,language);
   const prompts=await gamePrompts('tongue-twisters',{pronunciationLanguage:language,pronunciationCategory:category});assert.ok(prompts.every(entry=>entry.language===language&&(category==='both'||entry.kind===(category==='sound'?'sound_pair':'tongue_twister'))));
   assert.ok(configured.data.room.maxRounds<=Math.min(10,prompts.length));
 }
 const empty=await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'ko'},token);assert.equal(empty.status,200);assert.equal(empty.data.room.maxRounds,0);assert.equal((await request('/api/rooms/'+code,{action:'start'},token)).status,409);
 const mixed=await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'',pronunciationCategory:'both'},token);assert.equal(mixed.status,200);assert.equal(mixed.data.room.pronunciationLanguage,'');assert.ok(mixed.data.room.maxRounds>0);
 await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'de',rounds:1},token);const started=await request('/api/rooms/'+code,{action:'start'},token);assert.equal(started.status,200,JSON.stringify(started.data));assert.equal(started.data.room.prompt?.language,'de');assert.equal((await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'fr'},token)).status,409);
 const seen=new Set<string>();await complete(code,tokens,seen);
 const direct=await request('/api/rooms/'+code,{action:'restart',immediate:true},token);assert.equal(direct.status,200,JSON.stringify(direct.data));assert.equal(direct.data.room.pronunciationLanguage,'de');assert.equal(direct.data.room.prompt?.language,'de');await complete(code,tokens,seen);
 await request('/api/rooms/'+code,{action:'restart'},token);await request('/api/rooms/'+code,{action:'configure',pronunciationLanguage:'fr'},token);const french=await request('/api/rooms/'+code,{action:'start'},token);assert.equal(french.status,200,JSON.stringify(french.data));assert.equal(french.data.room.prompt?.language,'fr');
 const [stored]=await sql`SELECT state FROM game_rooms WHERE code=${code}`;const state=stored.state as Game;assert.equal(state.pronunciationLanguage,'fr');assert.ok(state.prompts.every(entry=>entry.language==='fr'));assert.ok(state.playedPrompts!.length>=3);
 console.log('PASS: source-language defaults, validated host-only filters in both categories, empty languages, SQL filtering before sampling, direct rematches, persistent history and French-only subsequent matches.');
}finally{for(const code of codes)await sql`DELETE FROM game_rooms WHERE code=${code}`;}
