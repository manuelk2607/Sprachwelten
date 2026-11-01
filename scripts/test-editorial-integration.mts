import assert from "node:assert/strict";
import { isolatedDatabaseTarget } from "../lib/qa-target";
import { database, addEntry, gamePrompts } from "../db/repository";
import { entryInput } from "../lib/content";
import {
  getEditorialReview,
  saveEditorialReview,
  editorialAvailability,
  readyGameDifficulties,
} from "../db/editorial-repository";
import { createGame, act, viewGame } from "../lib/game";
isolatedDatabaseTarget(process.env);
const sql = database(),
  owner = crypto.randomUUID(),
  ids: string[] = [];
const review = {
  entryRevision: 0,
  reviewRevision: 0,
  level: "introductory" as const,
  reviewed: true,
  reviewedAt: new Date().toISOString().slice(0, 10),
  sources: ["https://www.duden.de/rechtschreibung/Bemme"],
  rationale:
    "Synthetic QA approval for testing only; not a real linguistic assessment.",
};
try {
  for (let i = 0; i < 20; i++) {
    const entry = await addEntry(
      entryInput.parse({
        kind: "dialect",
        phrase: `QA difficulty ${owner} ${i}`,
        language: "de",
        regionId: "at",
        literal: "QA only",
        meaning: "Synthetic integration fixture.",
      }),
      owner,
      "QA",
    );
    ids.push(entry.id);
    const before = await getEditorialReview(entry.id);
    assert.equal(before.review, null);
    await saveEditorialReview(entry.id, review, owner);
  }
  assert.deepEqual((await editorialAvailability("dialect", "de")).levels, [
    "introductory",
  ]);
  assert.deepEqual(
    await readyGameDifficulties("dialect-detective", { gameLanguages: ["de"] }),
    ["introductory"],
  );
  assert.deepEqual(
    await readyGameDifficulties("dialect-detective", {
      gameLanguages: ["de", "en"],
    }),
    [],
  );
  assert.deepEqual(
    await readyGameDifficulties("meaning-quiz", {
      meaningCategory: "expression",
      gameLanguages: ["de"],
    }),
    [],
  );
  const prompts = await gamePrompts("dialect-detective", {
    difficulty: "introductory",
    gameLanguages: ["de"],
  });
  assert.equal(prompts.length, 20);
  assert.ok(prompts.every((e) => e.editorialDifficulty === "introductory"));
  const game = createGame(
    "QADIFF",
    { id: owner, name: "QA", tokenHash: "synthetic", score: 0 },
    "de",
    "dialect-detective",
  );
  game.gameLanguages = ["de"];
  game.difficulty = "introductory";
  game.totalRounds = 1;
  act(game, owner, { action: "start" }, prompts);
  assert.equal(viewGame(game, owner).difficulty, "introductory");
  act(game, owner, {
    action: "vote",
    optionId: game.round!.options.find((o) => o.categoryId === "at")!.id,
  });
  assert.equal(game.players[0].score, 1);
  act(game, owner, { action: "next" }, prompts);
  act(game, owner, { action: "restart", immediate: true }, prompts);
  assert.equal(game.difficulty, "introductory");
  assert.equal(game.players[0].score, 0);
  assert.deepEqual((await editorialAvailability("dialect", "en")).levels, []);
  assert.deepEqual((await editorialAvailability("idiom", "de")).levels, []);
  const concurrent = await Promise.allSettled([
    saveEditorialReview(
      ids[0],
      { ...review, reviewRevision: 1, reviewed: false },
      owner,
    ),
    saveEditorialReview(
      ids[0],
      { ...review, reviewRevision: 1, reviewed: false },
      owner,
    ),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.deepEqual((await editorialAvailability("dialect", "de")).levels, []);
  await assert.rejects(() =>
    gamePrompts("dialect-detective", {
      difficulty: "introductory",
      gameLanguages: ["de"],
    }),
  );
  assert.equal((await getEditorialReview(ids[0])).review?.reviewRevision, 2);
  await saveEditorialReview(ids[0], { ...review, reviewRevision: 2 }, owner);
  await sql`UPDATE content_entries SET revision=revision+1 WHERE id=${ids[1]}`;
  assert.equal((await getEditorialReview(ids[1])).effective, false);
  assert.deepEqual((await editorialAvailability("dialect", "de")).levels, []);
  await assert.rejects(() =>
    saveEditorialReview(ids[1], { ...review, reviewRevision: 1 }, owner),
  );
  await saveEditorialReview(
    ids[1],
    { ...review, entryRevision: 1, reviewRevision: 1 },
    owner,
  );
  assert.deepEqual((await editorialAvailability("dialect", "de")).levels, [
    "introductory",
  ]);
  await sql`UPDATE content_entries SET deleted_at=now(),revision=revision+1 WHERE id=${ids[2]}`;
  await assert.rejects(() => getEditorialReview(ids[2]));
  await assert.rejects(() =>
    saveEditorialReview(
      ids[2],
      { ...review, entryRevision: 1, reviewRevision: 1 },
      owner,
    ),
  );
  assert.deepEqual((await editorialAvailability("dialect", "de")).levels, []);
  assert.equal(
    (
      await sql`SELECT count(*)::int AS n FROM entry_difficulty_events WHERE entry_id=ANY(${ids})`
    )[0].n,
    23,
  );
  console.log(
    "PASS: isolated synthetic editorial reviews, 20-card gate, language/category separation, atomic concurrent revisions, withdrawal, invalidation on edits/deletion and immutable history. No real linguistic approvals or admin grants.",
  );
} finally {
  await sql`DELETE FROM content_entries WHERE id=ANY(${ids}) AND author_id=${owner}`;
  assert.equal(
    (
      await sql`SELECT count(*)::int AS n FROM entry_difficulty_events WHERE entry_id=ANY(${ids})`
    )[0].n,
    0,
  );
  console.log("PASS: all editorial QA fixtures and dependent history removed.");
}
