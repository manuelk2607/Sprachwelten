import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import {
  addEntry,
  getEntry,
  listEntries,
  findDuplicateEntry,
} from "../db/repository";
import { editAdminEntry } from "../db/admin-repository";
import {
  suggestEntry,
  reviewSuggestion,
  bulkEdit,
  undoBulkEdit,
} from "../db/community-repository";
import { entryInput } from "../lib/content";
import { phraseInput } from "../lib/phrase-markup";
import { DuplicateEntryError } from "../lib/entry-duplicates";

const host = process.env.TEST_DATABASE_HOST;
assert.ok(host, "TEST_DATABASE_HOST must identify an isolated test database.");
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname, host);
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname.replace("-pooler.", "."),
  host,
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const ids: string[] = [];
// Repository audit actors only; no accounts or administrator permissions are created.
const owner = crypto.randomUUID(),
  reviewer = crypto.randomUUID(),
  contributor = crypto.randomUUID();
const phrase = "QA " + crypto.randomUUID();
const input = entryInput.parse({
  kind: "idiom",
  language: "de",
  ...phraseInput("**" + phrase + "**", "idiom"),
  hint: "Ein Hinweis.",
  sourceLocale: "de",
  translation: { hint: "A clue." },
  translationReviewed: true,
  challenge: {
    type: "meaning",
    choices: [0, 1, 2, 3].map((n) => ({
      de: "Antwort " + n,
      en: "Answer " + n,
    })),
    correctIndex: 2,
  },
});
try {
  const added = await addEntry(input, owner, "");
  ids.push(added.id);
  assert.equal(added.phrase, phrase);
  assert.equal(added.phraseMarkup, "**" + phrase + "**");
  assert.equal(added.translations?.en?.hint, "A clue.");
  const previews = await listEntries("idiom", "de", phrase);
  assert.equal(previews[0].phraseMarkup, input.phraseMarkup);
  assert.ok(!("hint" in previews[0]));
  assert.ok(!("challenge" in previews[0]));
  assert.equal((await findDuplicateEntry(input))?.id, added.id);
  await assert.rejects(
    addEntry(
      { ...input, phraseMarkup: "QA **" + phrase.slice(3) + "**" },
      contributor,
      "",
    ),
    DuplicateEntryError,
  );
  const edited = entryInput.parse({
    ...input,
    hint: "Neuer Hinweis.",
    translation: { hint: "New clue." },
    phraseMarkup: "QA **" + phrase.slice(3) + "**",
  });
  await editAdminEntry(added.id, edited, 0, owner, { ownerOnly: true });
  assert.equal((await getEntry(added.id))?.phraseMarkup, edited.phraseMarkup);
  assert.equal((await getEntry(added.id))?.translations?.en?.hint, "New clue.");
  await assert.rejects(
    editAdminEntry(added.id, input, 0, owner, { ownerOnly: true }),
    /inzwischen geändert/,
  );
  const proposal = entryInput.parse({
    ...edited,
    hint: "Geprüfter Hinweis.",
    translation: { hint: "Reviewed clue." },
    phraseMarkup: "**QA** " + phrase.slice(3),
  });
  const suggestion = await suggestEntry(added.id, proposal, 1, "", {
    id: contributor,
    name: "",
  });
  await reviewSuggestion(suggestion as string, 0, "accept", reviewer);
  let reloaded = (await getEntry(added.id))!;
  assert.equal(reloaded.phraseMarkup, proposal.phraseMarkup);
  assert.equal(reloaded.translations?.en?.hint, "Reviewed clue.");
  assert.deepEqual(reloaded.challenge, input.challenge);
  await bulkEdit(
    {
      entries: [{ id: added.id, revision: 2 }],
      kind: "dialect",
      regionId: "ch",
    },
    reviewer,
  );
  reloaded = (await getEntry(added.id))!;
  assert.equal(reloaded.phraseMarkup, proposal.phraseMarkup);
  assert.equal(reloaded.hint, proposal.hint);
  const [event] =
    await sql`SELECT batch_id FROM moderation_events WHERE entry_id=${added.id} AND action='bulk' ORDER BY id DESC LIMIT 1`;
  await undoBulkEdit(event.batch_id as string, reviewer);
  reloaded = (await getEntry(added.id))!;
  assert.equal(reloaded.kind, "idiom");
  assert.equal(reloaded.phraseMarkup, proposal.phraseMarkup);
  assert.deepEqual(reloaded.challenge, input.challenge);
  await editAdminEntry(
    added.id,
    entryInput.parse({ ...input, phraseMarkup: "", hint: "", translation: {} }),
    reloaded.revision!,
    reviewer,
  );
  reloaded = (await getEntry(added.id))!;
  assert.equal(reloaded.phraseMarkup, "");
  assert.equal(reloaded.hint, "");
  assert.equal(reloaded.translations?.en?.hint, undefined);
  console.log(
    "PASS: idiom hints and formatting survive creation, edits, suggestion review, bulk conversion and undo; canonical duplicates and stale edits remain blocked; previews contain no solutions.",
  );
} finally {
  for (const id of ids) {
    await sql`DELETE FROM entry_suggestions WHERE entry_id=${id}`;
    await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  }
}
