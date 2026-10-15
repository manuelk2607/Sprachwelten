import {neon} from '@neondatabase/serverless';
import {newGameEntries} from '../lib/new-game-seeds';
const url=process.env.DATABASE_URL_UNPOOLED;if(!url)throw new Error('DATABASE_URL_UNPOOLED fehlt.');
const sql=neon(url);let inserted=0;
for(const e of newGameEntries){const rows=await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_name,status,source_locale,translations,challenge,created_at) VALUES (${e.id},${e.kind},${e.phrase},${e.language},${e.literal},${e.meaning},${e.example},${e.region},${e.culturalNote},${e.context},${e.sourceUrl},${e.authorName},'curated','de',${JSON.stringify(e.translations)}::jsonb,${JSON.stringify(e.challenge)}::jsonb,${e.createdAt}) ON CONFLICT(id) DO NOTHING RETURNING id`;inserted+=rows.length;}
console.log(`${inserted} neue Spielkarten ergänzt; vorhandene Beiträge unverändert.`);
