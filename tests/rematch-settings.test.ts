import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,joinGame,viewGame,type Game} from '../lib/game';
import {promptIdentity,unseenPrompts,updateAvailability} from '../lib/game-pool';
import {seedEntries} from '../lib/seeds';
import {wordSeeds} from '../lib/word-seeds';
import {newGameEntries} from '../lib/new-game-seeds';
import {communityGameEntries} from '../lib/community-game-seeds';
import {extraSeeds} from '../lib/extra-seeds';
import {roomAction} from '../lib/content';

const player=()=>({id:crypto.randomUUID(),name:crypto.randomUUID().slice(0,8),tokenHash:crypto.randomUUID(),score:0});
const entries=[...seedEntries,...wordSeeds,...extraSeeds,...newGameEntries,...communityGameEntries];
function finishQuiz(game:Game){
  while(game.phase==='voting'){
    for(const p of game.players)act(game,p.id,{action:'vote',optionId:game.round!.options[0].id});
    assert.equal(game.phase,'reveal');act(game,game.hostId,{action:'next'});
  }
  assert.equal(game.phase,'finished');
}

test('same-room history survives reloads, category switches and complete exhaustion without recycling',()=>{
  const source=communityGameEntries.filter(entry=>entry.kind==='loanword').slice(0,3);
  let game=createGame('FRESHX',player(),'de','loanword-quiz');
  const shown=new Set<string>();
  for(let match=0;match<3;match++){
    act(game,game.hostId,{action:'configure',rounds:1});act(game,game.hostId,{action:'start'},source);
    const key=promptIdentity(game.round!.entry);assert.ok(!shown.has(key));shown.add(key);
    assert.ok(!('playedPrompts' in viewGame(game,game.hostId)));
    finishQuiz(game);game=JSON.parse(JSON.stringify(game)) as Game;
    act(game,game.hostId,{action:'restart'},source);assert.equal(game.phase,'lobby');
    assert.equal(viewGame(game,game.hostId).maxRounds,2-match);
  }
  assert.equal(shown.size,3);assert.throws(()=>act(game,game.hostId,{action:'start'},source),/ungespielte/);
  assert.equal(game.playedPrompts!.length,3);
});

test('changed entry IDs cannot reintroduce the same prompt while distinct senses remain available',()=>{
  const game=createGame('FRESHX',player(),'de','language-quiz'),entry=wordSeeds[0];
  game.totalRounds=1;act(game,game.hostId,{action:'start'},[entry]);finishQuiz(game);
  act(game,game.hostId,{action:'restart'},[entry]);
  assert.equal(unseenPrompts(game,[{...entry,id:crypto.randomUUID()}]).length,0);
  assert.equal(unseenPrompts(game,[{...entry,id:crypto.randomUUID(),sense:'Eine andere Bedeutung'}]).length,1);
});

test('returning to an earlier meaning category does not clear its played history',()=>{
  const game=createGame('FRESHX',player(),'de','meaning-quiz');game.meaningCategory='youth';game.totalRounds=1;
  act(game,game.hostId,{action:'start'},entries);const first=game.round!.entry.id;finishQuiz(game);
  act(game,game.hostId,{action:'restart'},entries);act(game,game.hostId,{action:'configure',meaningCategory:'academic'},entries);
  act(game,game.hostId,{action:'start'},entries);assert.equal(game.round!.entry.kind,'academic');finishQuiz(game);
  act(game,game.hostId,{action:'restart'},entries);act(game,game.hostId,{action:'configure',meaningCategory:'youth'},entries);
  assert.ok(unseenPrompts(game,entries).every(entry=>entry.id!==first));
});

test('family categories can change in the lobby but cannot change families or bypass host authority',()=>{
  for(const [from,to] of [['language-quiz','loanword-quiz'],['word-outsider','word-chain']] as const){
    const host=player(),guest=player(),game=createGame('FRESHX',host,'de',from);joinGame(game,guest);game.totalRounds=1;
    act(game,host.id,{action:'start'},entries);finishQuiz(game);act(game,host.id,{action:'restart'},entries);
    assert.throws(()=>act(game,guest.id,{action:'configure',mode:to},entries),/Gastgeber/);
    act(game,host.id,{action:'configure',mode:to},entries);assert.equal(game.mode,to);
    assert.throws(()=>act(game,host.id,{action:'configure',mode:from==='language-quiz'?'word-chain':'language-quiz'},entries),/Kategorie/);
  }
});

test('legacy matches remember all shown cards and interrupted matches do not consume future cards',()=>{
  const game=createGame('FRESHX',player(),'de','language-quiz');game.totalRounds=3;
  act(game,game.hostId,{action:'start'},wordSeeds);finishQuiz(game);delete game.playedPrompts;
  const shown=game.prompts.map(entry=>entry.id);act(game,game.hostId,{action:'restart'},wordSeeds);
  assert.ok(shown.every(id=>game.playedPrompts!.some(entry=>entry.id===id)));
  const interrupted=createGame('FRESHX',player(),'de','tongue-twisters');joinGame(interrupted,player());
  act(interrupted,interrupted.hostId,{action:'start'},extraSeeds);
  assert.equal(interrupted.playedPrompts!.length,1);assert.ok(!interrupted.playedPrompts!.some(entry=>entry.id===interrupted.prompts[1].id));
});

test('round validation caps at ten while sparse categories expose only their unplayed count',()=>{
  for(const rounds of [0,11,20,1.5])assert.equal(roomAction.safeParse({action:'configure',rounds}).success,false);
  for(const rounds of [1,10])assert.equal(roomAction.safeParse({action:'configure',rounds}).success,true);
  const game=createGame('FRESHX',player(),'de','loanword-quiz');
  updateAvailability(game,entries);assert.equal(viewGame(game,game.hostId).maxRounds,8);
  act(game,game.hostId,{action:'configure',rounds:8});assert.throws(()=>act(game,game.hostId,{action:'configure',rounds:9}),/ungespielte/);
});
