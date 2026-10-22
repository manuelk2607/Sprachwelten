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
    if (kind === "taboo") assert.deepEqual(rows, []);
    if (!kind && !language && !search)
      assert.equal(
        rows.length,
        6,
        "Taboo must be removed before LIMIT, not after loading a page.",
      );
  }
}
const first = await listEntries(),
  second = await listEntries("", "", "", 6);
assert.equal(
  new Set([...first, ...second].map((e) => e.id)).size,
  12,
  "Pages must not overlap.",
);
const [ordinary] =
  await sql`SELECT phrase,language FROM content_entries WHERE kind='idiom' AND deleted_at IS NULL ORDER BY length(phrase) DESC LIMIT 1`;
assert.ok(ordinary);
const searched = await listEntries("idiom", ordinary.language, ordinary.phrase);
assert.ok(
  searched.some((e) => e.phrase === ordinary.phrase),
  "Ordinary contributions remain searchable.",
);
const game = await gamePrompts("taboo", {
  locale: "de",
  tabooLanguages: ["de"],
});
assert.ok(game.length);
assert.ok(game.every((e) => e.kind === "taboo" && e.language === "de"));
console.log(
  "PASS: public collection, explicit kind, search, language and pagination exclude Taboo; game cards remain available. No test data written.",
);
