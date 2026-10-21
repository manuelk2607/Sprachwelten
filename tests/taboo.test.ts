import test from "node:test";
import assert from "node:assert/strict";
import { act, createGame, joinGame, viewGame } from "../lib/game";
import { entryInput, roomAction, type RoomAction } from "../lib/content";
import { tabooSeeds } from "../lib/taboo-seeds";
import { tabooFold, tabooTarget, tabooViolation } from "../lib/taboo-game";
import { poolKey, unseenPrompts, updateAvailability } from "../lib/game-pool";
const player = (n: number) => ({
  id: crypto.randomUUID(),
  name: "Player " + n,
  score: 0,
  tokenHash: "hash" + n,
});
function game() {
  const g = createGame("TABUXX", player(0), "de", "taboo");
  for (let n = 1; n < 4; n++) joinGame(g, player(n));
  g.totalRounds = 1;
  act(
    g,
    g.hostId,
    { action: "start" },
    tabooSeeds.filter((e) => e.language === "de").slice(0, 4),
  );
  return g;
}
function action(
  g: ReturnType<typeof game>,
  event: Extract<RoomAction, { action: "taboo" }>["event"],
  text?: string,
): RoomAction {
  return {
    action: "taboo",
    event,
    text,
    matchId: g.matchId!,
    roundNumber: g.roundIndex + 1,
    cardIndex: g.taboo!.cursor,
  };
}
test("Taboo cards validate in text and audio; language pools are explicit and sampled independently of UI locale", () => {
  for (const e of tabooSeeds) assert.ok(entryInput.safeParse(e).success);
  const audio = entryInput.parse({
    ...tabooSeeds[0],
    phrase: "",
    presentation: "audio",
    audioId: crypto.randomUUID(),
  });
  assert.equal(tabooTarget(audio), tabooSeeds[0].phrase);
  assert.equal(
    entryInput.safeParse({
      ...audio,
      challenge: {
        ...audio.challenge,
        forbidden: [tabooSeeds[0].phrase, "B", "C", "D", "E"],
      },
    }).success,
    false,
  );
  const incompleteAliases = entryInput.parse({
    ...tabooSeeds[0],
    challenge: { ...tabooSeeds[0].challenge, aliases: [" Schreibweise ", ""] },
  });
  assert.deepEqual(
    incompleteAliases.challenge?.type === "taboo"
      ? incompleteAliases.challenge.aliases
      : [],
    ["Schreibweise"],
  );
  const g = createGame("TABUXX", player(0), "de", "taboo");
  g.tabooLanguages = ["en"];
  updateAvailability(g, tabooSeeds);
  assert.equal(g.availableRounds, 12);
  assert.ok(unseenPrompts(g, tabooSeeds).every((e) => e.language === "en"));
  const key = poolKey(g);
  g.tabooLanguages = ["de", "en"];
  assert.notEqual(poolKey(g), key);
  g.tabooLanguages = ["it"];
  assert.equal(unseenPrompts(g, tabooSeeds).length, 0);
  assert.equal(
    roomAction.safeParse({ action: "configure", tabooLanguages: [] }).success,
    false,
  );
  assert.equal(
    roomAction.safeParse({ action: "configure", tabooLanguages: ["de", "de"] })
      .success,
    false,
  );
  assert.equal(
    roomAction.safeParse({
      action: "configure",
      tabooLanguages: ["nonsense-language"],
    }).success,
    false,
  );
});
test("only describer and opposing checker receive the answer, forbidden words or attached audio", () => {
  const g = game(),
    t = g.taboo!,
    target = g.round!.entry.phrase;
  g.round!.entry.audioId = crypto.randomUUID();
  g.round!.entry.presentation = "both";
  for (const p of g.players) {
    const view = viewGame(g, p.id),
      authorized = [t.describerId, t.judgeId].includes(p.id);
    assert.equal(!!view.taboo?.card, authorized);
    assert.equal(
      view.prompt?.audioId,
      authorized ? g.round!.entry.audioId : undefined,
    );
    if (!authorized) {
      assert.ok(!JSON.stringify(view).includes(target));
      assert.equal(view.prompt?.phrase, "");
      assert.equal(view.revelation, null);
    }
  }
  assert.ok(
    !JSON.stringify(viewGame(g, t.describerId)).includes(
      g.prompts.at(-1)!.phrase,
    ),
  );
});
test("free guesses, role checks, stale actions, penalties, equal turns and persistent non-repeat history", () => {
  const g = game(),
    t = g.taboo!,
    guesser = t.teams[0].find((id) => id !== t.describerId)!,
    stale = action(g, "guess", g.round!.entry.phrase);
  assert.throws(() => act(g, guesser, action(g, "start")), /erklärende/);
  act(g, t.describerId, action(g, "start"));
  assert.throws(
    () => act(g, t.judgeId, action(g, "guess", "irrelevant")),
    /Rateteam/,
  );
  assert.throws(
    () => act(g, t.describerId, action(g, "clue", g.round!.entry.phrase)),
    /verbotenes/,
  );
  act(g, guesser, action(g, "guess", g.round!.entry.phrase));
  assert.equal(t.scores[0], 1);
  assert.throws(() => act(g, guesser, stale), /aktuellen/);
  act(g, t.describerId, action(g, "skip"));
  assert.equal(g.phase, "reveal");
  assert.deepEqual(t.scores, [1, 1]);
  act(g, g.hostId, { action: "next" });
  assert.equal(g.roundIndex, 0);
  assert.equal(t.turn, 1);
  act(g, t.describerId, action(g, "start"));
  act(g, t.judgeId, action(g, "buzz"));
  act(g, t.describerId, action(g, "skip"));
  assert.equal(g.phase, "reveal");
  assert.deepEqual(t.scores, [3, 1]);
  act(g, g.hostId, { action: "next" });
  assert.equal(g.phase, "finished");
  assert.equal(g.playedPrompts!.length, 4);
  assert.equal(
    unseenPrompts(g, tabooSeeds.filter((e) => e.language === "de").slice(0, 4))
      .length,
    0,
  );
});
test("server time controls expiry and leaving cannot expose the card or stall a missing role", (ctx) => {
  ctx.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const g = game(),
    t = g.taboo!;
  act(g, t.describerId, action(g, "start"));
  assert.throws(() => act(g, t.judgeId, action(g, "timeout")), /läuft noch/);
  ctx.mock.timers.tick(60001);
  assert.throws(() => act(g, t.describerId, action(g, "skip")), /abgelaufen/);
  act(g, t.judgeId, action(g, "timeout"));
  assert.equal(g.phase, "reveal");
  assert.deepEqual(t.scores, [0, 0]);
  const other = game(),
    oldHost = other.hostId;
  act(other, oldHost, { action: "leave" });
  assert.notEqual(other.hostId, oldHost);
  assert.equal(other.phase, "lobby");
  assert.equal(viewGame(other, other.hostId).taboo, null);
});
test("normalization blocks aliases and inflections without revealing anything through public options", () => {
  assert.equal(tabooFold("FÜẞE"), "fusse");
  assert.equal(
    tabooViolation(
      "Bibliothek",
      ["Buch", "lesen", "leise", "Regal", "ausleihen"],
      "Ich lese Bücher in einem Regal.",
    ),
    true,
  );
  assert.equal(
    tabooViolation("Zug", ["Bahn", "Schienen"], "Wir fahren auf Schienen."),
    true,
  );
});
