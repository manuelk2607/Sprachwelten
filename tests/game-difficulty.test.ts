import { test } from "node:test";
import assert from "node:assert/strict";
import {
  difficultyGroups,
  difficultyScopeChanged,
} from "../lib/game-difficulty";
import { createGame, act, viewGame, GameError } from "../lib/game";
import { playablePrompts, poolKey } from "../lib/game-pool";
import { languagePoolQuery } from "../db/game-language-pool";
import { extraSeeds } from "../lib/extra-seeds";
import { entryInput, roomAction } from "../lib/content";
test("game difficulty is separate from CEFR, constrained by exact categories/languages and optional for legacy rooms", () => {
  assert.deepEqual(difficultyGroups("word-chain", {}), []);
  assert.deepEqual(difficultyGroups("false-friends", {}), []);
  assert.deepEqual(
    difficultyGroups("who-said-it", { attributionCategory: "song" }),
    ["attribution:song"],
  );
  assert.deepEqual(
    difficultyGroups("tongue-twisters", { pronunciationCategory: "both" }),
    ["tongue_twister", "sound_pair"],
  );
  assert.equal(
    roomAction.safeParse({ action: "configure", difficulty: "A1" }).success,
    false,
  );
  assert.equal(
    roomAction.safeParse({ action: "configure", difficulty: null }).success,
    true,
  );
  assert.equal(difficultyScopeChanged({ rounds: 2 }), false);
  assert.equal(difficultyScopeChanged({ gameLanguages: ["de"] }), true);
  const card = extraSeeds.find((e) => e.kind === "dialect")!;
  assert.ok(
    !(
      "editorialDifficulty" in
      entryInput.parse({
        ...card,
        literal: "QA translation",
        editorialDifficulty: "introductory",
      })
    ),
    "Contributors cannot submit their own editorial approval.",
  );
  const game = createGame(
    "DIFFXX",
    { id: "host", name: "Host", score: 0, tokenHash: "test" },
    "de",
    "dialect-detective",
  );
  const key = poolKey(game);
  game.difficulty = "introductory";
  assert.notEqual(key, poolKey(game));
  assert.equal(playablePrompts(game, [card]).length, 0);
  assert.equal(
    playablePrompts(game, [{ ...card, editorialDifficulty: "introductory" }])
      .length,
    1,
  );
  act(game, "host", { action: "configure", rounds: 1 });
  assert.equal(game.difficulty, "introductory");
  act(game, "host", { action: "configure", gameLanguages: ["de"] });
  assert.equal(game.difficulty, undefined);
  assert.equal(viewGame(game, "host").difficulty, undefined);
  assert.throws(
    () => act(game, "other", { action: "configure", difficulty: "advanced" }),
    GameError,
  );
  const filtered = languagePoolQuery(
    "dialect-detective",
    ["de"],
    "SELECT * FROM content_entries LIMIT 5",
    [],
    "introductory",
  );
  assert.deepEqual(filtered.params, [["de"], "introductory"]);
  assert.match(filtered.statement, /r\.content_revision=e\.revision/);
  assert.ok(
    filtered.statement.indexOf("entry_difficulty_reviews") <
      filtered.statement.indexOf("LIMIT 5"),
  );
});

test("difficulty SQL respects word-building target language and uses parameterized level values", () => {
  const query = languagePoolQuery(
    "word-builder",
    ["tr"],
    "SELECT * FROM content_entries ORDER BY random() LIMIT 4",
    [],
    "advanced",
  );
  assert.match(query.statement, /challenge->>'targetLanguage'=ANY/);
  assert.deepEqual(query.params, [["tr"], "advanced"]);
  assert.ok(!query.statement.includes("r.level='advanced'"));
  assert.deepEqual(
    languagePoolQuery("word-chain", undefined, "SELECT 1", [], "advanced"),
    { statement: "SELECT 1", params: [] },
  );
});
