import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { database, addEntry, findDuplicateEntry } from "../db/repository";
import { entryInput, learningEntryInput } from "../lib/content";
import {
  createNotebook,
  getNotebook,
  listNotebooks,
  changeNotebookItems,
  deleteNotebook,
  updateNotebook,
  vocabularyCards,
  startVocabulary,
} from "../db/notebooks";
import { answerLearning, revealVocabulary } from "../db/learning-repository";
const host = process.env.TEST_DATABASE_HOST,
  branch = process.env.TEST_NEON_BRANCH;
assert.ok(
  host &&
    host !== "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech" &&
    !host.includes("-pooler"),
  "An isolated direct TEST_DATABASE_HOST is required.",
);
if (branch) {
  assert.match(branch, /^br-[a-z0-9-]+$/);
  assert.notEqual(branch, "br-delicate-field-b96d9qc4");
  const url = execFileSync(
    "neon",
    [
      "connection-string",
      branch,
      "--project-id",
      "calm-tooth-60944868",
      "--database-name",
      "sprachspiel",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  assert.equal(new URL(url).hostname, host);
  process.env.DATABASE_URL = url;
}
assert.ok(process.env.DATABASE_URL);
assert.equal(new URL(process.env.DATABASE_URL).hostname, host);
const sql = database(),
  owner = crypto.randomUUID(),
  other = crypto.randomUUID(),
  ids: string[] = [],
  books: string[] = [];
const material = learningEntryInput.parse({
  kind: "vocabulary",
  phrase: "chat",
  literal: "cat",
  language: "fr",
  sense: "QA " + owner,
  challenge: {
    type: "learning",
    domain: "vocabulary",
    topic: { de: "Tiere", en: "Animals" },
    level: "A1",
    questions: [],
    vocabulary: {
      translationLanguage: "en",
      reversible: false,
      context: { de: "Ein Tier.", en: "An animal." },
    },
  },
});
try {
  const migrated =
    await sql`SELECT question_id,attempts,lapses FROM learning_progress WHERE owner_id='qa-migration-notebooks' ORDER BY question_id`;
  if (migrated.length) {
    assert.equal(migrated.length, 4);
    assert.equal(
      migrated.find((r) => r.question_id === "vocab-en")?.attempts,
      3,
    );
    assert.equal(migrated.find((r) => r.question_id === "vocab-de")?.lapses, 1);
  }
  const aliases =
    await sql`SELECT count(*)::int AS n FROM content_entries WHERE canonical_vocabulary_id IS NOT NULL`;
  assert.equal(aliases[0].n, 10, "Known starter aliases preserve their rows.");
  const entry = await addEntry(material, owner, "Private name");
  ids.push(entry.id);
  const input = {
    name: "QA Heft",
    description: "Private",
    sourceLanguage: "en",
    targetLanguage: "fr",
  };
  const a = await createNotebook(owner, input),
    b = await createNotebook(owner, { ...input, name: "QA Ziel" }),
    c = await createNotebook(owner, {
      ...input,
      name: "QA Reverse",
      sourceLanguage: "fr",
      targetLanguage: "en",
    });
  books.push(a.id, b.id, c.id);
  await assert.rejects(() => getNotebook(other, a.id));
  await assert.rejects(() =>
    changeNotebookItems(other, a.id, 1, "add", [entry.id]),
  );
  await changeNotebookItems(owner, a.id, 1, "add", [entry.id]);
  assert.equal(
    (await listNotebooks(owner)).find((n) => n.id === a.id)?.count,
    1,
  );
  await assert.rejects(() =>
    updateNotebook(owner, a.id, { ...input, targetLanguage: "de" }, 2),
  );
  await assert.rejects(
    () => changeNotebookItems(owner, c.id, 1, "add", [entry.id]),
    "Unapproved reverse direction must fail.",
  );
  const filter = {
    sourceLanguage: "en",
    targetLanguage: "fr",
    notebookId: a.id,
  };
  const cards = await vocabularyCards(owner, filter, "en");
  assert.equal(cards.cards[0].source, "cat");
  assert.equal(cards.cards[0].target, "chat");
  await assert.rejects(() => vocabularyCards(other, filter, "en"));
  const task = await startVocabulary(owner, true, filter, "en", "writing");
  assert.ok(!JSON.stringify(task).includes("answers"));
  await assert.rejects(() => answerLearning(other, task.id, "chat", "en"));
  await assert.rejects(() => answerLearning(owner, task.id, "", "en", true));
  const parallel = await Promise.allSettled([
    answerLearning(owner, task.id, "chat", "en"),
    answerLearning(owner, task.id, "chat", "en"),
  ]);
  assert.equal(parallel.filter((s) => s.status === "fulfilled").length, 1);
  await changeNotebookItems(owner, a.id, 2, "move", [entry.id], b.id);
  const afterMove = await listNotebooks(owner);
  assert.equal(afterMove.find((n) => n.id === a.id)?.count, 0);
  assert.equal(afterMove.find((n) => n.id === b.id)?.practiced, 1);
  const moved = { ...filter, notebookId: b.id };
  const flash = await startVocabulary(owner, true, moved, "en", "flashcard");
  await assert.rejects(() => answerLearning(owner, flash.id, "", "en", true));
  await assert.rejects(() => revealVocabulary(other, flash.id, "en"));
  assert.deepEqual((await revealVocabulary(owner, flash.id, "en")).answers, [
    "chat",
  ]);
  assert.equal(
    (await answerLearning(owner, flash.id, "", "en", false)).correct,
    false,
  );
  assert.equal(
    (await vocabularyCards(owner, { ...moved, status: "difficult" }, "en"))
      .cards.length,
    1,
  );
  assert.equal(
    (await vocabularyCards(owner, { ...moved, status: "due" }, "en")).cards
      .length,
    0,
  );
  await assert.rejects(() =>
    startVocabulary(owner, true, moved, "en", "writing", "reverse"),
  );
  await sql`UPDATE content_entries SET challenge=jsonb_set(challenge,'{vocabulary,reversible}','true'),revision=revision+1 WHERE id=${entry.id}`;
  await changeNotebookItems(owner, c.id, 1, "add", [entry.id]);
  const reverse = await startVocabulary(
    owner,
    true,
    { sourceLanguage: "fr", targetLanguage: "en", notebookId: c.id },
    "de",
    "writing",
  );
  assert.equal(reverse.targetLanguage, "en");
  assert.equal(
    (await answerLearning(owner, reverse.id, "cat", "en")).correct,
    true,
  );
  const duplicate = {
    ...material,
    phrase: "cat",
    literal: "chat",
    language: "en",
    challenge: {
      ...material.challenge!,
      type: "learning" as const,
      domain: "vocabulary" as const,
      topic: { de: "Tiere", en: "Animals" },
      level: "A1" as const,
      questions: [],
      vocabulary: {
        translationLanguage: "fr",
        reversible: true,
        translationAlternatives: [],
        termAlternatives: [],
        context: { de: "", en: "" },
      },
    },
  };
  await assert.rejects(() =>
    addEntry(entryInput.parse(duplicate), owner, "QA"),
  );
  assert.equal((await findDuplicateEntry(duplicate))?.id, entry.id);
  const stale = await startVocabulary(owner, true, moved, "en", "writing");
  await changeNotebookItems(
    owner,
    b.id,
    (await getNotebook(owner, b.id)).revision,
    "remove",
    [entry.id],
  );
  await assert.rejects(() => answerLearning(owner, stale.id, "chat", "en"));
  const beforeDelete = (
    await sql`SELECT sum(attempts)::int AS n FROM learning_progress WHERE owner_id=${owner}`
  )[0].n;
  await deleteNotebook(owner, c.id, (await getNotebook(owner, c.id)).revision);
  assert.equal(
    (
      await sql`SELECT sum(attempts)::int AS n FROM learning_progress WHERE owner_id=${owner}`
    )[0].n,
    beforeDelete,
  );
  const d=await createNotebook(owner,{...input,name:'QA concurrent destination'});books.push(d.id);
  await changeNotebookItems(owner,a.id,(await getNotebook(owner,a.id)).revision,'add',[entry.id]);
  const sourceRevision=(await getNotebook(owner,a.id)).revision;
  const moves=await Promise.allSettled([changeNotebookItems(owner,a.id,sourceRevision,'move',[entry.id],b.id),changeNotebookItems(owner,a.id,sourceRevision,'move',[entry.id],d.id)]);
  assert.equal(moves.filter(result=>result.status==='fulfilled').length,1,'Only one concurrent move may consume a source membership.');
  const remaining=await listNotebooks(owner);assert.equal(remaining.find(n=>n.id===a.id)?.count,0);assert.equal(remaining.filter(n=>n.id===b.id||n.id===d.id).reduce((sum,n)=>sum+n.count,0),1);
  const holder=remaining.find(n=>(n.id===b.id||n.id===d.id)&&n.count===1)!;
  await sql`UPDATE content_entries SET deleted_at=now(),revision=revision+1 WHERE id=${entry.id}`;
  const unavailable=await vocabularyCards(owner,{sourceLanguage:'en',targetLanguage:'fr',notebookId:holder.id},'en');
  assert.equal(unavailable.cards.length,0);assert.deepEqual(unavailable.unavailableIds,[entry.id]);
  await changeNotebookItems(owner,holder.id,holder.revision,'remove',unavailable.unavailableIds);
  assert.equal((await listNotebooks(owner)).find(n=>n.id===holder.id)?.count,0);
  console.log(
    "PASS: known-card migration and old progress preserved, owner isolation, notebook CRUD/moves, incompatible directions, atomic grading, guarded flashcards, per-direction SRS, membership revocation and canonical reverse uniqueness.",
  );
} finally {
  await sql`DELETE FROM vocabulary_notebooks WHERE owner_id=ANY(${[owner, other]}) AND id=ANY(${books})`;
  await sql`DELETE FROM content_entries WHERE id=ANY(${ids}) AND author_id=${owner}`;
  assert.equal(
    (
      await sql`SELECT count(*)::int AS n FROM learning_progress WHERE owner_id=${owner}`
    )[0].n,
    0,
  );
  console.log(
    "PASS: private notebook fixtures and dependent attempts/progress cleaned; migration fixtures retained for subsequent migration checks.",
  );
}
