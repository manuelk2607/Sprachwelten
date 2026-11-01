import assert from "node:assert/strict";
import test from "node:test";
import { entryInput } from "../lib/content";
import {
  learningChallenge,
  gradeLearning,
  scheduleLearning,
  learningPrompt,
} from "../lib/learning-content";
import { learningSeeds } from "../lib/learning-seeds";
import {
  gameLanguagesInput,
  matchesGameLanguages,
} from "../lib/game-languages";
import { languagePoolQuery } from "../db/game-language-pool";
import { createGame, act, viewGame } from "../lib/game";
import { playablePrompts, poolKey } from "../lib/game-pool";
import { extraSeeds } from "../lib/extra-seeds";
import { newGameEntries } from "../lib/new-game-seeds";
test('legacy gap translations retain a visible authored gap and grading preserves target-language case distinctions',()=>{
  const q=learningChallenge.parse(learningSeeds[0].challenge).questions[0];
  assert.equal(learningPrompt({...q,exercise:'gap',prompt:{de:'Ich ___ hier.',en:'Fill in the missing verb.'}},'en'),'Ich ___ hier.');
  assert.equal(learningPrompt({...q,exercise:'writing',prompt:{de:'Schreibe.',en:'Write.'}},'en'),'Write.');
  assert.equal(gradeLearning({...q,answerLanguage:'tr',answers:['ışık']},'IŞIK'),true);
  assert.equal(gradeLearning({...q,answerLanguage:'tr',answers:['ışık']},'İŞİK'),false);
});
test("all learning starter cards have valid structured tasks and no unreviewed generated translations", () => {
  assert.equal(learningSeeds.length, 22);
  for (const entry of learningSeeds) {
    assert.ok(
      entryInput.safeParse(entry).success,
      JSON.stringify(entryInput.safeParse(entry)),
    );
    assert.ok(learningChallenge.safeParse(entry.challenge).success);
    assert.ok(entry.sourceUrl.startsWith("https://"));
  }
});
test("learning validates grammar, vocabulary, distinct choice sets and explicit correct answers", () => {
  const entry = learningSeeds[0],
    challenge = learningChallenge.parse(entry.challenge);
  assert.equal(
    entryInput.safeParse({
      ...entry,
      kind: "grammar",
      meaning: "Rule",
      challenge,
    }).success,
    false,
  );
  assert.equal(entryInput.safeParse({ ...entry, literal: "" }).success, false);
  const question = challenge.questions[0];
  assert.equal(
    learningChallenge.safeParse({
      ...challenge,
      questions: [
        { ...question, exercise: "comprehension", choices: ["wrong", "wrong"] },
      ],
    }).success,
    false,
  );
  assert.equal(
    learningChallenge.safeParse({
      ...challenge,
      questions: [{ ...question, exercise: "gap" }],
    }).success,
    false,
  );
  assert.equal(
    learningChallenge.safeParse({
      ...challenge,
      questions: [question, question],
    }).success,
    false,
  );
});
test("answer checking preserves diacritics, non-Latin scripts and meaningful punctuation", () => {
  const question = learningChallenge.parse(learningSeeds[0].challenge)
    .questions[0];
  assert.equal(
    gradeLearning({ ...question, answers: ["café"] }, " CAFE\u0301 "),
    true,
  );
  assert.equal(
    gradeLearning({ ...question, answers: ["café"] }, "cafe"),
    false,
  );
  assert.equal(gradeLearning({ ...question, answers: ["猫"] }, "猫"), true);
  assert.equal(gradeLearning({ ...question, answers: ["C++"] }, "C"), false);
});
test('starter translations distinguish gender and accept common equivalent thanks',()=>{
  const thanks=learningSeeds.find(e=>e.language==='de'&&e.phrase==='danke')!;
  const question=learningChallenge.parse(thanks.challenge).questions[0];
  assert.equal(gradeLearning(question,'Vielen Dank'),true);assert.ok(!question.prompt.de.includes('Artikel'));
  const friend=learningSeeds.find(e=>e.language==='de'&&e.phrase==='der Freund')!;
  assert.match(learningChallenge.parse(friend.challenge).questions[0].prompt.en,/male person/);
});
test("spaced repetition grows predictable intervals and brings errors back without erasing history", () => {
  const now = Date.UTC(2026, 9, 26);
  let progress = scheduleLearning(undefined, true, now);
  assert.equal(Date.parse(progress.dueAt) - now, 86400000);
  progress = scheduleLearning(progress, true, now);
  assert.equal(Date.parse(progress.dueAt) - now, 3 * 86400000);
  progress = scheduleLearning(progress, false, now);
  assert.equal(progress.streak, 0);
  assert.equal(progress.lapses, 1);
  assert.equal(progress.attempts, 3);
  assert.equal(Date.parse(progress.dueAt) - now, 600000);
});
test("game language settings validate unique registered codes and filter both sides and target language", () => {
  assert.equal(gameLanguagesInput.safeParse([]).success, false);
  assert.equal(gameLanguagesInput.safeParse(["de", "de"]).success, false);
  assert.equal(gameLanguagesInput.safeParse(["invented"]).success, false);
  const entry = { ...learningSeeds[0], language: "en" };
  assert.equal(matchesGameLanguages("meaning-quiz", entry, ["de"]), false);
  assert.equal(
    matchesGameLanguages(
      "false-friends",
      {
        ...entry,
        challenge: {
          type: "friends",
          otherLanguage: "de",
          otherWord: "Gift",
          sameMeaning: false,
          firstMeaning: { de: "", en: "present" },
          secondMeaning: { de: "", en: "poison" },
          context: { de: "", en: "noun" },
        },
      },
      ["en"],
    ),
    false,
  );
  const order = newGameEntries.find((e) => e.challenge?.type === "order")!;
  assert.ok(order);
  assert.equal(
    matchesGameLanguages("word-builder", order, [
      order.challenge!.type === "order" ? order.challenge!.targetLanguage : "",
    ]),
    true,
  );
});
test("language filtering occurs before SQL sampling and is bound, including both false-friend languages", () => {
  const query = languagePoolQuery(
    "false-friends",
    ["de", "en"],
    "SELECT * FROM content_entries WHERE kind=$1 LIMIT 2",
    ["false_friend"],
  );
  assert.match(query.statement, /WITH content_entries AS/);
  assert.match(query.statement, /otherLanguage.*ANY\(\$2::text\[\]\)/);
  assert.deepEqual(query.params, ["false_friend", ["de", "en"]]);
  assert.match(
    languagePoolQuery(
      "word-builder",
      ["en"],
      "SELECT * FROM content_entries LIMIT 2",
      [],
    ).statement,
    /targetLanguage/,
  );
});
test("language selection is host-controlled, projected to peers and included in pool identity", () => {
  const host = {
      id: crypto.randomUUID(),
      name: "QA",
      tokenHash: "hash",
      score: 0,
    },
    game = createGame("ABC234", host, "de", "meaning-quiz");
  assert.throws(() =>
    act(game, "foreign", { action: "configure", gameLanguages: ["en"] }),
  );
  act(game, host.id, { action: "configure", gameLanguages: ["en"] });
  assert.deepEqual(viewGame(game, host.id).gameLanguages, ["en"]);
  assert.notEqual(poolKey(game), poolKey({ ...game, gameLanguages: ["de"] }));
  const english = {
      ...extraSeeds.find((e) => e.kind === "tongue_twister")!,
      language: "en",
    },
    german = { ...english, id: crypto.randomUUID(), language: "de" };
  assert.deepEqual(
    playablePrompts(
      {
        ...game,
        mode: "tongue-twisters",
        pronunciationLanguage: "de",
        gameLanguages: ["en"],
      },
      [english, german],
    ).map((e) => e.language),
    ["en"],
  );
  assert.throws(() =>
    act(game, host.id, {
      action: "configure",
      mode: "language-quiz",
      gameLanguages: ["en"],
    }),
  );
  act(game, host.id, { action: "configure", mode: "word-chain" });
  assert.equal(
    game.gameLanguages,
    undefined,
    "Changing game must clear the previous filter, including persisted own properties.",
  );
});
