import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import type {Game,GameView} from '../lib/game';

const base=process.env.TEST_BASE_URL??'http://localhost:5176';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
assert.ok(process.env.TEST_DATABASE_HOST&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===process.env.TEST_DATABASE_HOST,'Use the isolated QA database.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),codes:string[]=[];
type Payload={room:GameView;token:string;error?:string};
async function request(path:string,data?:unknown,token?:string){
  const response=await fetch(base+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
  return {status:response.status,data:await response.json() as Payload};
}
async function play(code:string,token:string,shown:Set<string>,started=false){
  let current=await request(`/api/rooms/${code}`,started?undefined:{action:'start'},token);assert.equal(current.status,200,JSON.stringify(current.data));
  while(current.data.room.phase==='voting'){
    const view=current.data.room;assert.ok(!shown.has(view.prompt!.phrase));shown.add(view.prompt!.phrase);
    assert.equal(view.revelation,null);assert.ok(!('playedPrompts' in view)&&!('prompts' in view));assert.ok(view.options.every(option=>!('correct' in option)));
    const [row]=await sql`SELECT state FROM game_rooms WHERE code=${code}`;const game=row.state as Game;
    const right=game.round!.options.find(option=>option.solution??(option.language===game.round!.entry.language))!;
    const voted=await request(`/api/rooms/${code}`,{action:'vote',optionId:right.id},token);assert.equal(voted.data.room.phase,'reveal');
    current=await request(`/api/rooms/${code}`,{action:'next'},token);assert.equal(current.status,200);
  }
  assert.equal(current.data.room.phase,'finished');return current.data.room;
}
try{
  const host=await request('/api/rooms',{name:'QA Rematch',mode:'meaning-quiz',meaningCategory:'gaming'});assert.equal(host.status,201,JSON.stringify(host.data));
  const code=host.data.room.code,token=host.data.token;codes.push(code);const seen=new Set<string>();
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:11},token)).status,422);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',rounds:10},token)).status,200);
  const first=await play(code,token,seen),direct=await request(`/api/rooms/${code}`,{action:'restart',immediate:true},token);
  assert.equal(direct.status,200,JSON.stringify(direct.data));assert.equal(direct.data.room.phase,'voting');assert.notEqual(direct.data.room.matchId,first.matchId);assert.equal(direct.data.room.totalRounds,10);assert.equal(direct.data.room.meaningCategory,'gaming');assert.equal(direct.data.room.players[0].score,0);
  const finished=await play(code,token,seen,true),lobby=await request(`/api/rooms/${code}`,{action:'restart'},token);
  assert.equal(lobby.status,200);assert.equal(lobby.data.room.phase,'lobby');assert.notEqual(lobby.data.room.matchId,finished.matchId);assert.equal(lobby.data.room.players[0].score,0);
  assert.equal(seen.size,20);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',meaningCategory:'youth',rounds:1},token)).status,200);
  await play(code,token,seen);await request(`/api/rooms/${code}`,{action:'restart'},token);
  assert.equal((await request(`/api/rooms/${code}`,{action:'configure',meaningCategory:'gaming',rounds:1},token)).status,200);
  await play(code,token,seen);
  const exhausted=await request('/api/rooms',{name:'QA Exhaustion',mode:'loanword-quiz'});assert.equal(exhausted.status,201);const second=exhausted.data.room.code,secondToken=exhausted.data.token;codes.push(second);
  const maximum=exhausted.data.room.maxRounds;assert.ok(maximum>0&&maximum<=10);
  assert.equal((await request(`/api/rooms/${second}`,{action:'configure',rounds:maximum},secondToken)).status,200);
  await play(second,secondToken,new Set());const empty=await request(`/api/rooms/${second}`,{action:'restart'},secondToken);
  assert.equal(empty.data.room.phase,'lobby');assert.equal(empty.data.room.maxRounds,0);assert.equal((await request(`/api/rooms/${second}`,{action:'start'},secondToken)).status,409);
  const changedGame=await request(`/api/rooms/${second}`,{action:'configure',mode:'meaning-quiz',meaningCategory:'youth',rounds:1},secondToken);
  assert.equal(changedGame.status,200,JSON.stringify(changedGame.data));assert.equal(changedGame.data.room.code,second);assert.equal(changedGame.data.room.players[0].id,empty.data.room.players[0].id);
  await play(second,secondToken,new Set());await request(`/api/rooms/${second}`,{action:'restart'},secondToken);
  const returned=await request(`/api/rooms/${second}`,{action:'configure',mode:'loanword-quiz'},secondToken);assert.equal(returned.status,200);assert.equal(returned.data.room.maxRounds,0);
  assert.equal((await request(`/api/rooms/${second}`,{action:'configure',mode:'word-chain'},secondToken)).status,200);
  const changed=await request(`/api/rooms/${second}`,{action:'configure',mode:'language-quiz',rounds:10},secondToken);assert.equal(changed.status,200,JSON.stringify(changed.data));assert.equal(changed.data.room.totalRounds,10);
  const guest=await request(`/api/rooms/${second}/join`,{name:'QA Observer'});assert.equal(guest.status,201);
  assert.equal((await request(`/api/rooms/${second}`,{action:'configure',mode:'loanword-quiz'},guest.data.token)).status,403);
  assert.equal((await request(`/api/rooms/${second}`,{action:'restart'},guest.data.token)).status,403);
  const [stored]=await sql`SELECT state FROM game_rooms WHERE code=${code}`;assert.equal((stored.state as Game).playedPrompts!.length,22);
  console.log('PASS: solo ten-round matches, persistent same-room no-repeat history across whole-game switches, category changes, exhausted categories, private state and host authority.');
}finally{for(const code of codes)await sql`DELETE FROM game_rooms WHERE code=${code}`;}
