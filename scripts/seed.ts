import { neon } from '@neondatabase/serverless';
import { seedEntries } from '../lib/seeds';
import { wordSeeds } from '../lib/word-seeds';
import { extraSeeds } from '../lib/extra-seeds';
import { categoryId } from '../lib/quiz-categories';
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
for(const e of [...seedEntries,...wordSeeds,...extraSeeds]) await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,status,author_name,region_id,context_id) VALUES (${e.id},${e.kind},${e.phrase},${e.language},${e.literal},${e.meaning},${e.example},${e.region},${e.culturalNote},${e.context},${e.sourceUrl},${e.status},${e.authorName},${categoryId('region',e.region)??null},${categoryId('context',e.context)??null}) ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url,region_id=excluded.region_id,context_id=excluded.context_id WHERE content_entries.status='curated'`;
console.log(`${seedEntries.length+wordSeeds.length+extraSeeds.length} Startkarten für alle fünf Modi bereit.`);
