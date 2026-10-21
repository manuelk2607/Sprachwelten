import { z } from "zod";
export const qualityFilter = z.enum([
  "all",
  "missing-hint",
  "missing-album",
  "missing-translation",
]);
export type QualityFilter = z.infer<typeof qualityFilter>;
export const qualityLabels: Record<QualityFilter, string> = {
  all: "Alle Qualitätsstände",
  "missing-hint": "Tipp fehlt",
  "missing-album": "Album fehlt",
  "missing-translation": "Gespeicherte Übersetzung fehlt",
};
export function qualityPredicate(value: QualityFilter) {
  if (value === "missing-hint")
    return `(kind IN ('idiom','dialect') OR (kind='attribution' AND challenge->>'category'='song')) AND btrim(hint)=''`;
  if (value === "missing-album")
    return `kind='attribution' AND challenge->>'category'='song' AND btrim(coalesce(challenge->>'album',''))=''`;
  if (value === "missing-translation")
    return `(${["literal", "meaning", "example", "cultural_note", "hint"].map((column, i) => `(btrim(${column})<>'' AND btrim(coalesce(translations->(CASE WHEN source_locale='en' THEN 'de' ELSE 'en' END)->>'${["literal", "meaning", "example", "culturalNote", "hint"][i]}',''))='')`).join(" OR ")} OR jsonb_path_exists(coalesce(challenge,'{}'::jsonb),'$.** ? (exists(@.de) && exists(@.en) && (@.de == "" || @.en == ""))'))`;
  return "TRUE";
}
