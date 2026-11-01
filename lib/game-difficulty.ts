export type DifficultySettings = {
  gameLanguages?: string[];
  meaningCategory?: string;
  pronunciationCategory?: string;
  attributionCategory?: string;
};
export function difficultyGroups(
  mode: string,
  settings: DifficultySettings,
): string[] {
  if (mode === "word-chain" || mode === "false-friends") return [];
  if (mode === "meaning-quiz")
    return settings.meaningCategory === "expression"
      ? ["idiom", "dialect"]
      : settings.meaningCategory === "gaming"
        ? ["gaming_mission"]
        : settings.meaningCategory === "youth"
          ? ["youth_chat"]
          : settings.meaningCategory === "academic"
            ? ["academic"]
            : ["idiom", "dialect", "gaming_mission", "youth_chat", "academic"];
  if (mode === "tongue-twisters")
    return settings.pronunciationCategory === "twister"
      ? ["tongue_twister"]
      : settings.pronunciationCategory === "sound"
        ? ["sound_pair"]
        : ["tongue_twister", "sound_pair"];
  if (mode === "who-said-it")
    return settings.attributionCategory === "person"
      ? ["attribution:person"]
      : settings.attributionCategory === "song"
        ? ["attribution:song"]
        : ["attribution:person", "attribution:song"];
  const kinds: Record<string, string> = {
    "language-quiz": "word",
    "dialect-detective": "dialect",
    "everyday-language": "situation",
    "loanword-quiz": "loanword",
    "word-outsider": "word_group",
    taboo: "taboo",
    "word-builder": "word_order",
    "joke-quiz": "joke",
  };
  return kinds[mode] ? [kinds[mode]] : [];
}
export const difficultyScopeChanged = (input: Record<string, unknown>) =>
  [
    "mode",
    "gameLanguages",
    "meaningCategory",
    "pronunciationCategory",
    "pronunciationLanguage",
    "attributionCategory",
    "tabooLanguages",
    "sentenceLanguage",
  ].some((key) => input[key] !== undefined);
