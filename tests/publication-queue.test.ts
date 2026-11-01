import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationCards} from '../scripts/publication-cards';
import {createQueue,queueSchema,summary} from '../scripts/publication-queue';
import {checkPublicationOwner,contributionQuota} from '../lib/contribution-publication';
test('publication guard prevents expired sessions becoming guest or other-account contributions',()=>{
 assert.doesNotThrow(()=>checkPublicationOwner(null,{id:'guest:abc',guest:true}));
 assert.doesNotThrow(()=>checkPublicationOwner('owner',{id:'owner',guest:false}));
 assert.throws(()=>checkPublicationOwner('owner',{id:'guest:abc',guest:true}));
 assert.throws(()=>checkPublicationOwner('owner',{id:'other',guest:false}));
});
test('quota matches strict database expiration and clamps exhausted or overrun counters',()=>{
 const at='2026-11-01T16:28:46.687Z';
 assert.deepEqual(contributionQuota(),{remaining:20,resetAt:null});
 assert.equal(contributionQuota({hits:19,expires_at:at,checked_at:at}).remaining,1);
 assert.equal(contributionQuota({hits:21,expires_at:at,checked_at:at}).remaining,0);
 assert.deepEqual(contributionQuota({hits:21,expires_at:at,checked_at:'2026-11-01T16:28:46.688Z'}),{remaining:20,resetAt:null});
});
test('44 outstanding cards have unique identities, complete bilingual choices and no invented approvals',()=>{
 const q=createQueue(publicationCards);assert.equal(q.items.length,44);assert.deepEqual(summary(q),{pending:44,published:0,failed:0});
 assert.equal(new Set(q.items.map(i=>i.input.phrase.toLowerCase())).size,44);
 for(const {input} of q.items){assert.equal(input.creditName,'Manuel');assert.equal(input.challenge?.type,'meaning');if(input.challenge?.type!=='meaning')throw Error();assert.equal(input.challenge.correctIndex,0);for(const lang of ['de','en'] as const){assert.equal(new Set(input.challenge.choices.map(c=>c[lang])).size,4);assert.ok(input.challenge.choices.every(c=>c[lang]));}assert.ok(!('status' in input));}
});
test('queue rejects tampering, duplicate jobs and unverified publication receipts',()=>{
 const q=createQueue(publicationCards);q.items[0].input.phrase='tampered';assert.equal(queueSchema.safeParse(q).success,false);
 const duplicate=createQueue(publicationCards);duplicate.items.push(duplicate.items[0]);assert.equal(queueSchema.safeParse(duplicate).success,false);
 const missing=createQueue(publicationCards);missing.items[0].status='published';assert.equal(queueSchema.safeParse(missing).success,false);
});
test('queue survives failed and verified states without losing its original content',()=>{
 const q=createQueue(publicationCards);q.items[0].status='failed';q.items[0].attempts=1;q.items[0].error='Outcome unknown';
 assert.deepEqual(queueSchema.parse(JSON.parse(JSON.stringify(q))),q);
});
