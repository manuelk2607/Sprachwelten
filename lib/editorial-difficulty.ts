/** Editorial readiness gate, deliberately not connected to a premature UI filter.
 * A level needs two full ten-round games per category/language before exposure.
 * No automatic classification by length, popularity or guessed familiarity.
 */
export const difficultyLevels = [
  "introductory",
  "intermediate",
  "advanced",
] as const;
export type DifficultyLevel = (typeof difficultyLevels)[number];
export type EditorialDifficulty = {
  entryId: string;
  category: string;
  language: string;
  level: DifficultyLevel;
  reviewed: boolean;
  reviewedAt: string;
  sources: string[];
  rationale: string;
};
export const minimumReviewedPerLevel = 20;
const validReviewDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date &&
  date <= new Date().toISOString().slice(0, 10);
export function readyDifficultyLevels(
  records: EditorialDifficulty[],
  category: string,
  language: string,
): DifficultyLevel[] {
  const current = new Map<string, EditorialDifficulty[]>();
  for (const record of records.filter(
    (r) => r.category === category && r.language === language,
  )) {
    const previous = current.get(record.entryId);
    if (!previous || record.reviewedAt > previous[0].reviewedAt)
      current.set(record.entryId, [record]);
    else if (record.reviewedAt === previous[0].reviewedAt)
      previous.push(record);
  }
  // A withdrawn or conflicting latest assessment cannot count as an older approval.
  const unique = [...current.values()]
    .filter((group) =>
      group.every((r) => r.reviewed && r.level === group[0].level),
    )
    .map((group) => group[0]);
  return difficultyLevels.filter((level) => {
    const eligible = unique.filter(
      (record) =>
        record.level === level &&
        record.reviewed &&
        validReviewDate(record.reviewedAt) &&
        record.rationale.trim().length >= 20 &&
        record.sources.length > 0 &&
        record.sources.every((source) => {
          try {
            return new URL(source).protocol === "https:";
          } catch {
            return false;
          }
        }),
    );
    return (
      new Set(eligible.map((record) => record.entryId).filter(Boolean)).size >=
      minimumReviewedPerLevel
    );
  });
}
