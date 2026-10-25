import {test} from 'node:test';
import assert from 'node:assert/strict';
import {regionalReviews,regionalReview} from '../lib/regional-review';
import {localizeEntry} from '../lib/entry-localization';
import {minimumReviewedPerLevel,readyDifficultyLevels,type EditorialDifficulty} from '../lib/editorial-difficulty';
test('source-checked regional context preserves source records and later editorial changes',()=>{
 assert.equal(regionalReviews.length,6);
 for(const review of regionalReviews){
  const entry=review.original,snapshot=JSON.stringify(entry);
  assert.equal(regionalReview(entry),review);assert.equal(review.needsSpecialistReview,true);
  for(const locale of ['de','en'] as const){const localized=localizeEntry(entry,locale);assert.equal(localized.sourceUrl,review.source);assert.ok(localized.culturalNote.includes(review[locale]));assert.equal(localized.meaning,localizeEntry({...entry,culturalNote:'Own note'},locale).meaning);}
  assert.equal(JSON.stringify(entry),snapshot);
  assert.equal(localizeEntry({...entry,sourceUrl:'https://example.com/new-source',culturalNote:'Own note'},'de').sourceUrl,'https://example.com/new-source');
  assert.equal(localizeEntry({...entry,culturalNote:'Own note'},'de').culturalNote,'Own note');
  assert.equal(localizeEntry({...entry,translations:{en:{culturalNote:'Reviewed English note',origin:'contributor'}}},'en').culturalNote,'Reviewed English note');
  assert.equal(regionalReview({...entry,meaning:'Edited meaning'}),undefined);assert.equal(regionalReview({...entry,status:'community'}),undefined);
 }
});
test('difficulty gates require enough distinct, explicitly reviewed and sourced cards in the same category and language',()=>{
 const record:EditorialDifficulty={entryId:'one',category:'dialect',language:'de',level:'introductory',reviewed:true,reviewedAt:'2026-10-24',sources:['https://www.duden.de/rechtschreibung/Bemme'],rationale:'Editorial review of familiarity and task demands.'};
 const records=Array.from({length:minimumReviewedPerLevel},(_,index)=>({...record,entryId:String(index)}));
 assert.deepEqual(readyDifficultyLevels(records,'dialect','de'),['introductory']);
 for(const subset of [records.slice(1),records.map(entry=>({...entry,entryId:'duplicate'})),records.map(entry=>({...entry,reviewed:false})),records.map(entry=>({...entry,reviewedAt:'2999-01-01'})),records.map(entry=>({...entry,sources:[]})),records.map(entry=>({...entry,rationale:''}))])assert.deepEqual(readyDifficultyLevels(subset,'dialect','de'),[]);
 assert.deepEqual(readyDifficultyLevels(records,'dialect','en'),[]);assert.deepEqual(readyDifficultyLevels(records,'idiom','de'),[]);
 assert.deepEqual(readyDifficultyLevels([],'dialect','de'),[]);
});
