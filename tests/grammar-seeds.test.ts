import { test } from "node:test";
import assert from "node:assert/strict";
import { additionalGrammarSeeds } from "../lib/grammar-seeds";
import { entryInput } from "../lib/content";
import {
  gradeLearning,
  learningChallenge,
  learningPrompt,
} from "../lib/learning-content";
test("additional grammar modules have sourced bilingual rules, explicit target languages and unambiguous authored exercises", () => {
  assert.equal(additionalGrammarSeeds.length, 2);
  for (const entry of additionalGrammarSeeds) {
    entryInput.parse(entry);
    assert.ok(entry.translations?.en?.meaning);
    assert.ok(entry.sourceUrl.startsWith("https://"));
    const challenge = learningChallenge.parse(entry.challenge);
    assert.equal(challenge.questions.length, 4);
    for (const q of challenge.questions) {
      assert.equal(q.answerLanguage, entry.language);
      for (const a of q.answers) assert.equal(gradeLearning(q, a), true);
      assert.equal(gradeLearning(q, "not a valid answer"), false);
      for (const locale of ["de", "en"] as const) {
        assert.ok(q.explanation[locale]);
        if (q.exercise === "gap")
          assert.ok(learningPrompt(q, locale).includes("___"));
      }
      if (q.choices.length)
        assert.equal(q.choices.filter((c) => gradeLearning(q, c)).length, 1);
    }
  }
});
