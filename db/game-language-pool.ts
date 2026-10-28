import type { PlayableGameMode } from "@/lib/modes";
export function languagePoolQuery(
  mode: PlayableGameMode,
  selection: string[] | undefined,
  statement: string,
  params: unknown[],
  difficulty?: string,
) {
  if (mode === "word-chain" || (!selection && !difficulty))
    return { statement, params };
  const values = [...params],
    conditions: string[] = [];
  if (selection) {
    values.push(selection);
    const bind = "$" + values.length + "::text[]";
    conditions.push(
      `${mode === "word-builder" ? "challenge->>'targetLanguage'" : "language"}=ANY(${bind})`,
    );
    if (mode === "false-friends")
      conditions.push(`challenge->>'otherLanguage'=ANY(${bind})`);
  }
  if (difficulty) {
    values.push(difficulty);
    conditions.push(
      `EXISTS(SELECT 1 FROM public.entry_difficulty_reviews r WHERE r.entry_id=e.id AND r.content_revision=e.revision AND r.reviewed AND r.reviewed_at<=CURRENT_DATE AND r.level=$${values.length})`,
    );
  }
  return {
    statement: `WITH content_entries AS (SELECT e.* FROM public.content_entries e WHERE ${conditions.join(" AND ")}) ${statement}`,
    params: values,
  };
}
