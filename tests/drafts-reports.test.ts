import test from "node:test";
import assert from "node:assert/strict";
import {
  draftKey,
  parseDraft,
  draftChallenge,
  type ContributionDraft,
} from "../lib/contribution-draft";
import { initialChallenge } from "../components/challenge-editor";
import { textsOf } from "../lib/content-translations";
import { reportInput, reportedRound } from "../lib/round-reports";
import { createGame, act } from "../lib/game";
import { seedEntries } from "../lib/seeds";
const draft: ContributionDraft = {
  version: 1,
  updatedAt: Date.now(),
  kind: "idiom",
  phrase: "Unfertig",
  sense: "",
  language: "de",
  regionId: "",
  contextId: "",
  sourceLocale: "de",
  translation: textsOf({}),
  reviewed: false,
  media: { text: true, audio: false },
  fields: { hint: "Ein Tipp" },
  challenge: {
    type: "meaning",
    choices: [
      { de: "", en: "" },
      { de: "", en: "" },
      { de: "", en: "" },
      { de: "", en: "" },
    ],
    correctIndex: 0,
  },
};
test("draft parsing bounds storage, expires old data and separates account identities", () => {
  assert.equal(parseDraft(JSON.stringify(draft))?.phrase, "Unfertig");
  for (const raw of [
    "{",
    JSON.stringify({ ...draft, updatedAt: 0 }),
    JSON.stringify({ ...draft, fields: { x: 42 } }),
    " ".repeat(32001),
  ])
    assert.equal(parseDraft(raw), null);
  assert.notEqual(draftKey("guest"), draftKey("account"));
});
test("incomplete drafts retain useful answer text while corrupted structures fall back safely", () => {
  assert.deepEqual(
    draftChallenge(draft.challenge, initialChallenge("idiom")),
    draft.challenge,
  );
  const fallback = initialChallenge("idiom");
  assert.equal(
    draftChallenge(
      { type: "meaning", choices: [42], correctIndex: 0 },
      fallback,
    ),
    fallback,
  );
  assert.equal(
    draftChallenge(
      { type: "taboo", forbidden: [1, 2] },
      initialChallenge("taboo"),
    )?.type,
    "taboo",
  );
});
test("round reports are bounded, membership-scoped, current and available after final reveal", () => {
  const p = {
      id: crypto.randomUUID(),
      name: "QA",
      score: 0,
      tokenHash: "hash",
    },
    g = createGame("REPORT", p, "de", "meaning-quiz");
  g.totalRounds = 1;
  act(g, p.id, { action: "start" }, seedEntries);
  const input = {
    matchId: g.matchId!,
    roundNumber: 1,
    reason: "answer" as const,
    note: "",
  };
  assert.throws(() => reportedRound(g, "hash", input));
  act(g, p.id, {
    action: "vote",
    optionId: g.round!.options.find((o) => o.solution)!.id,
  });
  const first = reportedRound(g, "hash", input);
  assert.throws(() => reportedRound(g, "other", input), /Teil/);
  assert.throws(
    () => reportedRound(g, "hash", { ...input, matchId: crypto.randomUUID() }),
    /aktuell/,
  );
  act(g, p.id, { action: "next" });
  assert.equal(reportedRound(g, "hash", input).key, first.key);
  assert.equal(
    reportInput.safeParse({ ...input, entryId: crypto.randomUUID() }).success,
    false,
  );
  assert.equal(
    reportInput.safeParse({ ...input, note: "x".repeat(1001) }).success,
    false,
  );
});
