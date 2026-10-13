import { neon } from '@neondatabase/serverless';
import { seedEntries } from '../lib/seeds';
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);
for(const e of seedEntries) await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,status,author_name) VALUES (${e.id},${e.kind},${e.phrase},${e.language},${e.literal},${e.meaning},${e.example},${e.region},${e.culturalNote},${e.context},${e.sourceUrl},${e.status},${e.authorName}) ON CONFLICT(id) DO NOTHING`;
console.log(`${seedEntries.length} Startkarten bereit.`);
