import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { addEntry, findDuplicateEntry } from '../db/repository';
import { entryInput } from '../lib/content';
import { DuplicateEntryError } from '../lib/entry-duplicates';

const expectedHost=process.env.CONTRIBUTION_TEST_DATABASE_HOST;
if(!expectedHost||new URL(process.env.DATABASE_URL_UNPOOLED!).hostname!==expectedHost)throw new Error('Use an isolated Neon branch and explicitly set CONTRIBUTION_TEST_DATABASE_HOST to its direct host.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);const ids:string[]=[];const stamp=crypto.randomUUID();
async function create(input:unknown,author='qa-duplicate-a'){
  const entry=await addEntry(entryInput.parse(input),author,'QA duplicate check');ids.push(entry.id);return entry;
}
try{
  const fixtures=[['  SAUDADE\u00a0 !  ','saudade'],['cafe\u0301','café'],['Ｄａｎｋｅ','danke'],['In\n\tbocca   al lupo!','in bocca al lupo']];
  for(const [input,expected] of fixtures){const rows=await sql`SELECT content_phrase_key(${input}) AS key`;assert.equal(rows[0].key,expected);}
  const distinct=await sql`SELECT content_phrase_key('Maße')<>content_phrase_key('Masse') AND content_phrase_key('C++')<>content_phrase_key('C') AS different`;assert.equal(distinct[0].different,true);
  const phrase=`QA duplicate ${stamp}`;const original=await create({kind:'word',phrase,language:'de',meaning:'Eine ursprüngliche Erklärung.'});
  await assert.rejects(create({kind:'word',phrase:`  ${phrase.toUpperCase().replaceAll(' ','  ')}! `,language:'de',sourceLocale:'en',meaning:'A different explanation.'},'qa-duplicate-b'),error=>error instanceof DuplicateEntryError&&error.duplicate?.id===original.id);
  assert.equal((await findDuplicateEntry({kind:'word',phrase:phrase+'!',language:'de'}))?.id,original.id);
  await create({kind:'word',phrase,language:'en'});
  await create({kind:'idiom',phrase,language:'de',meaning:'Ein anderer Inhaltstyp ist erlaubt.'});
  for(const regionId of ['at','de-bavaria'])await create({kind:'dialect',phrase,language:'de',meaning:'Eine regionale Bedeutung.',regionId});
  for(const contextId of ['thanks','agreement'])await create({kind:'situation',phrase,language:'de',meaning:'Eine Bedeutung in diesem Kontext.',contextId});
  await assert.rejects(sql`INSERT INTO content_entries(kind,phrase,language,meaning,author_name) VALUES ('word',${phrase.toLowerCase()+'? '},'de','Bypassing the application.','QA duplicate check')`,error=>typeof error==='object'&&error!==null&&'code' in error&&error.code==='23505');
  const concurrent=await Promise.allSettled([create({kind:'word',phrase:`Race ${stamp}`,language:'en'}),create({kind:'word',phrase:`RACE  ${stamp}!`,language:'en'},'qa-duplicate-b')]);
  assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);
  assert.ok(concurrent.some(result=>result.status==='rejected'&&result.reason instanceof DuplicateEntryError));
  console.log('PASS: Unicode/case/whitespace/punctuation duplicates, cross-author protection, distinct languages/regions/contexts, direct SQL constraint and concurrent writes.');
}finally{
  for(const id of ids)await sql`DELETE FROM content_entries WHERE id=${id} AND author_name='QA duplicate check'`;
}
