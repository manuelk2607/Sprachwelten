import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { addEntry, getEntry, listEntries } from "../db/repository";
import { editAdminEntry } from "../db/admin-repository";
import { suggestEntry, reviewSuggestion } from "../db/community-repository";
import { entryInput } from "../lib/content";
import { act, createGame, viewGame } from "../lib/game";

const host = process.env.TEST_DATABASE_HOST;
assert.ok(host, "Use an isolated QA database.");
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname, host);
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname.replace("-pooler.", "."),
  host,
);
assert.notEqual(
  host,
  "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech",
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!),
  owner = crypto.randomUUID(),
  reviewer = crypto.randomUUID(),
  contributor = crypto.randomUUID();
const ids: string[] = [];
const input = entryInput.parse({
  kind: "attribution",
  phrase: "QA-Liedstelle " + crypto.randomUUID(),
  language: "de",
  hint: "Ein Lied über Fernweh.",
  sourceLocale: "de",
  translation: { hint: "A song about wanderlust." },
  translationReviewed: true,
  challenge: {
    type: "attribution",
    category: "song",
    answer: "QA-Testlied",
    artist: "QA-Interpret",
    album: "QA-Testalbum",
    alternatives: ["QA-Lied A", "QA-Lied B", "QA-Lied C"],
  },
});
try {
  const entry = await addEntry(input, owner, "");
  ids.push(entry.id);
  let saved = (await getEntry(entry.id))!;
  assert.ok(saved.challenge?.type === "attribution");
  assert.equal(saved.challenge.album, "QA-Testalbum");
  assert.equal(saved.translations?.en?.hint, "A song about wanderlust.");
  const previews = await listEntries("attribution", "de", entry.phrase);
  assert.ok(!("challenge" in previews[0]));
  assert.ok(!("hint" in previews[0]));
  const edited = entryInput.parse({
    ...input,
    hint: "Ein anderer Tipp.",
    translation: { hint: "Another clue." },
    challenge: { ...input.challenge, album: "QA-Neues Album" },
  });
  await editAdminEntry(entry.id, edited, 0, owner, { ownerOnly: true });
  await assert.rejects(
    editAdminEntry(entry.id, input, 0, owner, { ownerOnly: true }),
    /inzwischen geändert/,
  );
  const proposal = entryInput.parse({
    ...edited,
    challenge: { ...edited.challenge, album: "QA-Geprüftes Album" },
  });
  const id = await suggestEntry(entry.id, proposal, 1, "", {
    id: contributor,
    name: "",
  });
  await reviewSuggestion(id as string, 0, "accept", reviewer);
  saved = (await getEntry(entry.id))!;
  assert.ok(saved.challenge?.type === "attribution");
  assert.equal(saved.challenge.album, "QA-Geprüftes Album");
  const game = createGame(
    "SONGQA",
    { id: owner, name: "QA", tokenHash: "fixture", score: 0 },
    "en",
    "who-said-it",
  );
  game.totalRounds = 1;
  act(game, owner, { action: "start" }, [saved]);
  const view = viewGame(game, owner);
  assert.equal(view.hint?.text, "Another clue.");
  assert.equal(view.songHelp?.album, "QA-Geprüftes Album");
  assert.equal(view.revelation, null);
  act(game, owner, {
    action: "vote",
    optionId: game.round!.options.find((o) => o.solution)!.id,
  });
  assert.equal(game.players[0].score, 1);
  assert.equal(viewGame(game, owner).songHelp, null);
  console.log(
    "PASS: song albums and reviewed bilingual hints survive creation, own editing and suggestion acceptance; stale edits remain blocked, previews hide helpers and game scoring stays unchanged.",
  );
} finally {
  for (const id of ids) {
    await sql`DELETE FROM entry_suggestions WHERE entry_id=${id}`;
    await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  }
}
