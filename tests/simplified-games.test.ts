import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,joinGame,leaveGame,viewGame} from '../lib/game';
import {communityGameEntries} from '../lib/community-game-seeds';
import {seedEntries} from '../lib/seeds';
import {newGameEntries} from '../lib/new-game-seeds';
import {entryInput} from '../lib/content';
import {prepareMeaningEntries,meaningCategory} from '../lib/meaning-quiz';
import {chainPrompts,edgeLetter} from '../lib/word-chain';
const player=(index:number)=>({id:crypto.randomUUID(),name:'Player '+index,tokenHash:'hash'+index,score:0});
const entries=[...seedEntries,...newGameEntries,...communityGameEntries];

test('meaning categories start directly with four meanings, hide the answer and score individually in both languages',()=>{
 for(const locale of ['de','en'] as const)for(const category of ['expression','gaming','youth','academic'] as const){
  const host=player(1),guest=player(2),game=createGame('ABC234',host,locale,'meaning-quiz');joinGame(game,guest);game.meaningCategory=category;
  act(game,host.id,{action:'start'},entries);assert.equal(game.phase,'voting');assert.equal(game.round?.team,undefined);assert.equal(meaningCategory(game.round!.entry),category);
  const view=viewGame(game,guest.id);assert.ok(view.prompt?.phrase);assert.equal(view.options.length,4);assert.equal(new Set(view.options.map(option=>option.text)).size,4);assert.equal(view.revelation,null);assert.equal(view.team,null);assert.ok(!JSON.stringify(view).includes('correctIndex'));assert.ok(view.options.every(option=>!('correct' in option)&&!('solution' in option)));
  const right=game.round!.options.find(option=>option.solution)!,wrong=game.round!.options.find(option=>!option.solution)!;
  act(game,host.id,{action:'vote',optionId:right.id});assert.equal(game.phase,'voting');act(game,guest.id,{action:'vote',optionId:wrong.id});assert.equal(game.phase,'reveal');assert.deepEqual(game.players.map(p=>p.score),[1,0]);assert.equal(viewGame(game,host.id).revelation?.meaning,right.text);
 }
});
test('a stored correctIndex of zero is shuffled to a different visible answer position',context=>{
 context.mock.method(crypto,'getRandomValues',<T extends ArrayBufferView>(array:T)=>{new Uint8Array(array.buffer,array.byteOffset,array.byteLength).fill(0);return array;});
 const game=createGame('ABC234',player(1),'de','meaning-quiz');game.meaningCategory='gaming';act(game,game.hostId,{action:'start'},entries);
 assert.equal(game.round!.entry.challenge?.type,'meaning');assert.equal(game.round!.options.findIndex(option=>option.solution),3);
});
test('new meanings need one solution and distinct alternatives while existing non-first solutions remain valid',()=>{
 const source={kind:'academic',phrase:'Eine neue Aufgabe',language:'de',challenge:{type:'meaning',correctIndex:2,choices:['Falsch A','Falsch B','Richtig','Falsch C'].map(value=>({de:value,en:value}))}};
 assert.ok(entryInput.safeParse(source).success);assert.equal(entryInput.safeParse({...source,challenge:{...source.challenge,choices:Array(4).fill({de:'gleich',en:'same'})}}).success,false);
 const adapted=prepareMeaningEntries(entries,'de','academic');assert.ok(adapted.length>=2);for(const entry of adapted){assert.equal(entry.challenge?.type,'meaning');assert.ok(entry.challenge?.type==='meaning'&&entry.challenge.choices.every(value=>value.de&&value.en));}
});
test('odd-word and loanword quizzes hide explanations, use one correct option and support solo rematches',()=>{
 for(const mode of ['word-outsider','loanword-quiz'] as const)for(const locale of ['de','en'] as const){
  const game=createGame('ABC234',player(1),locale,mode);act(game,game.hostId,{action:'start'},entries);
  for(let round=0;round<2;round++){
   const view=viewGame(game,game.hostId);assert.equal(game.phase,'voting');assert.equal(view.options.length,4);assert.equal(view.revelation,null);assert.ok(!JSON.stringify(view).includes('originLanguage'));assert.ok(!view.outsider||!('explanation' in view.outsider));assert.equal(game.round!.options.filter(option=>option.solution).length,1);
   act(game,game.hostId,{action:'vote',optionId:game.round!.options.find(option=>option.solution)!.id});assert.equal(game.phase,'reveal');assert.ok(viewGame(game,game.hostId).revelation?.meaning);act(game,game.hostId,{action:'next'});
  }
  assert.equal(game.phase,'finished');assert.equal(game.players[0].score,2);const match=game.matchId;act(game,game.hostId,{action:'restart'},entries);assert.notEqual(game.matchId,match);assert.equal(game.phase,'lobby');act(game,game.hostId,{action:'start'},entries);assert.equal(game.phase,'voting');
 }
});
test('word chains enforce active turns, reject stale actions, preserve unique words and complete with ten players',()=>{
 for(const locale of ['de','en'] as const){
  const game=createGame('ABC234',player(1),locale,'word-chain');for(let index=2;index<=10;index++)joinGame(game,player(index));act(game,game.hostId,{action:'start'},chainPrompts());
  for(let turn=0;turn<10;turn++){
   const chain=game.round!.chain!,active=chain.queue[0],view=viewGame(game,active);assert.equal(game.phase,'linking');assert.equal(view.chain!.choices.length,4);
   const wrongPlayer=game.players.find(p=>p.id!==active)!;assert.equal(viewGame(game,wrongPlayer.id).chain!.choices.length,0);
   const right=view.chain!.choices.find(word=>edgeLetter(word.text,'first')===view.chain!.requiredLetter)!;assert.ok(right);
   const action={action:'chain' as const,wordId:right.id,turn:chain.turn,matchId:game.matchId!,roundNumber:1};assert.throws(()=>act(game,wrongPlayer.id,action));act(game,active,action);assert.throws(()=>act(game,active,action));
  }
  assert.equal(game.phase,'reveal');assert.deepEqual(game.players.map(p=>p.score),Array(10).fill(1));const words=game.round!.chain!.words.map(word=>word.text);assert.equal(new Set(words).size,words.length);assert.equal(words.length,11);
 }
});
test('a wrong chain word scores zero and host departure transfers the next turn',()=>{
 const game=createGame('ABC234',player(1),'de','word-chain');joinGame(game,player(2));joinGame(game,player(3));act(game,game.hostId,{action:'start'},chainPrompts());
 const host=game.hostId,chain=game.round!.chain!,wrong=chain.choices.find(word=>edgeLetter(word.text,'first')!==edgeLetter(chain.words.at(-1)!.text,'last'))!;
 act(game,host,{action:'chain',wordId:wrong.id,turn:chain.turn,matchId:game.matchId!,roundNumber:1});assert.equal(game.players[0].score,0);assert.equal(chain.words.length,1);
 const next=chain.queue[0];leaveGame(game,next);assert.equal(chain.queue.length,1);assert.equal(chain.queue[0],game.players.at(-1)!.id);leaveGame(game,host);assert.equal(game.hostId,chain.queue[0]);assert.equal(game.phase,'linking');
});
