import {neon} from '@neondatabase/serverless';
import {communityGameEntries} from '../lib/community-game-seeds';
const sql=neon(process.env.DATABASE_URL_UNPOOLED!);let inserted=0;
for(const e of communityGameEntries){const rows=await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_name,status,source_locale,translations,challenge) VALUES (${e.id},${e.kind},${e.phrase},${e.language},${e.literal},${e.meaning},${e.example},${e.region},${e.culturalNote},${e.context},${e.sourceUrl},${e.authorName},'curated','de',${JSON.stringify(e.translations)}::jsonb,${JSON.stringify(e.challenge)}::jsonb) ON CONFLICT DO NOTHING RETURNING id`;inserted+=rows.length;}
console.log(`${inserted} neue Witz- und Kommunikationskarten ergänzt.`);
