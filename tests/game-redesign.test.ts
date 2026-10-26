import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,joinGame,leaveGame,viewGame,type Game} from '../lib/game';
import {roomAction} from '../lib/content';
import {extraSeeds} from '../lib/extra-seeds';
import {drawSpeaker,wheelRotation} from '../lib/pronunciation-wheel';
import {sentencePrompts,requiredSentenceLetter,activeSentencePlayer} from '../lib/sentence-chain';
import {poolKey,updateAvailability} from '../lib/game-pool';
import {finishWheelAnimation} from './game-fixtures';
import {reportedRound} from '../lib/round-reports';
import {roomPollDelay} from '../lib/room-polling';

function lobby(mode:'tongue-twisters'|'word-chain',count=3){
  const players=Array.from({length:count},(_,index)=>({id:crypto.randomUUID(),name:'Player '+index,tokenHash:'private-'+index,score:0}));
  const game=createGame('RED234',players[0],'de',mode);if(mode==='tongue-twisters')game.pronunciationLanguage='';
  for(const player of players.slice(1))joinGame(game,player);
  game.totalRounds=1;return game;
}
const target=(game:Game)=>({matchId:game.matchId!,roundNumber:game.roundIndex+1,turn:game.round!.sentence!.turn});
function sentence(count=3){const game=lobby('word-chain',count);act(game,game.hostId,{action:'start'},sentencePrompts());game.round!.sentence!.words=[{text:'Die'}];return game;}
function propose(game:Game,word?:string){const s=game.round!.sentence!;act(game,activeSentencePlayer(s),word===undefined?{action:'sentence-finish',...target(game)}:{action:'sentence-word',word,...target(game)});}
function vote(game:Game,playerId:string,approve=true){act(game,playerId,{action:'sentence-vote',proposalId:game.round!.sentence!.pending!.id,approve,...target(game)});}
function approve(game:Game){const author=game.round!.sentence!.pending!.playerId;for(const player of game.players.filter(player=>player.id!==author)){if(!game.round!.sentence!.pending)break;vote(game,player.id);}}
function wheel(){const game=lobby('tongue-twisters');act(game,game.hostId,{action:'start'},extraSeeds);return game;}

