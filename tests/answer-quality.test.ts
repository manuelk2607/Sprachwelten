import test from 'node:test';
import assert from 'node:assert/strict';
import {seedEntries} from '../lib/seeds';
import {extraSeeds} from '../lib/extra-seeds';
import {prepareMeaningEntries} from '../lib/meaning-quiz';
import {starterDistractors} from '../lib/starter-distractors';
import {localizeEntry} from '../lib/entry-localization';

test('starter idioms and dialects use three expression-specific alternatives in both languages',()=>{
 const originals=[...seedEntries,...extraSeeds.filter(entry=>entry.kind==='dialect')];
 for(const locale of ['de','en'] as const){
  const cards=prepareMeaningEntries(originals,locale);assert.equal(cards.length,26);
  const realMeanings=new Set(originals.map(entry=>localizeEntry(entry,locale).meaning));
  for(const card of cards){
   const challenge=card.challenge;assert.equal(challenge?.type,'meaning');if(challenge?.type!=='meaning')continue;
   assert.equal(new Set(challenge.choices.map(choice=>choice[locale])).size,4);
   for(const [index,choice] of challenge.choices.entries()){
    assert.ok(choice.de&&choice.en);if(index!==challenge.correctIndex)assert.ok(!realMeanings.has(choice[locale]));
   }
  }
 }
});
test('editor changes do not receive alternatives written for a previous meaning',()=>{
 const source=seedEntries[0],changed={...source,meaning:'Eine bewusst andere redaktionelle Bedeutung.'};
 assert.equal(starterDistractors(changed,{de:changed.meaning,en:'A changed meaning.'}),undefined);
 assert.equal(starterDistractors({...source,status:'community'},{de:source.meaning,en:localizeEntry(source,'en').meaning}),undefined);
});
