import { z } from "zod";
import { difficultyLevels, validReviewDate } from "./editorial-difficulty";
export const editorialReviewInput = z.object({
  entryRevision: z.number().int().min(0),
  reviewRevision: z.number().int().min(0),
  level: z.enum(difficultyLevels),
  reviewed: z.boolean(),
  reviewedAt: z
    .string()
    .refine(
      validReviewDate,
      "Bitte ein gültiges Prüfdatum ohne zukünftiges Datum angeben.",
    ),
  sources: z
    .array(
      z
        .string()
        .trim()
        .max(500)
        .url()
        .refine((source) => {
          try {
            const url = new URL(source);
            return url.protocol === "https:" && !url.username && !url.password;
          } catch {
            return false;
          }
        }, "Quellen müssen öffentliche HTTPS-Adressen ohne Zugangsdaten sein."),
    )
    .min(1)
    .max(8)
    .refine(
      (sources) => new Set(sources).size === sources.length,
      "Bitte jede Quelle nur einmal angeben.",
    ),
  rationale: z
    .string()
    .trim()
    .min(20, "Bitte die Einstufung mit mindestens 20 Zeichen begründen.")
    .max(1500),
});
export type EditorialReviewInput = z.infer<typeof editorialReviewInput>;
export type StoredEditorialReview = Omit<
  EditorialReviewInput,
  "entryRevision"
> & { contentRevision: number };
export const difficultyLabels = {
  introductory: "Einstieg",
  intermediate: "Mittel",
  advanced: "Fortgeschritten",
} as const;

export function editorialReviewStatus(
  revision: number,
  review: StoredEditorialReview | null,
) {
  if (!review) return "unreviewed" as const;
  if (review.contentRevision !== revision) return "outdated" as const;
  return review.reviewed ? ("approved" as const) : ("draft" as const);
}
export const editorialStatusLabels = {
  unreviewed: "Noch nicht redaktionell geprüft",
  outdated: "Erneute Prüfung erforderlich",
  approved: "Redaktionell geprüft",
  draft: "Einstufung ohne Freigabe",
} as const;
export const difficultyDescriptions = {
  introductory:
    "Einstieg: geläufige Bedeutung mit wenig zusätzlichem Kontextwissen.",
  intermediate:
    "Mittel: weniger geläufige Bedeutung oder zusätzlicher sprachlicher Kontext.",
  advanced:
    "Fortgeschritten: spezielles regionales oder kulturelles Wissen und feine Bedeutungsunterschiede.",
} as const;
