import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { suggestTranslation, translationCacheKey } from '../lib/translation-service';
import { textsOf } from '../lib/content-translations';

const expectedHost=process.env.TRANSLATION_TEST_DATABASE_HOST;
if(!expectedHost||new URL(process.env.DATABASE_URL_UNPOOLED!).hostname!==expectedHost)throw new Error('Use an isolated Neon branch and explicitly set TRANSLATION_TEST_DATABASE_HOST to its direct host.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
const previous=await sql`SELECT characters FROM translation_usage WHERE month='lifetime'`;
const fetcher=globalThis.fetch;const oldKey=process.env.DEEPL_API_KEY;const oldEndpoint=process.env.DEEPL_API_URL;
const source=textsOf({meaning:`QA ${Date.now()}`});const key=await translationCacheKey(source,'de');
let usageCalls=0;let translationCalls=0;
try {
  process.env.DEEPL_API_KEY='fixture:fx';delete process.env.DEEPL_API_URL;
  globalThis.fetch=(async(input,init)=>{
    const url=String(input);
    if(url==='https://api-free.deepl.com/v2/usage'){usageCalls++;return Response.json({character_count:0,character_limit:1000000});}
    if(url==='https://api-free.deepl.com/v2/translate'){translationCalls++;return Response.json({translations:[{text:'A stored English suggestion.'}]});}
    return fetcher(input,init);
  }) as typeof fetch;
  await sql`UPDATE translation_usage SET characters=999970 WHERE month='lifetime'`;
  const first=await suggestTranslation(source,'de');assert.equal(first.cached,false);assert.equal(first.translation.meaning,'A stored English suggestion.');
  const second=await suggestTranslation(source,'de');assert.equal(second.cached,true);assert.equal(usageCalls,1);assert.equal(translationCalls,1);
  await assert.rejects(suggestTranslation(textsOf({meaning:'Another original text that is longer than the remaining lifetime allowance.'}),'de'),/kontingent/);
  assert.equal(translationCalls,1);
  console.log('PASS: DeepL usage preflight, durable suggestion reuse and lifetime quota enforcement without a monthly reset.');
}finally {
  globalThis.fetch=fetcher;
  if(oldKey===undefined)delete process.env.DEEPL_API_KEY;else process.env.DEEPL_API_KEY=oldKey;
  if(oldEndpoint===undefined)delete process.env.DEEPL_API_URL;else process.env.DEEPL_API_URL=oldEndpoint;
  await sql`DELETE FROM translation_suggestions WHERE cache_key=${key}`;
  if(previous[0])await sql`UPDATE translation_usage SET characters=${previous[0].characters} WHERE month='lifetime'`;
}
