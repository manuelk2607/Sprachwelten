import { z } from "zod";
import { isRegisteredLanguage } from "./language-codes";
import type { Entry } from "./content";
export const gameLanguagesInput = z
  .array(z.string().trim().max(30).refine(isRegisteredLanguage))
  .min(1)
  .max(64)
  .refine(
    (v) => new Set(v).size === v.length,
    "Bitte jede Sprache nur einmal auswählen.",
  );
export function matchesGameLanguages(
  mode: string | undefined,
  entry: Entry,
  selection?: string[],
) {
  if (!selection) return true;
  if (mode === "word-builder")
    return (
      entry.challenge?.type === "order" &&
      selection.includes(entry.challenge.targetLanguage)
    );
  if (!selection.includes(entry.language)) return false;
  return (
    mode !== "false-friends" ||
    (entry.challenge?.type === "friends" &&
      selection.includes(entry.challenge.otherLanguage))
  );
}
