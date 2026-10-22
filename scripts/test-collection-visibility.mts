import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { listEntries, gamePrompts } from "../db/repository";
const target = process.env.TEST_DATABASE_HOST;
assert.ok(
  target &&
    target !== "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech",
  "Isolated QA database required.",
);
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname, target);
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname.replace("-pooler.", "."),
  target,
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const [card] =
  await sql`SELECT phrase,language FROM content_entries WHERE kind='taboo' AND deleted_at IS NULL LIMIT 1`;
assert.ok(card, "QA needs existing Taboo cards.");
for (const [kind, language, search] of [
  ["", "", ""],
  ["", card.language, card.phrase],
  ["taboo", "", ""],
  ["taboo", card.language, card.phrase],
]) {
  for (const offset of [0, 6]) {
    const rows = await listEntries(kind, language, search, offset);
    assert.ok(rows.every((e) => e.kind !== "taboo"));
    const expected =
      await sql`SELECT id FROM content_entries WHERE deleted_at IS NULL AND kind<>'taboo' AND (${kind}='' OR kind=${kind}) AND (${language}='' OR language=${language}) AND (${search}='' OR phrase ILIKE '%'||${search}||'%' OR meaning ILIKE '%'||${search}||'%' OR translations#>>'{de,meaning}' ILIKE '%'||${search}||'%' OR translations#>>'{en,meaning}' ILIKE '%'||${search}||'%') ORDER BY created_at DESC,id LIMIT 6 OFFSET ${offset}`;
    assert.deepEqual(
      rows.map((e) => e.id),
      expected.map((e) => e.id),
    );
  }
}
const game = await gamePrompts("taboo", {
  locale: "de",
  tabooLanguages: ["de"],
});
assert.ok(game.length);
assert.ok(game.every((e) => e.kind === "taboo" && e.language === "de"));
console.log(
  "PASS: public collection, explicit kind, search, language and pagination exclude Taboo; game cards remain available. No test data written.",
);
