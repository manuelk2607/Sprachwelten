import { z } from "zod";
import { isRegisteredLanguage } from "./language-codes";
import type { Entry } from "./content";
import type { LearningQuestion } from "./learning-content";
const language = z
  .string()
  .trim()
  .max(30)
  .refine(
    isRegisteredLanguage,
    "Bitte eine Sprache aus dem geprüften Register wählen.",
  );
export const vocabularyPair = z.object({
  translationExample: z.string().trim().max(600).optional(),
  translationLanguage: language,
  translationAlternatives: z
    .array(z.string().trim().min(1).max(300))
    .max(7)
    .default([]),
  termAlternatives: z
    .array(z.string().trim().min(1).max(180))
    .max(7)
    .default([]),
  reversible: z.boolean().default(false),
  context: z
    .object({ de: z.string().trim().max(600), en: z.string().trim().max(600) })
    .default({ de: "", en: "" }),
});
export type VocabularyPair = z.infer<typeof vocabularyPair>;
export const languagePairInput = z
  .object({ sourceLanguage: language, targetLanguage: language })
  .refine(
    (v) => v.sourceLanguage !== v.targetLanguage,
    "Ausgangs- und Zielsprache müssen verschieden sein.",
  );
export const notebookInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(600).default(""),
    sourceLanguage: language,
    targetLanguage: language,
  })
  .refine(
    (v) => v.sourceLanguage !== v.targetLanguage,
    "Ausgangs- und Zielsprache müssen verschieden sein.",
  );
export type NotebookInput = z.infer<typeof notebookInput>;
export type Notebook = NotebookInput & {
  id: string;
  revision: number;
  count: number;
  due: number;
  difficult: number;
  practiced: number;
  attempts: number;
  mistakes: number;
};
export type VocabularyCard = {
  sourceUrl?:string;creditName?:string;contentStatus?:'curated'|'community';
  feedback?: { de: string; en: string };
  id: string;
  revision: number;
  source: string;
  target: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceAlternatives: string[];
  answers: string[];
  reversible: boolean;
  context: { de: string; en: string };
  topic: { de: string; en: string };
  level: string;
  sense: string;
  example: string;
  meaning: string;
  streak: number;
  lapses: number;
  attempts: number;
  dueAt: string | null;
  status: "new" | "due" | "learning" | "known";
  audioId?: string;
};
export function vocabularyDirection(
  entry: Entry,
  source: string,
  target: string,
): VocabularyCard | null {
  const c = entry.challenge;
  if (entry.kind !== "vocabulary" || c?.type !== "learning" || !c.vocabulary)
    return null;
  const p = c.vocabulary,
    forward = source === p.translationLanguage && target === entry.language,
    reverse =
      p.reversible &&
      source === entry.language &&
      target === p.translationLanguage;
  if (!forward && !reverse) return null;
  return {
    id: entry.id,
    sourceUrl:entry.sourceUrl,creditName:entry.creditName,contentStatus:entry.status,
    revision: entry.revision ?? 1,
    source: forward ? entry.literal : entry.phrase,
    target: forward ? entry.phrase : entry.literal,
    sourceLanguage: source,
    targetLanguage: target,
    sourceAlternatives: forward
      ? p.translationAlternatives
      : p.termAlternatives,
    answers: forward
      ? [entry.phrase, ...p.termAlternatives]
      : [entry.literal, ...p.translationAlternatives],
    reversible: p.reversible,
    context: p.context,
    topic: c.topic,
    level: c.level,
    sense: entry.sense ?? "",
    example: forward ? entry.example : (p.translationExample ?? ""),
    meaning: entry.meaning,
    streak: 0,
    lapses: 0,
    attempts: 0,
    dueAt: null,
    status: "new",
    ...(forward && entry.audioId ? { audioId: entry.audioId } : {}),
  };
}
export const vocabularyQuestionId = (_source: string, target: string) =>
  "vocab-" + target;
export function vocabularyQuestion(card: VocabularyCard): LearningQuestion {
  const context = card.context,
    article =
      card.targetLanguage === "de" && /^(der|die|das) /u.test(card.target);
  return {
    id: vocabularyQuestionId(card.sourceLanguage, card.targetLanguage),
    exercise: "writing",
    answerLanguage: card.targetLanguage,
    prompt: {
      de: `Übersetze: „${card.source}“.${article ? " Gib den bestimmten Artikel mit an." : ""}${card.sense ? " Bedeutung: " + card.sense + "." : ""}${context.de ? " " + context.de : ""}`,
      en: `Translate: “${card.source}”.${article ? " Include the definite article." : ""}${card.sense ? " Sense: " + card.sense + "." : ""}${context.en ? " " + context.en : ""}`,
    },
    answers: card.answers,
    choices: [],
    explanation: {
      de: `${card.source} → ${card.target}.${card.sense ? " (" + card.sense + ")" : ""} ${card.feedback?.de ?? [card.meaning, card.example].filter(Boolean).join(" ")}`,
      en: `${card.source} → ${card.target}.${card.sense ? " (" + card.sense + ")" : ""} ${card.feedback?.en ?? [card.meaning, card.example].filter(Boolean).join(" ")}`,
    },
  };
}