test('wheel is uniform over eligible segments, aligns with the pointer and avoids immediate repeats',()=>{
  const players=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}],counts=new Map<string,number>();
  for(let first=0;first<3;first++)for(let second=0;second<2;second++){
    const values=[first,second];const random=mock.method(crypto,'getRandomValues',<T extends ArrayBufferView|null>(array:T):T=>{assert.ok(array instanceof Uint32Array);array[0]=values.shift()!;return array;});
    const selection=drawSpeaker(players);random.mock.restore();counts.set(selection.selectedId,(counts.get(selection.selectedId)??0)+1);
    assert.equal(selection.players.length,3);assert.equal(selection.eligibleIds.length,3);
    assert.equal(Math.floor(((360-wheelRotation(selection)%360)%360)/120),players.findIndex(player=>player.id===selection.selectedId));
  }
  assert.deepEqual([...counts.values()],[2,2,2]);
  for(let n=0;n<50;n++){const selection=drawSpeaker(players,'b');assert.notEqual(selection.selectedId,'b');assert.deepEqual(selection.eligibleIds,['a','c']);}
  assert.equal(drawSpeaker(players.slice(0,1),'a').selectedId,'a');
});
test('wheel selection is persisted for every client, hides the task and rejects early or stale actions',()=>{
  const game=wheel(),selection=game.round!.pronunciation!.selection!;assert.equal(game.phase,'spinning');
  for(const player of game.players){const projection=viewGame(game,player.id);assert.equal(projection.prompt!.phrase,'');assert.equal(projection.pronunciation!.selection!.selectedId,selection.selectedId);assert.ok(!JSON.stringify(projection).includes('private-'));}
  assert.throws(()=>act(game,game.hostId,{action:'wheel-ready',selectionId:selection.id,matchId:game.matchId!,roundNumber:1}),/dreht/);
  const action=finishWheelAnimation(game);assert.equal(game.phase,'speaking');assert.ok(viewGame(game,game.hostId).prompt!.phrase);
  assert.throws(()=>act(game,action.speakerId,{action:'performed',...action,selectionId:undefined}),/Vortrag/);
  assert.equal((JSON.parse(JSON.stringify(game)) as Game).round!.pronunciation!.selection!.selectedId,selection.selectedId);
});
test('only one speaker receives one anonymous average; the next text uses a fresh non-repeating draw',()=>{
  const game=wheel(),action=finishWheelAnimation(game),voters=game.players.filter(player=>player.id!==action.speakerId);
  assert.throws(()=>act(game,voters[0].id,{action:'performed',...action}),/Person/);
  act(game,action.speakerId,{action:'performed',...action});act(game,voters[0].id,{action:'rate',...action,clarity:3,accuracy:4,rhythm:4});assert.equal(game.phase,'rating');
  assert.deepEqual(viewGame(game,voters[1].id).pronunciation!.results,[]);
  act(game,voters[1].id,{action:'rate',...action,clarity:3,accuracy:4,rhythm:4});assert.equal(game.phase,'reveal');
  assert.equal(game.players.find(player=>player.id===action.speakerId)!.score,3.7);assert.ok(voters.every(player=>player.score===0));assert.equal(viewGame(game,game.hostId).pronunciation!.results.length,1);
  assert.throws(()=>act(game,voters[1].id,{action:'rate',...action,clarity:5,accuracy:5,rhythm:5}));
  act(game,game.hostId,{action:'next'});act(game,game.hostId,{action:'restart',immediate:true},extraSeeds);assert.notEqual(game.round!.pronunciation!.selection!.selectedId,action.speakerId);
});
test('wheel departures reroll safely and missing raters do not trap pronunciation',()=>{
  let game=wheel();const selection=game.round!.pronunciation!.selection!;leaveGame(game,selection.selectedId);assert.equal(game.phase,'spinning');assert.notEqual(game.round!.pronunciation!.selection!.id,selection.id);assert.ok(game.round!.pronunciation!.selection!.players.every(player=>player.id!==selection.selectedId));
  const first=finishWheelAnimation(game);leaveGame(game,first.speakerId);assert.equal(game.phase,'lobby');
  game=wheel();const action=finishWheelAnimation(game),voters=game.players.filter(player=>player.id!==action.speakerId);
  act(game,action.speakerId,{action:'performed',...action});act(game,voters[0].id,{action:'rate',...action,clarity:5,accuracy:5,rhythm:5});leaveGame(game,voters[1].id);assert.equal(game.phase,'reveal');assert.equal(game.players.find(player=>player.id===action.speakerId)!.score,5);
});
test('revealed wheel ratings remain stable after a speaker leaves the room',()=>{
  const game=wheel(),action=finishWheelAnimation(game);act(game,action.speakerId,{action:'performed',...action});
  for(const player of game.players.filter(player=>player.id!==action.speakerId))act(game,player.id,{action:'rate',...action,clarity:3,accuracy:4,rhythm:5});
  const before=viewGame(game,game.hostId).pronunciation!.results;leaveGame(game,action.speakerId);
  assert.equal(game.phase,'reveal');assert.deepEqual(viewGame(game,game.players[0].id).pronunciation!.results,before);
});
test('sentence words enforce one word, matching letters and active turn before any proposal',()=>{
  const game=sentence(),s=game.round!.sentence!,active=activeSentencePlayer(s),other=game.players[1];
  assert.equal(game.round!.chain,undefined);assert.equal(requiredSentenceLetter(s),'e');
  for(const word of ['two words','word\nword','!!!','a'.repeat(41)])assert.throws(()=>propose(game,word),/genau ein Wort/);
  assert.throws(()=>propose(game,'Baum'),/Buchstaben/);assert.equal(s.failures,0);
  assert.throws(()=>act(game,other.id,{action:'sentence-word',word:'Erde',...target(game)}),/andere Person/);
  assert.throws(()=>act(game,active,{action:'sentence-word',word:'Erde',...target(game),turn:1}),/aktuellen Runde/);
  propose(game,'Erde');assert.equal(s.words.length,1);assert.equal(game.players[0].score,0);assert.equal(viewGame(game,other.id).sentence!.proposal!.word,'Erde');
  assert.equal(roomPollDelay(viewGame(game,other.id)),1500);assert.equal(roomPollDelay(viewGame(game,active)),2500);
  assert.throws(()=>propose(game,'Erde'),/Abstimmung/);assert.throws(()=>vote(game,active),/eigenen/);
});
test('only a strict peer majority accepts words, votes stay private and replay never scores twice',()=>{
  const game=sentence(4),s=game.round!.sentence!;propose(game,'Erde');const pending=s.pending!,oldTarget=target(game);
  vote(game,game.players[1].id);assert.equal(game.players[0].score,0);assert.ok(!JSON.stringify(viewGame(game,game.players[2].id)).includes('"votes"'));
  assert.throws(()=>vote(game,game.players[1].id),/bereits/);vote(game,game.players[2].id);assert.equal(s.words.length,2);assert.equal(s.turn,1);assert.equal(game.players[0].score,1);
  assert.throws(()=>act(game,game.players[3].id,{action:'sentence-vote',proposalId:pending.id,approve:true,...oldTarget}),/aktuellen Runde/);assert.equal(game.players[0].score,1);
  const forged=roomAction.parse({action:'sentence-word',word:'erkennt',approved:true,score:99,...target(game)});assert.ok(!('approved' in forged)&&!('score' in forged));
});
test('ties and rejected words preserve the chain, rotate turns and end after three failures',()=>{
  const game=sentence(),s=game.round!.sentence!;
  for(let n=0;n<3;n++){
    propose(game,'Esel');const peers=game.players.filter(player=>player.id!==s.pending!.playerId);vote(game,peers[0].id);vote(game,peers[1].id,false);
    assert.equal(s.words.length,1);assert.equal(s.failures,n+1);
  }
  assert.equal(game.phase,'reveal');assert.equal(s.endReason,'failures');assert.deepEqual(game.players.map(player=>player.score),[0,0,0]);
});
test('players decide completion, including incomplete prefixes and punctuation; solo play remains available',()=>{
  const game=sentence(),s=game.round!.sentence!;propose(game,'Erde');approve(game);propose(game,'erkennt');approve(game);assert.equal(game.phase,'linking');
  propose(game);approve(game);assert.equal(game.phase,'reveal');assert.equal(s.endReason,'complete');assert.equal(game.players.reduce((sum,player)=>sum+player.score,0),2);
  const solo=sentence(1);propose(solo,'Erde');assert.equal(solo.players[0].score,1);propose(solo,'explodiert.');assert.equal(solo.phase,'reveal');assert.equal(solo.players[0].score,2);
  const report=reportedRound(solo,solo.players[0].tokenHash,{matchId:solo.matchId!,roundNumber:1,reason:'other',note:''});assert.equal(report.entry.phrase,'Die Erde explodiert.');assert.ok(!JSON.stringify(report.entry).includes('tokenHash'));
});
test('input and voting deadlines, passes and active-player departures advance deterministically',()=>{
  const game=sentence(),s=game.round!.sentence!;assert.throws(()=>act(game,game.players[1].id,{action:'sentence-timeout',...target(game)}),/noch nicht/);
  propose(game,'Erde');s.pending!.expiresAt=Date.now()-1;act(game,game.players[1].id,{action:'sentence-timeout',...target(game)});assert.equal(s.turn,1);assert.equal(s.feedback!.kind,'timeout');
  s.deadline=Date.now()-1;act(game,game.players[0].id,{action:'sentence-timeout',...target(game)});assert.equal(s.turn,2);
  propose(game,'Erde');const previous=s.turn;leaveGame(game,activeSentencePlayer(s));assert.equal(s.turn,previous+1);assert.equal(s.pending,undefined);assert.equal(s.queue.length,2);
  act(game,activeSentencePlayer(s),{action:'sentence-pass',...target(game)});assert.equal(game.phase,'reveal');
});
test('a departing voter reconciles the majority and a vanished host transfers without losing the sentence',()=>{
  const game=sentence(4),s=game.round!.sentence!;propose(game,'Erde');vote(game,game.players[1].id);leaveGame(game,game.players[3].id);assert.ok(s.pending);leaveGame(game,game.players[2].id);assert.equal(s.pending,undefined);assert.equal(game.players[0].score,1);
  const oldHost=game.hostId;leaveGame(game,oldHost);assert.equal(game.hostId,game.players[0].id);assert.ok(s.words.some(word=>word.text==='Erde'));
});
test('language settings, history and sentence state survive reloads and rematches',()=>{
  const game=lobby('word-chain'),before=poolKey(game);updateAvailability(game,sentencePrompts());assert.equal(game.availableRounds,20);
  act(game,game.hostId,{action:'configure',sentenceLanguage:'en'},sentencePrompts());assert.notEqual(poolKey(game),before);act(game,game.hostId,{action:'start'},sentencePrompts());assert.equal(game.round!.sentence!.language,'en');
  for(const language of ['fr','invalid',null])assert.equal(roomAction.safeParse({action:'configure',sentenceLanguage:language}).success,false);
  const restored=JSON.parse(JSON.stringify(game)) as Game;for(let n=0;n<3;n++)act(restored,activeSentencePlayer(restored.round!.sentence!),{action:'sentence-pass',...target(restored)});act(restored,restored.hostId,{action:'next'});const first=restored.round!.entry.id;act(restored,restored.hostId,{action:'restart',immediate:true},sentencePrompts());assert.equal(restored.round!.sentence!.language,'en');assert.notEqual(restored.round!.entry.id,first);
});
