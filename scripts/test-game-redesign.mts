import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createGame,joinGame,act,viewGame,GameError,type Game} from '../lib/game';
import {sentencePrompts} from '../lib/sentence-chain';
import {extraSeeds} from '../lib/extra-seeds';
import {database,insertRoom,getRoom,mutateRoom,readRoomConditional} from '../db/repository';
import {heartbeatRoom} from '../db/room-presence';

// Never load .env.local: this runner must have an explicit isolated target.
const branch=process.env.TEST_NEON_BRANCH,host=process.env.TEST_DATABASE_HOST;
assert.ok(host&&host!=='ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech'&&!host.includes('-pooler'),'Specify an isolated direct TEST_DATABASE_HOST.');
if(branch){
  assert.match(branch,/^br-[a-z0-9-]+$/);assert.notEqual(branch,'br-delicate-field-b96d9qc4');
  const url=execFileSync('neon',['connection-string',branch,'--project-id','calm-tooth-60944868','--database-name','sprachspiel'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  assert.equal(new URL(url).hostname,host);process.env.DATABASE_URL=url;
}
assert.ok(process.env.DATABASE_URL,'Provide the isolated DATABASE_URL or TEST_NEON_BRANCH.');
assert.equal(new URL(process.env.DATABASE_URL).hostname,host);
const sql=database(),codes:string[]=[];
const player=(n:number)=>({id:crypto.randomUUID(),name:'QA '+n,tokenHash:crypto.randomUUID(),score:0});
async function store(mode:'word-chain'|'tongue-twisters'){
  const code='QA'+crypto.randomUUID().slice(0,4).toUpperCase(),game=createGame(code,player(0),'de',mode);
  for(let n=1;n<3;n++)joinGame(game,player(n));game.totalRounds=1;
  act(game,game.hostId,{action:'start'},mode==='word-chain'?sentencePrompts():extraSeeds);
  if(game.round!.sentence)game.round!.sentence.words=[{text:'Die'}];
  await insertRoom(game);codes.push(code);return game;
}
async function apply(game:Game,playerId:string,action:Parameters<typeof act>[2]){
  return mutateRoom(game.code,current=>act(current,playerId,action),false);
}
try{
  const speech=await store('tongue-twisters'),selection=speech.round!.pronunciation!.selection!;
  await mutateRoom(speech.code,current=>{current.round!.pronunciation!.selection!.endsAt=Date.now()-1;},false);
  await Promise.all(speech.players.map(player=>apply(speech,player.id,{action:'heartbeat'})));
  let saved=(await getRoom(speech.code)).state;
  assert.equal(saved.phase,'speaking');assert.equal(saved.round!.pronunciation!.selection!.selectedId,selection.selectedId);
  const target={speakerId:selection.selectedId,selectionId:selection.id,matchId:saved.matchId!,roundNumber:1};
  await apply(speech,selection.selectedId,{action:'performed',...target});
  const voters=speech.players.filter(player=>player.id!==selection.selectedId);
  await Promise.all(voters.map(player=>apply(speech,player.id,{action:'rate',...target,clarity:3,accuracy:4,rhythm:5})));
  saved=(await getRoom(speech.code)).state;assert.equal(saved.phase,'reveal');assert.deepEqual(saved.players.map(player=>player.score),speech.players.map(player=>player.id===selection.selectedId?4:0));
  await assert.rejects(()=>apply(speech,voters[0].id,{action:'rate',...target,clarity:5,accuracy:5,rhythm:5}),GameError);

  const sentence=await store('word-chain'),hostPlayer=sentence.players[0],others=sentence.players.slice(1),turn={matchId:sentence.matchId!,roundNumber:1,turn:0};
  await assert.rejects(()=>apply(sentence,others[0].id,{action:'sentence-word',word:'Erde',...turn}),GameError);
  await assert.rejects(()=>apply(sentence,hostPlayer.id,{action:'sentence-word',word:'Baum',...turn}),GameError);
  const proposals=await Promise.allSettled([apply(sentence,hostPlayer.id,{action:'sentence-word',word:'Erde',...turn}),apply(sentence,hostPlayer.id,{action:'sentence-word',word:'Erde',...turn})]);
  assert.equal(proposals.filter(result=>result.status==='fulfilled').length,1);
  saved=(await getRoom(sentence.code)).state;const proposalId=saved.round!.sentence!.pending!.id;
  assert.equal(saved.players[0].score,0);assert.equal(saved.round!.sentence!.words.length,1);
  await Promise.all(others.map(player=>apply(sentence,player.id,{action:'sentence-vote',proposalId,approve:true,...turn})));
  let loaded=await getRoom(sentence.code);saved=loaded.state;
  assert.equal(saved.round!.sentence!.words.map(word=>word.text).join(' '),'Die Erde');assert.equal(saved.players[0].score,1);assert.equal(saved.round!.sentence!.turn,1);
  await assert.rejects(()=>apply(sentence,others[0].id,{action:'sentence-vote',proposalId,approve:true,...turn}),GameError);
  const unchanged=await readRoomConditional(sentence.code,hostPlayer.tokenHash,loaded.version);assert.equal(unchanged.state,null);
  const projected=viewGame(saved,hostPlayer.id);assert.ok(!JSON.stringify(projected).includes('tokenHash'));assert.equal(projected.sentence!.proposal,null);
  await apply(sentence,others[0].id,{action:'sentence-word',word:'explodiert.',...turn,turn:1});
  loaded=await getRoom(sentence.code);const endProposal=loaded.state.round!.sentence!.pending!.id;
  await Promise.all([hostPlayer,others[1]].map(player=>apply(sentence,player.id,{action:'sentence-vote',proposalId:endProposal,approve:true,...turn,turn:1})));
  saved=(await getRoom(sentence.code)).state;assert.equal(saved.phase,'reveal');assert.equal(saved.round!.sentence!.endReason,'complete');assert.deepEqual(saved.players.map(player=>player.score),[1,1,0]);

  const absent=await store('word-chain');await mutateRoom(absent.code,current=>{current.players[0].lastSeenAt=Date.now()-121000;current.round!.sentence!.deadline=Date.now()-1;},false);
  const heartbeat=await heartbeatRoom(absent.code,absent.players[1].tokenHash);assert.ok(heartbeat);assert.equal(heartbeat.hostId,absent.players[1].id);assert.equal(heartbeat.players.length,2);
  assert.ok(!(await getRoom(absent.code)).state.round!.sentence!.queue.includes(absent.hostId));
  console.log('PASS: isolated PostgreSQL room persistence, concurrent wheel/rating actions, one proposal per turn, concurrent majority voting, stale replay protection, ETag projection, host transfer and heartbeat SQL. No AI calls, accounts or contributions created.');
}finally{
  for(const code of codes)await sql`DELETE FROM game_rooms WHERE code=${code}`;
  const remaining=await sql`SELECT count(*)::int AS count FROM game_rooms WHERE code=ANY(${codes})`;
  assert.equal(remaining[0].count,0);console.log('PASS: all rooms created by this run removed.');
}
