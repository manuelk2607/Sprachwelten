import { z } from "zod";
import { contentKinds } from "./content";
import { challengeSchema, type Challenge } from "./challenges";
import { translationFields } from "./content-translations";
export const draftFieldNames = [
  "literal",
  "hint",
  "meaning",
  "example",
  "culturalNote",
  "sourceUrl",
  "creditName",
  "region",
  "context",
] as const;
const schema = z.object({
  version: z.literal(1),
  updatedAt: z.number(),
  kind: z.enum(contentKinds),
  phrase: z.string().max(1500),
  sense: z.string().max(160),
  language: z.string().max(30),
  regionId: z.string().max(40),
  contextId: z.string().max(40),
  sourceLocale: z.enum(["de", "en"]),
  translation: translationFields,
  reviewed: z.boolean(),
  media: z.object({ text: z.boolean(), audio: z.boolean() }),
  fields: z.record(z.string(), z.string().max(1500)),
  challenge: z.unknown().optional(),
});
export type ContributionDraft = z.infer<typeof schema>;
export const draftKey = (owner: string) =>
  "sprachwelten-contribution-draft:v1:" + owner;
export function parseDraft(
  raw: string | null,
  now = Date.now(),
): ContributionDraft | null {
  if (!raw || raw.length > 32000) return null;
  try {
    const data = schema.safeParse(JSON.parse(raw));
    return data.success &&
      data.data.updatedAt <= now + 60000 &&
      now - data.data.updatedAt < 30 * 86400000
      ? data.data
      : null;
  } catch {
    return null;
  }
}
export function draftChallenge(
  raw: unknown,
  fallback: Challenge | undefined,
): Challenge | undefined {
  if (!fallback || !raw || typeof raw !== "object" || Array.isArray(raw))
    return fallback;
  const merged = { ...fallback, ...raw },
    parsed = challengeSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  // Preserve unfinished strings, but reject corrupted structures and fixed-size arrays.
  if (
    parsed.error.issues.every(
      (issue) =>
        issue.code === "custom" ||
        (issue.code === "too_small" &&
          (issue.origin === "string" ||
            (issue.origin === "array" &&
              ["tiles", "accepted", "alternatives"].includes(
                String(issue.path.at(-1)),
              )))),
    )
  )
    return merged as Challenge;
  return fallback;
}
