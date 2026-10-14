import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { suggestTranslation, translationCacheKey, translationDailyCharacterLimit, type TranslationAI } from '../lib/translation-service';
import { textsOf } from '../lib/content-translations';

const expectedHost=process.env.TRANSLATION_TEST_DATABASE_HOST;
if(!expectedHost||new URL(process.env.DATABASE_URL_UNPOOLED!).hostname!==expectedHost)throw new Error('Use an isolated Neon branch and explicitly set TRANSLATION_TEST_DATABASE_HOST to its direct host.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
const day=`cloudflare:${new Date().toISOString().slice(0,10)}`;
const previous=await sql`SELECT characters FROM translation_usage WHERE month=${day}`;
const source=textsOf({meaning:`QA ${Date.now()}`});const key=await translationCacheKey(source,'de');
let translationCalls=0;
const ai:TranslationAI={run:async()=>{translationCalls++;return {translated_text:'A stored English suggestion.'};}};
try {
  await sql`INSERT INTO translation_usage(month,characters) VALUES (${day},${translationDailyCharacterLimit-30}) ON CONFLICT(month) DO UPDATE SET characters=EXCLUDED.characters`;
  const first=await suggestTranslation(source,'de',ai);assert.equal(first.cached,false);assert.equal(first.translation.meaning,'A stored English suggestion.');
  const second=await suggestTranslation(source,'de',ai);assert.equal(second.cached,true);assert.equal(translationCalls,1);
  await assert.rejects(suggestTranslation(textsOf({meaning:'Another original text that exceeds the remaining daily allowance.'}),'de',ai),/tägliche Übersetzungslimit/);
  assert.equal(translationCalls,1);
  assert.equal((await suggestTranslation(source,'de')).cached,true);
  await assert.rejects(suggestTranslation(textsOf({meaning:'Uncached text without a binding.'}),'de'),/nicht verfügbar/);
  console.log('PASS: Workers AI suggestion reuse, daily quota enforcement and cached fallback without an AI binding.');
}finally {
  await sql`DELETE FROM translation_suggestions WHERE cache_key=${key}`;
  if(previous[0])await sql`UPDATE translation_usage SET characters=${previous[0].characters} WHERE month=${day}`;
  else await sql`DELETE FROM translation_usage WHERE month=${day}`;
}
