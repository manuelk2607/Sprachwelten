import { z } from "zod";
import { isRegisteredLanguage } from "./language-codes";
export const learningFilter = z.object({
  language: z.string().max(30).refine(isRegisteredLanguage),
  domain: z.enum(["vocabulary", "grammar"]).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  topic: z.string().max(100).optional(),
});

export const learningLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const bilingual = z
  .object({ de: z.string().trim().max(600), en: z.string().trim().max(600) })
  .refine(
    (v) => !!(v.de || v.en),
    "Bitte mindestens eine Sprachfassung angeben.",
  );
export const learningQuestion = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    exercise: z.enum([
      "recall",
      "writing",
      "gap",
      "completion",
      "comprehension",
    ]),
    prompt: bilingual,
    answers: z.array(z.string().trim().min(1).max(300)).min(1).max(8),
    choices: z.array(z.string().trim().min(1).max(300)).max(4).default([]),
    explanation: bilingual,
  })
  .superRefine((v, c) => {
    const choices = v.choices.map(learningIdentity);
    if (
      choices.length &&
      (choices.length < 2 ||
        new Set(choices).size !== choices.length ||
        !v.answers.some((a) => choices.includes(learningIdentity(a))))
    )
      c.addIssue({
        code: "custom",
        path: ["choices"],
        message:
          "Antwortauswahl benötigt verschiedene Antworten und mindestens eine richtige Lösung.",
      });
    if (v.exercise === "comprehension" && choices.length < 2)
      c.addIssue({
        code: "custom",
        path: ["choices"],
        message: "Bitte mindestens zwei Antwortmöglichkeiten ergänzen.",
      });
    if (
      v.exercise === "gap" &&
      !Object.values(v.prompt).some((text) => text.includes("___"))
    )
      c.addIssue({
        code: "custom",
        path: ["prompt"],
        message: "Markiere die Lücke mit ___.",
      });
  });
export const learningChallenge = z
  .object({
    type: z.literal("learning"),
    domain: z.enum(["vocabulary", "grammar"]),
    topic: bilingual.refine(
      (v) => v.de.length <= 100 && v.en.length <= 100,
      "Das Thema darf höchstens 100 Zeichen je Sprache haben.",
    ),
    level: z.enum(learningLevels),
    questions: z.array(learningQuestion).min(1).max(8),
  })
  .refine(
    (v) => new Set(v.questions.map((q) => q.id)).size === v.questions.length,
    "Aufgaben benötigen eindeutige IDs.",
  );
export type LearningChallenge = z.infer<typeof learningChallenge>;
export type LearningQuestion = z.infer<typeof learningQuestion>;
// Preserve diacritics, non-Latin scripts and meaningful punctuation. Alternatives
// must be authored explicitly rather than guessed from an unrelated language.
export function learningIdentity(text: string) {
  return text.normalize("NFC").toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}
export function gradeLearning(question: LearningQuestion, answer: string) {
  return question.answers.some(
    (value) => learningIdentity(value) === learningIdentity(answer),
  );
}
export type LearningState = {
  streak: number;
  lapses: number;
  attempts: number;
  dueAt: string;
};
export function scheduleLearning(
  previous: LearningState | undefined,
  correct: boolean,
  now = Date.now(),
): LearningState {
  const streak = correct ? Math.min((previous?.streak ?? 0) + 1, 8) : 0;
  const interval = correct
    ? [1, 3, 7, 14, 30, 60, 120, 180][streak - 1] * 86400000
    : 10 * 60000;
  return {
    streak,
    lapses: (previous?.lapses ?? 0) + (correct ? 0 : 1),
    attempts: (previous?.attempts ?? 0) + 1,
    dueAt: new Date(now + interval).toISOString(),
  };
}
export const learningText = (
  text: { de: string; en: string },
  locale: "de" | "en",
) => text[locale] || text[locale === "de" ? "en" : "de"];
