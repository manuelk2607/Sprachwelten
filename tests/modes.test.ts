import test from 'node:test';
import assert from 'node:assert/strict';
import { gameModes, prepareLanguageQuiz, pronunciationRating } from '../lib/modes';
import { entryInput } from '../lib/content';
import { localizeEntry } from '../lib/entry-localization';
import { seedEntries } from '../lib/seeds';
import { translate } from '../lib/translations';
import { act, createGame, joinGame } from '../lib/game';
test('all eleven modes are playable',()=>{
  assert.deepEqual(gameModes.filter(m=>m.status==='playable').map(m=>m.id),['idiom-bluff','language-quiz','tongue-twisters','dialect-detective','everyday-language','gaming-call','generation-chat','plain-talk','who-said-it','false-friends','word-builder']);
});
test('language quiz has exactly four unique choices and exactly one declared language',()=>{
  for(let i=0;i<20;i++){const quiz=prepareLanguageQuiz('saudade','pt',['pt','de','en','en','sv','fr']);assert.equal(quiz.options.length,4);assert.equal(new Set(quiz.options).size,4);assert.equal(quiz.options.filter(o=>o===quiz.correctLanguage).length,1);}
  assert.throws(()=>prepareLanguageQuiz('test','en',['en','en','de','fr']));
});
test('tongue twister ratings reject self-rating and out-of-range scores',()=>{
  const rating={speakerId:'10000000-0000-4000-8000-000000000001',raterId:'10000000-0000-4000-8000-000000000002',clarity:3,accuracy:4,rhythm:5};
  assert.ok(pronunciationRating.safeParse(rating).success);assert.ok(!pronunciationRating.safeParse({...rating,raterId:rating.speakerId}).success);assert.ok(!pronunciationRating.safeParse({...rating,accuracy:6}).success);
});
test('words and tongue twisters need text and language; idioms still need a meaning',()=>{
  assert.equal(entryInput.parse({kind:'word',phrase:'a',language:'en'}).meaning,'');
  assert.ok(entryInput.safeParse({kind:'tongue_twister',phrase:'She sells seashells by the seashore.',language:'en'}).success);
  assert.ok(!entryInput.safeParse({kind:'idiom',phrase:'Spill the beans',language:'en'}).success);
});
test('all twenty starter definitions are translated; community submissions remain unchanged',()=>{
  for(const entry of seedEntries){assert.notEqual(localizeEntry(entry,'en').meaning,entry.meaning);assert.equal(localizeEntry(entry,'de'),entry);}
  const community={...seedEntries[0],status:'community' as const};assert.equal(localizeEntry(community,'en'),community);
  assert.equal(translate('Bald verfügbar','en'),'Coming soon');assert.equal(translate('Coming soon','de'),'Bald verfügbar');
});
test('an English room uses English definitions for the correct game answer',()=>{
  const player={id:'a',name:'Ada',tokenHash:'secret',score:0};const game=createGame('ABC234',player,'en');
  joinGame(game,{...player,id:'b',name:'Bo'});joinGame(game,{...player,id:'c',name:'Cam'});act(game,'a',{action:'start'},seedEntries);
  const source=seedEntries.find(e=>e.id===game.round!.entry.id)!;assert.equal(game.round!.entry.meaning,localizeEntry(source,'en').meaning);assert.notEqual(game.round!.entry.meaning,source.meaning);
});
