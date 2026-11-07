import test from 'node:test';import assert from 'node:assert/strict';
import {isSongContribution,liveAttributionCategory,musicWorldsURL} from '../lib/music-transfer';
import {entryInput} from '../lib/content';
test('new live attribution pools are person-only while unrelated pools keep their scope',()=>{
  assert.equal(liveAttributionCategory('who-said-it'),'person');assert.equal(liveAttributionCategory('meaning-quiz'),'');assert.equal(new URL(musicWorldsURL).hostname,'music-worlds.maki26.workers.dev');
});
test('song creation gate distinguishes legacy song records from person quotes and other challenges',()=>{
  assert.ok(isSongContribution({challenge:{type:'attribution',category:'song'}}));assert.equal(isSongContribution({challenge:{type:'attribution',category:'person'}}),false);assert.equal(isSongContribution({challenge:{type:'meaning'}}),false);assert.equal(isSongContribution({}),false);
});
test('legacy song schema remains valid for archived management and saved rounds',()=>{
  assert.ok(entryInput.safeParse({kind:'attribution',phrase:'Original test fixture',language:'en',meaning:'A historical test fixture with safe generated text.',sourceLocale:'en',challenge:{type:'attribution',category:'song',answer:'Original test song',artist:'Fixture author',aliases:[],alternatives:[]}}).success);
});
