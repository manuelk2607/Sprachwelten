import { parsePhraseMarkup } from "@/lib/phrase-markup";

export function PhraseText({
  entry,
}: {
  entry: { phrase: string; phraseMarkup?: string; kind?: string };
}) {
  const parsed = entry.phraseMarkup
    ? parsePhraseMarkup(entry.phraseMarkup)
    : null;
  if (
    !parsed ||
    parsed.plain.trim() !== entry.phrase ||
    (entry.kind && entry.kind !== "idiom")
  )
    return entry.phrase;
  return parsed.parts.map((part, index) =>
    part.bold ? <strong key={index}>{part.text}</strong> : part.text,
  );
}
