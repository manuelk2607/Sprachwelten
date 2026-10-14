import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, GameError, joinGame, viewGame, type Game } from '../lib/game';
import { wordSeeds } from '../lib/word-seeds';
import { seedEntries } from '../lib/seeds';
import { localizeEntry } from '../lib/entry-localization';

const player=(id:string)=>({id,name:id,score:0,tokenHash:`secret-${id}`});
function started(players=1) {
  const game=createGame('ABC234',player('host'),'en','language-quiz');
  for(let i=1;i<players;i++)joinGame(game,player(`guest${i}`));
  act(game,'host',{action:'start'},wordSeeds);
  return game;
}
const correctId=(game:Game)=>game.round!.options.find(option=>option.language===game.round!.entry.language)!.id;

test('quiz starts solo directly with four unique languages; bluff mode still requires three players',()=>{
  const game=started();
  assert.equal(game.phase,'voting');
  assert.equal(game.round!.options.length,4);
  assert.equal(new Set(game.round!.options.map(option=>option.language)).size,4);
  assert.equal(game.round!.options.filter(option=>option.language===game.round!.entry.language).length,1);
  assert.throws(()=>act(game,'host',{action:'answer',text:'This should not be accepted.'}),GameError);
  const bluff=createGame('DEF234',player('host'));assert.throws(()=>act(bluff,'host',{action:'start'},seedEntries),GameError);
});
test('quiz projection hides the correct language, meaning, source and future words until everyone votes',()=>{
  const game=started(2);
  act(game,'host',{action:'vote',optionId:correctId(game)});
  const view=viewGame(game,'guest1');
  assert.equal(view.phase,'voting');assert.equal(view.mode,'language-quiz');assert.equal(view.revelation,null);
  assert.deepEqual(Object.keys(view.prompt!),['phrase']);
  assert.ok(view.options.every(option=>!('correct' in option)&&!('authorName' in option)&&!('voters' in option)));
  assert.ok(!JSON.stringify(view).includes(game.round!.entry.meaning));
  assert.ok(!JSON.stringify(view).includes(game.round!.entry.sourceUrl));
  assert.ok(!JSON.stringify(view).includes(game.prompts[1].phrase));
  assert.ok(!JSON.stringify(view).includes('secret-'));assert.ok(!('prompts' in view));
  assert.equal(view.selectedOptionId,null);
  assert.equal(viewGame(game,'host').selectedOptionId,correctId(game));
});
test('only correct quiz answers score; no bluff points, duplicate votes or premature progression',()=>{
  const game=started(2);const correct=correctId(game);
  const wrong=game.round!.options.find(option=>option.id!==correct)!.id;
  assert.throws(()=>act(game,'guest1',{action:'next'}),GameError);
  assert.throws(()=>act(game,'host',{action:'vote',optionId:'not-an-option'}),GameError);
  act(game,'host',{action:'vote',optionId:correct});
  assert.throws(()=>act(game,'host',{action:'vote',optionId:wrong}),GameError);
  assert.throws(()=>act(game,'host',{action:'next'}),GameError);
  act(game,'guest1',{action:'vote',optionId:wrong});
  assert.equal(game.phase,'reveal');assert.deepEqual(game.players.map(p=>p.score),[2,0]);
  const view=viewGame(game,'guest1');assert.equal(view.options.filter(o=>o.correct).length,1);
  assert.equal(view.revelation!.language,game.round!.entry.language);
  assert.equal(view.revelation!.meaning,game.round!.entry.meaning);
  assert.throws(()=>act(game,'guest1',{action:'next'}),GameError);
});
test('a full solo quiz has five distinct words and a score out of ten, including community words',()=>{
  const community=wordSeeds.slice(0,5).map(entry=>({...entry,status:'community' as const,authorName:'Community'}));
  const game=createGame('ABC234',player('host'),'en','language-quiz');
  act(game,'host',{action:'start'},community);
  const words=new Set<string>();
  for(let round=0;round<5;round++){
    words.add(game.round!.entry.phrase);act(game,'host',{action:'vote',optionId:correctId(game)});
    assert.equal(viewGame(game,'host').revelation!.status,'community');
    act(game,'host',{action:'next'});
  }
  assert.equal(words.size,5);assert.equal(game.phase,'finished');assert.equal(game.players[0].score,10);
  assert.throws(()=>act(game,'host',{action:'next'}),GameError);
});
test('quiz needs five distinct words of the right kind and localizes curated explanations',()=>{
  const game=createGame('ABC234',player('host'),'en','language-quiz');
  assert.throws(()=>act(game,'host',{action:'start'},seedEntries),GameError);
  assert.throws(()=>act(game,'host',{action:'start'},Array(5).fill(wordSeeds[0])),GameError);
  for(const word of wordSeeds)assert.notEqual(localizeEntry(word,'en').meaning,word.meaning);
});
test('legacy rooms with no mode still use the existing bluff rules',()=>{
  const game=createGame('ABC234',player('host'));delete game.mode;
  joinGame(game,player('guest1'));joinGame(game,player('guest2'));
  act(game,'host',{action:'start'},seedEntries);
  assert.equal(viewGame(game,'host').mode,'idiom-bluff');assert.equal(game.phase,'writing');
});
