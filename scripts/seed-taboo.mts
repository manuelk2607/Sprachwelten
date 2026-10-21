import { neon } from "@neondatabase/serverless";
import { tabooSeeds } from "../lib/taboo-seeds";
import { entryInput } from "../lib/content";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
let inserted = 0;
for (const source of tabooSeeds) {
  const entry = entryInput.parse(source);
  const rows =
    await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_name,credit_name,status,source_locale,challenge) VALUES (${source.id},${entry.kind},${entry.phrase},${entry.language},'','','','','','','','','','curated',${entry.sourceLocale!},${JSON.stringify(entry.challenge)}::jsonb) ON CONFLICT DO NOTHING RETURNING id`;
  inserted += rows.length;
}
console.log(
  `${inserted} neue Tabu-Startkarten ergänzt; bestehende Beiträge unverändert.`,
);
