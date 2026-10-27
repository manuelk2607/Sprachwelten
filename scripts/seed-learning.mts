import { neon } from "@neondatabase/serverless";
import { entryInput } from "../lib/content";
import { canonicalLearningSeeds as learningSeeds } from "../lib/learning-seeds";
import {additionalGrammarSeeds} from '../lib/grammar-seeds';
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED fehlt.");
const sql = neon(url);
for (const entry of [...learningSeeds,...additionalGrammarSeeds]) {
  entryInput.parse(entry);
  await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,source_url,status,author_name,source_locale,translations,challenge) VALUES(${entry.id},${entry.kind},${entry.phrase},${entry.language},${entry.literal},${entry.meaning},${entry.example},${entry.sourceUrl},${entry.status},${entry.authorName},${entry.sourceLocale},${JSON.stringify(entry.translations ?? {})}::jsonb,${JSON.stringify(entry.challenge)}::jsonb) ON CONFLICT DO NOTHING`;
}
console.log(
  "Lernmaterialien idempotent ergänzt; bestehende Inhalte nicht verändert.",
);
