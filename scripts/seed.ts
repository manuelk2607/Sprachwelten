import { neon } from '@neondatabase/serverless';
import { seedEntries } from '../lib/seeds';
import { wordSeeds } from '../lib/word-seeds';
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
for(const e of [...seedEntries,...wordSeeds]) await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,status,author_name) VALUES (${e.id},${e.kind},${e.phrase},${e.language},${e.literal},${e.meaning},${e.example},${e.region},${e.culturalNote},${e.context},${e.sourceUrl},${e.status},${e.authorName}) ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url WHERE content_entries.status='curated' AND content_entries.source_url IS DISTINCT FROM excluded.source_url`;
console.log(`${seedEntries.length} Redewendungen und ${wordSeeds.length} Wörter bereit.`);
