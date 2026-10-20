/** Only paired **bold** spans are supported. Everything else stays literal text. */
export function parsePhraseMarkup(value: string) {
  const parts: { text: string; bold: boolean }[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > offset)
      parts.push({ text: value.slice(offset, match.index), bold: false });
    parts.push({ text: match[1], bold: true });
    offset = match.index + match[0].length;
  }
  if (offset < value.length)
    parts.push({ text: value.slice(offset), bold: false });
  return {
    parts,
    plain: parts.map((part) => part.text).join(""),
    formatted: parts.some((part) => part.bold),
  };
}

/** Keep identity/search text separate from its optional presentation. */
export function phraseInput(value: string, kind: string) {
  const markup = value.trim();
  const parsed = parsePhraseMarkup(markup);
  return kind === "idiom" && parsed.formatted
    ? { phrase: parsed.plain.trim(), phraseMarkup: markup }
    : { phrase: markup, phraseMarkup: "" };
}
