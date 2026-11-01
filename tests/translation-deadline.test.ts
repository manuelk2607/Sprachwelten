import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestCloudflareTranslation} from '../lib/translation-service';
import {textsOf} from '../lib/content-translations';
import {GameError} from '../lib/game-error';
test('a stalled provider ends with a recoverable error and never starts later chunks or fields',async()=>{
 let calls=0;
 await assert.rejects(requestCloudflareTranslation(textsOf({meaning:'A sentence. '.repeat(60),example:'Another field.'}),'en',{run:()=>{calls++;return new Promise(()=>{});}},10),error=>error instanceof GameError&&error.status===503&&/dauert zu lange/.test(error.message));
 assert.equal(calls,1);
});
test('a provider error after a translated chunk cannot yield a partial suggestion',async()=>{
 let calls=0;
 await assert.rejects(requestCloudflareTranslation(textsOf({meaning:'A sentence. '.repeat(60)}),'en',{run:async()=>{calls++;if(calls===2)throw new Error('Provider transport failed');return {translated_text:'Ein Satz.'};}}),/Provider transport failed/);
 assert.equal(calls,2);
});
