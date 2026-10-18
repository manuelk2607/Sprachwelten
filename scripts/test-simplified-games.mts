import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import type {Game,GameView} from '../lib/game';
import type {RoomAction} from '../lib/content';
import {edgeLetter} from '../lib/word-chain';
const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use a local QA server.');
assert.ok(process.env.TEST_DATABASE_HOST&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===process.env.TEST_DATABASE_HOST,'Use an isolated QA database.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
const codes:string[]=[];
type Payload={room:GameView;token:string;error?:string};
async function request(path:string,data?:unknown,token?:string){
 const response=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 return {status:response.status,data:await response.json() as Payload};
}
try{
 for(const locale of ['de','en'] as const)for(const mode of ['meaning-quiz','word-outsider','loanword-quiz','word-chain'] as const){
  const host=await request('/api/rooms',{name:'QA Host',locale,...(mode==='meaning-quiz'?{}:{mode}),meaningCategory:'gaming'});assert.equal(host.status,201,JSON.stringify(host.data));const code=host.data.room.code;codes.push(code);assert.equal(host.data.room.mode,mode);
  const guest=await request(`/api/rooms/${code}/join`,{name:'QA Guest'});assert.equal(guest.status,201);const tokens=[host.data.token,guest.data.token];
  let current=await request(`/api/rooms/${code}`,{action:'start'},tokens[0]);assert.equal(current.status,200,JSON.stringify(current.data));
  for(let round=1;round<=2;round++){
   const view=current.data.room;assert.equal(view.revelation,null);assert.equal(view.team,null);assert.ok(!JSON.stringify(view).includes('correctIndex'));
   if(mode==='word-chain'){
    for(let turn=0;turn<2;turn++){
     const chain=current.data.room.chain!;const index=current.data.room.players.findIndex(player=>player.id===chain.activePlayerId);assert.ok(index>=0);const own=await request(`/api/rooms/${code}`,undefined,tokens[index]);const choices=own.data.room.chain!.choices;assert.equal(choices.length,4);const word=choices.find(word=>edgeLetter(word.text,'first')===chain.requiredLetter)!;
     const action:RoomAction={action:'chain',wordId:word.id,turn:chain.turn,matchId:view.matchId,roundNumber:round};assert.equal((await request(`/api/rooms/${code}`,action,tokens[1-index])).status,403);current=await request(`/api/rooms/${code}`,action,tokens[index]);assert.equal(current.status,200);assert.ok((await request(`/api/rooms/${code}`,action,tokens[index])).status>=400);
    }
   }else{
    assert.equal(view.phase,'voting');assert.equal(view.options.length,4);assert.ok(view.options.every(option=>!('correct' in option)));const [row]=await sql`SELECT state FROM game_rooms WHERE code=${code}`;const game=row.state as Game;const correct=game.round!.options.find(option=>option.solution)!,wrong=game.round!.options.find(option=>!option.solution)!;
    const results=await Promise.all(tokens.map((token,index)=>request(`/api/rooms/${code}`,{action:'vote',optionId:index?wrong.id:correct.id},token)));assert.ok(results.every(result=>result.status===200));current=await request(`/api/rooms/${code}`,undefined,tokens[0]);
   }
   assert.equal(current.data.room.phase,'reveal');current=await request(`/api/rooms/${code}`,{action:'next'},tokens[0]);assert.equal(current.status,200);
  }
  assert.equal(current.data.room.phase,'finished');assert.deepEqual(current.data.room.players.map(player=>player.score),mode==='word-chain'?[2,2]:[2,0]);
  const previous=current.data.room.matchId;const restarted=await request(`/api/rooms/${code}`,{action:'restart',rounds:2},tokens[0]);assert.equal(restarted.status,200);assert.notEqual(restarted.data.room.matchId,previous);assert.ok(restarted.data.room.players.every(player=>player.score===0));
 }
 console.log('PASS: all four new flows in DE/EN, anonymous solo-compatible creation, two-player rounds, concurrent votes, private solutions, stale-turn rejection, individual scores and rematches.');
}finally{for(const code of codes)await sql`DELETE FROM game_rooms WHERE code=${code}`;}
