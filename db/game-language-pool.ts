import type { PlayableGameMode } from "@/lib/modes";
export function languagePoolQuery(
  mode: PlayableGameMode,
  selection: string[] | undefined,
  statement: string,
  params: unknown[],
) {
  if (!selection || mode === "word-chain") return { statement, params };
  const field =
      mode === "word-builder" ? "challenge->>'targetLanguage'" : "language",
    parameter = "$" + (params.length + 1) + "::text[]";
  return {
    statement: `WITH content_entries AS (SELECT * FROM public.content_entries WHERE ${field}=ANY(${parameter}) ${mode === "false-friends" ? `AND challenge->>'otherLanguage'=ANY(${parameter})` : ""}) ${statement}`,
    params: [...params, selection],
  };
}
