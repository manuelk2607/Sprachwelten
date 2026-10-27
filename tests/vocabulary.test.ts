import test from "node:test";
import assert from "node:assert/strict";
import { entryInput, learningEntryInput } from "../lib/content";
import {
  vocabularyDirection,
  vocabularyQuestion,
  languagePairInput,
  notebookInput,
} from "../lib/vocabulary";
import { gradeLearning } from "../lib/learning-content";
import type { Entry } from "../lib/content";
import { canonicalLearningSeeds } from "../lib/learning-seeds";
const input = {
  kind: "vocabulary",
  language: "fr",
  phrase: "chat",
  literal: "cat",
  meaning: "An animal.",
  example: "Le chat dort.",
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
      termAlternatives: ["le chat"],
      translationAlternatives: ["a cat"],
    },
  },
};
const entry = {
  ...entryInput.parse(input),
  id: crypto.randomUUID(),
  revision: 0,
  status: "community",
  authorName: "Private",
  createdAt: new Date().toISOString(),
} as Entry;
test("vocabulary contributions require explicit different languages while old materials remain editable", () => {
  assert.equal(learningEntryInput.safeParse(input).success, true);
  assert.equal(
    languagePairInput.safeParse({ sourceLanguage: "en", targetLanguage: "en" })
      .success,
    false,
  );
  assert.equal(
    notebookInput.safeParse({
      name: " ",
      sourceLanguage: "fr",
      targetLanguage: "en",
    }).success,
    false,
  );
  assert.equal(
    learningEntryInput.safeParse({
      ...input,
      challenge: {
        ...input.challenge,
        vocabulary: {
          ...input.challenge.vocabulary,
          translationLanguage: "fr",
        },
      },
    }).success,
    false,
  );
  const old = {
    ...input,
    challenge: {
      ...input.challenge,
      vocabulary: undefined,
      questions: [
        {
          id: "old",
          exercise: "writing",
          prompt: { de: "Alt", en: "" },
          answers: ["chat"],
          choices: [],
          explanation: { de: "Eine Katze", en: "" },
        },
      ],
    },
  };
  assert.equal(entryInput.safeParse(old).success, true);
  assert.equal(learningEntryInput.safeParse(old).success, false);
});
test("directions use explicit pair fields rather than UI locale and never reverse unapproved meanings", () => {
  const card = vocabularyDirection(entry, "en", "fr")!;
  assert.equal(card.source, "cat");
  assert.equal(card.target, "chat");
  assert.deepEqual(card.answers, ["chat", "le chat"]);
  assert.equal(vocabularyDirection(entry, "fr", "en"), null);
  assert.equal(vocabularyDirection(entry, "de", "fr"), null);
  const reversed = vocabularyDirection(
    {
      ...entry,
      challenge: {
        ...entry.challenge!,
        type: "learning",
        domain: "vocabulary",
        topic: { de: "Tiere", en: "Animals" },
        level: "A1",
        questions: [],
        vocabulary: { ...input.challenge.vocabulary, reversible: true },
      },
    },
    "fr",
    "en",
  )!;
  assert.equal(reversed.source, "chat");
  assert.deepEqual(reversed.answers, ["cat", "a cat"]);
});
test("vocabulary grading respects Turkish case and preserves accents and script distinctions", () => {
  const question = vocabularyQuestion(vocabularyDirection(entry, "en", "fr")!);
  assert.equal(gradeLearning(question, "Le chat"), true);
  assert.equal(
    gradeLearning(
      { ...question, answerLanguage: "tr", answers: ["IŞIK"] },
      "ışık",
    ),
    true,
  );
  assert.equal(
    gradeLearning(
      { ...question, answerLanguage: "fr", answers: ["été"] },
      "ete",
    ),
    false,
  );
  assert.equal(
    gradeLearning({ ...question, answerLanguage: "ja", answers: ["猫"] }, "猫"),
    true,
  );
});
test("directional question keys stay bounded for registered language tags and share no reverse progress", () => {
  const q = vocabularyQuestion(vocabularyDirection(entry, "en", "fr")!);
  assert.equal(q.id, "vocab-fr");
  assert.equal(q.answerLanguage, "fr");
  assert.ok(!q.prompt.en.includes("chat"));
});
test("canonical seed pairs need no reverse copies and keep target-language examples", () => {
  assert.equal(canonicalLearningSeeds.length, 12);
  const apple = canonicalLearningSeeds.find((e) => e.phrase === "apple")!;
  assert.equal(
    vocabularyDirection(apple, "en", "de")?.example,
    "Ich esse einen Apfel.",
  );
  assert.equal(
    vocabularyDirection(apple, "de", "en")?.example,
    "I eat an apple.",
  );
});
