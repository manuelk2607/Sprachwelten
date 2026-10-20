import test from "node:test";
import assert from "node:assert/strict";
import { entryInput, type Entry } from "../lib/content";
import { act, createGame, viewGame } from "../lib/game";
import { entryPreview } from "../lib/content-public";

const player = () => ({
  id: crypto.randomUUID(),
  name: "QA",
  tokenHash: "fixture",
  score: 0,
});
const input = (n: number) => ({
  kind: "attribution",
  phrase: "Eine kurze Liedstelle " + n,
  language: "de",
  hint: "Ein Hinweis " + n,
  sourceLocale: "de",
  translation: { hint: "A clue " + n },
  translationReviewed: true,
  challenge: {
    type: "attribution",
    category: "song",
    answer: "Lied " + n,
    artist: "Interpret " + n,
    album: "Album " + n,
    alternatives: ["Anderes Lied A", "Anderes Lied B", "Anderes Lied C"],
  },
});
const songEntries: Entry[] = [0, 1, 2].map((n) => ({
  ...entryInput.parse(input(n)),
  translations: { en: { hint: "A clue " + n, origin: "contributor" } },
  id: crypto.randomUUID(),
  status: "community",
  authorName: "",
  createdAt: new Date().toISOString(),
}));

test("song albums are optional and bounded; bilingual song hints still require review", () => {
  const original = input(0);
  const trimmed = entryInput.parse({
    ...original,
    challenge: { ...original.challenge, album: "  Album 0  " },
  }).challenge;
  assert.ok(trimmed?.type === "attribution");
  assert.equal(trimmed.album, "Album 0");
  const legacy = entryInput.parse({
    ...original,
    challenge: { ...original.challenge, album: undefined },
  });
  assert.equal(
    legacy.challenge?.type === "attribution" && legacy.challenge.album,
    undefined,
  );
  for (const album of ["a".repeat(161), 42, null])
    assert.equal(
      entryInput.safeParse({
        ...original,
        challenge: { ...original.challenge, album },
      }).success,
      false,
    );
  assert.equal(
    entryInput.safeParse({ ...original, translationReviewed: false }).success,
    false,
  );
  assert.equal(
    entryInput.safeParse({ ...original, hint: "a".repeat(301) }).success,
    false,
  );
});

test("song helpers expose only the current voting card and preserve translated hints", () => {
  for (const locale of ["de", "en"] as const) {
    const game = createGame("SONGSX", player(), locale, "who-said-it");
    game.totalRounds = 2;
    assert.equal(viewGame(game, game.hostId).songHelp, null);
    act(game, game.hostId, { action: "start" }, songEntries);
    const view = viewGame(game, game.hostId),
      current = game.round!.entry,
      challenge = current.challenge;
    assert.ok(challenge?.type === "attribution");
    assert.equal(view.songHelp?.album, challenge.album);
    assert.equal(view.songHelp?.artist, "");
    assert.match(view.hint!.text, locale === "de" ? /^Ein Hinweis/ : /^A clue/);
    assert.equal(view.revelation, null);
    assert.ok(
      view.options.every(
        (o) =>
          !("correct" in o) &&
          !("solution" in o) &&
          !o.text.includes("Interpret"),
      ),
    );
    assert.ok(
      !JSON.stringify(view).includes(
        (game.prompts[1].challenge as typeof challenge).album!,
      ),
    );
    assert.ok(!("hint" in entryPreview(current)));
    assert.ok(!("challenge" in entryPreview(current)));
    const firstAlbum = view.songHelp?.album;
    act(game, game.hostId, {
      action: "vote",
      optionId: game.round!.options.find((o) => o.solution)!.id,
    });
    assert.equal(game.players[0].score, 1);
    assert.equal(viewGame(game, game.hostId).songHelp, null);
    assert.equal(viewGame(game, game.hostId).hint, null);
    act(game, game.hostId, { action: "next" });
    assert.notEqual(viewGame(game, game.hostId).songHelp?.album, firstAlbum);
  }
});

test("legacy songs fall back to their artist without inventing an album", () => {
  const entries = songEntries.map((e) => ({
    ...e,
    hint: "",
    translations: {},
    challenge:
      e.challenge?.type === "attribution"
        ? { ...e.challenge, album: undefined }
        : e.challenge,
  }));
  const game = createGame("SONGSY", player(), "de", "who-said-it");
  act(game, game.hostId, { action: "start" }, entries);
  const c = game.round!.entry.challenge;
  assert.ok(c?.type === "attribution");
  assert.equal(viewGame(game, game.hostId).hint, null);
  assert.deepEqual(viewGame(game, game.hostId).songHelp, {
    album: "",
    artist: c.artist,
  });
});

test("person quotes and non-voting phases never disclose song helpers", () => {
  const game = createGame("SONGSZ", player(), "de", "who-said-it");
  act(game, game.hostId, { action: "start" }, songEntries);
  for (const phase of ["lobby", "writing", "reveal", "finished"] as const) {
    game.phase = phase;
    assert.equal(viewGame(game, game.hostId).songHelp, null);
    assert.equal(viewGame(game, game.hostId).hint, null);
  }
  game.phase = "voting";
  const c = game.round!.entry.challenge;
  assert.ok(c?.type === "attribution");
  c.category = "person";
  assert.equal(viewGame(game, game.hostId).songHelp, null);
  assert.equal(viewGame(game, game.hostId).hint, null);
});
