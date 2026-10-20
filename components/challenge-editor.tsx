"use client";
import { useI18n } from "@/lib/i18n";
import type { ContentKind } from "@/lib/content";
import { missionTiles, type Bilingual, type Challenge } from "@/lib/challenges";
import { AnswerTranslationProvider, BilingualField } from "./bilingual-field";
import { Select } from "./select";
import { LanguagePicker } from "./language-picker";
const empty = (): Bilingual => ({ de: "", en: "" });
export function initialChallenge(kind: ContentKind): Challenge | undefined {
  switch (kind) {
    case "idiom":
    case "gaming_mission":
    case "youth_chat":
    case "academic":
      return {
        type: "meaning",
        choices: Array.from({ length: 4 }, empty),
        correctIndex: 0,
      };
    case "joke":
      return {
        type: "joke",
        choices: Array.from({ length: 4 }, empty),
        correctIndex: 0,
      };
    case "word_group":
      return {
        type: "outsider",
        rule: empty(),
        choices: Array.from({ length: 4 }, empty),
        correctIndex: 0,
        explanation: empty(),
      };
    case "loanword":
      return { type: "loan", originLanguage: "en" };
    case "sound_pair":
      return {
        type: "sound",
        words: [
          { word: "", meaning: empty(), pronunciation: "" },
          { word: "", meaning: empty(), pronunciation: "" },
        ],
      };
    case "attribution":
      return {
        type: "attribution",
        category: "person",
        answer: "",
        artist: "",
        aliases: [],
        alternatives: [],
      };
    case "false_friend":
      return {
        type: "friends",
        otherWord: "",
        otherLanguage: "en",
        sameMeaning: false,
        firstMeaning: empty(),
        secondMeaning: empty(),
        context: empty(),
      };
    case "word_order":
      return {
        type: "order",
        targetLanguage: "en",
        source: { de: "", en: "" },
        tiles: [],
        accepted: [],
      };
  }
}
export function ChallengeEditor({
  value,
  onChange,
}: {
  value: Challenge;
  onChange: (value: Challenge) => void;
}) {
  const { t, locale } = useI18n();
  const reactions =
    value.type === "relay" ||
    value.type === "academic" ||
    value.type === "joke" ||
    value.type === "meaning" ||
    value.type === "outsider"
      ? value
      : null;
  const choiceOrder = reactions
    ? [
        reactions.correctIndex,
        ...[0, 1, 2, 3].filter((index) => index !== reactions.correctIndex),
      ]
    : [];
  return (
    <AnswerTranslationProvider
      key={value.type}
      enabled={
        !!reactions || value.type === "sound" || value.type === "friends"
      }
    >
      <fieldset className="challenge-editor" data-field="challenge">
        <legend>{t("Spielaufgabe")}</legend>
        <p className="form-note">
          {t(
            "Ergänze beide Sprachfassungen. Fehlende Übersetzungen werden als Originaltext gekennzeichnet.",
          )}
        </p>
        {value.type === "mission" && (
          <>
            <p>
              {t(
                "Lege Start, drei Ziele in Reihenfolge und bis zu drei Hindernisse fest.",
              )}
            </p>
            {(
              ["start", "target0", "target1", "target2", "blocked"] as const
            ).map((field, index) => (
              <label key={field}>
                {t(
                  field === "start"
                    ? "Start"
                    : field === "blocked"
                      ? "Hindernis hinzufügen"
                      : `Ziel ${index}`,
                )}
                <Select
                  aria-label={t(
                    field === "start"
                      ? "Start"
                      : field === "blocked"
                        ? "Hindernis hinzufügen"
                        : `Ziel ${index}`,
                  )}
                  value={
                    field === "start"
                      ? value.start
                      : field === "blocked"
                        ? ""
                        : value.checkpoints[index - 1]
                  }
                  onValueChange={(v) => {
                    if (field === "start")
                      onChange({ ...value, start: Number(v) });
                    else if (field === "blocked")
                      onChange({
                        ...value,
                        blocked: value.blocked.includes(Number(v))
                          ? value.blocked.filter((n) => n !== Number(v))
                          : [...value.blocked, Number(v)].slice(-3),
                      });
                    else
                      onChange({
                        ...value,
                        checkpoints: value.checkpoints.map((n, i) =>
                          i === index - 1 ? Number(v) : n,
                        ),
                      });
                  }}
                >
                  {field === "blocked" && (
                    <option value="" disabled>
                      {t("Bitte auswählen")}
                    </option>
                  )}
                  {missionTiles.map((tile, i) => (
                    <option key={i} value={i}>
                      {String.fromCharCode(65 + (i % 3))}
                      {Math.floor(i / 3) + 1} · {tile[locale]}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
            <p>
              {t("Hindernisse")}:{" "}
              {value.blocked.map((n) => (
                <button
                  type="button"
                  className="chip"
                  key={n}
                  onClick={() =>
                    onChange({
                      ...value,
                      blocked: value.blocked.filter((i) => i !== n),
                    })
                  }
                >
                  {missionTiles[n][locale]} ×
                </button>
              ))}
            </p>
            <p className="form-note">
              {t(
                "Schreibe die Gaming-Ansage in das Feld Originalausdruck und erkläre die Begriffe im Bedeutungsfeld.",
              )}
            </p>
          </>
        )}
        {value.type === "outsider" && (
          <BilingualField
            label="Gemeinsame sprachliche Regel"
            path="challenge.rule"
            value={value.rule}
            onChange={(rule) => onChange({ ...value, rule })}
          />
        )}
        {value.type === "loan" && (
          <>
            <LanguagePicker
              label="Unmittelbare Gebersprache"
              name="challenge.originLanguage"
              value={value.originLanguage}
              onChange={(originLanguage) =>
                onChange({ ...value, originLanguage })
              }
            />
            <p className="form-note">
              {t(
                "Gib die Sprache an, aus der das Wort direkt übernommen wurde. Weitere Stationen kannst du im kulturellen Hinweis erklären. Bitte ergänze eine Quelle.",
              )}
            </p>
          </>
        )}
        {reactions && (
          <>
            <p className="form-note">
              {t(
                "Eine richtige Antwort und drei falsche Antworten. Im Spiel werden alle vier zufällig gemischt.",
              )}
            </p>
            <p className="form-note">
              {t(
                "Falsche Antworten sollen glaubwürdig sein: gleiches Thema, ähnliche Länge und passende Formulierung. Vermeide Scherzantworten und zusätzliche richtige Bedeutungen.",
              )}
            </p>
            {choiceOrder.map((i, position) => (
              <div key={i} className="reaction-editor">
                <BilingualField
                  label={
                    position === 0
                      ? value.type === "outsider"
                        ? "Gesuchter Außenseiter"
                        : "Richtige Antwort"
                      : `Falsche Antwort ${position}`
                  }
                  path={"challenge.choices." + i}
                  value={reactions.choices[i]}
                  onChange={(v) =>
                    onChange({
                      ...reactions,
                      choices: reactions.choices.map((old, n) =>
                        n === i ? v : old,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </>
        )}
        {value.type === "outsider" && (
          <BilingualField
            label="Warum passt dieses Wort nicht?"
            path="challenge.explanation"
            value={value.explanation}
            onChange={(explanation) => onChange({ ...value, explanation })}
          />
        )}
        {value.type === "sound" && (
          <>
            <p>
              {t(
                "Der Originalausdruck ist der vollständige Satz zum Nachsprechen. Die beiden Wörter helfen beim Üben.",
              )}
            </p>
            {value.words.map((word, i) => (
              <div key={i} className="sound-editor">
                <label>
                  {t("Wort")} {i + 1}
                  <input
                    name={"challenge.words." + i + ".word"}
                    maxLength={60}
                    value={word.word}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        words: value.words.map((v, n) =>
                          n === i ? { ...v, word: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <BilingualField
                  label="Bedeutung"
                  path={"challenge.words." + i + ".meaning"}
                  value={word.meaning}
                  onChange={(meaning) =>
                    onChange({
                      ...value,
                      words: value.words.map((v, n) =>
                        n === i ? { ...v, meaning } : v,
                      ),
                    })
                  }
                />
                <label>
                  {t("Lautschrift oder Aussprachehilfe")} {t("(optional)")}
                  <input
                    maxLength={80}
                    value={word.pronunciation}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        words: value.words.map((v, n) =>
                          n === i ? { ...v, pronunciation: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </>
        )}
        {value.type === "attribution" && (
          <>
            <label>
              {t("Kategorie")}
              <Select
                value={value.category}
                onValueChange={(v) =>
                  onChange({
                    ...value,
                    category: v as "person" | "song",
                    album: v === "song" ? value.album : undefined,
                  })
                }
              >
                <option value="person">{t("Personenzitat")}</option>
                <option value="song">{t("Liedstelle")}</option>
              </Select>
            </label>
            <label>
              {t(
                value.category === "person"
                  ? "Gesuchte Person"
                  : "Gesuchter Liedtitel",
              )}
              <input
                name="challenge.answer"
                value={value.answer}
                maxLength={100}
                onChange={(e) => onChange({ ...value, answer: e.target.value })}
              />
            </label>
            {value.category === "song" && (
              <>
                <label>
                  {t("Interpret oder Fassung")} {t("(optional)")}
                  <input
                    name="challenge.artist"
                    maxLength={80}
                    value={value.artist}
                    onChange={(e) =>
                      onChange({ ...value, artist: e.target.value })
                    }
                  />
                </label>
                <label>
                  {t("Album")} {t("(optional)")}
                  <input
                    name="challenge.album"
                    maxLength={160}
                    value={value.album ?? ""}
                    onChange={(e) =>
                      onChange({ ...value, album: e.target.value })
                    }
                  />
                </label>
                <p className="form-note">
                  {t(
                    "Im Spiel könnt ihr zuerst den Tipp und danach das Album einblenden. Ohne eigenen Tipp dient der Interpret als erste Hilfe, falls er angegeben ist.",
                  )}
                </p>
              </>
            )}
            <details>
              <summary>{t("Drei falsche Antworten selbst angeben")}</summary>
              <p className="form-note">
                {t(
                  "Sonst nutzt die App andere Personen beziehungsweise Lieder aus der Sammlung. Bei zu wenigen passenden Antworten wartet dein Beitrag auf weitere Einträge.",
                )}
              </p>
              {[0, 1, 2].map((i) => (
                <label key={i}>
                  {t("Falsche Antwort")} {i + 1}
                  <input
                    name={"challenge.alternatives." + i}
                    value={value.alternatives[i] ?? ""}
                    maxLength={160}
                    onChange={(e) => {
                      const alternatives = Array.from({ length: 3 }, (_, n) =>
                        n === i
                          ? e.target.value
                          : (value.alternatives[n] ?? ""),
                      );
                      onChange({
                        ...value,
                        alternatives: alternatives.every((v) => !v)
                          ? []
                          : alternatives,
                      });
                    }}
                  />
                </label>
              ))}
            </details>
            <p className="form-note">
              {t(
                "Verwende kurze Ausschnitte und ergänze eine verlässliche Quelle. Gesucht ist die Person oder der Liedtitel, nicht der Interpret.",
              )}
            </p>
          </>
        )}
        {value.type === "friends" && (
          <>
            <label>
              {t("Zweites Wort")}
              <input
                name="challenge.otherWord"
                value={value.otherWord}
                maxLength={100}
                onChange={(e) =>
                  onChange({ ...value, otherWord: e.target.value })
                }
              />
            </label>
            <LanguagePicker
              label="Sprache des zweiten Wortes"
              name="challenge.otherLanguage"
              value={value.otherLanguage}
              onChange={(otherLanguage) =>
                onChange({ ...value, otherLanguage })
              }
            />
            <label>
              {t("Lösung")}
              <Select
                value={String(value.sameMeaning)}
                onValueChange={(v) =>
                  onChange({ ...value, sameMeaning: v === "true" })
                }
              >
                <option value="false">False Friend</option>
                <option value="true">{t("Gleiche Bedeutung")}</option>
              </Select>
            </label>
            <BilingualField
              label="Bedeutung des ersten Wortes"
              path="challenge.firstMeaning"
              value={value.firstMeaning}
              onChange={(firstMeaning) => onChange({ ...value, firstMeaning })}
            />
            <BilingualField
              label="Bedeutung des zweiten Wortes"
              path="challenge.secondMeaning"
              value={value.secondMeaning}
              onChange={(secondMeaning) =>
                onChange({ ...value, secondMeaning })
              }
            />
            <BilingualField
              label="Verwendungskontext"
              path="challenge.context"
              value={value.context}
              onChange={(context) => onChange({ ...value, context })}
            />
          </>
        )}
        {value.type === "order" && (
          <>
            <LanguagePicker
              label="Zielsprache"
              name="challenge.targetLanguage"
              value={value.targetLanguage}
              onChange={(targetLanguage) =>
                onChange({ ...value, targetLanguage })
              }
            />
            <label>
              {t("Ausgangssatz auf Deutsch")}
              <input
                name="challenge.source.de"
                value={value.source.de}
                maxLength={180}
                onChange={(e) =>
                  onChange({
                    ...value,
                    source: { ...value.source, de: e.target.value },
                  })
                }
              />
            </label>
            <label>
              {t("Ausgangssatz auf Englisch")}
              <input
                name="challenge.source.en"
                value={value.source.en}
                maxLength={180}
                onChange={(e) =>
                  onChange({
                    ...value,
                    source: { ...value.source, en: e.target.value },
                  })
                }
              />
            </label>
            <label>
              {t("Richtige Übersetzung: ein Baustein pro Zeile")}
              <textarea
                name="challenge.tiles"
                rows={5}
                value={value.tiles.map((tile) => tile.text).join("\n")}
                onChange={(e) => {
                  const tiles = e.target.value
                    .split("\n")
                    .slice(0, 16)
                    .map((text, i) => ({ id: `tile-${i + 1}`, text }));
                  onChange({
                    ...value,
                    tiles,
                    accepted: [tiles.map((t) => t.id)],
                  });
                }}
              />
            </label>
            <p className="form-note">
              {t(
                "Zwei bis sechzehn Bausteine. Gleiche Wörter dürfen mehrfach vorkommen. Jede Änderung hier setzt alternative Wortfolgen zurück.",
              )}
            </p>
            <label>
              {t(
                "Alternative Wortfolgen: Bausteinnummern, eine Folge pro Zeile",
              )}
              <textarea
                rows={2}
                placeholder="2 1 3 4"
                key={value.tiles.map((t) => t.text).join("|")}
                defaultValue={value.accepted
                  .slice(1)
                  .map((a) =>
                    a
                      .map(
                        (id) => value.tiles.findIndex((t) => t.id === id) + 1,
                      )
                      .join(" "),
                  )
                  .join("\n")}
                onBlur={(e) =>
                  onChange({
                    ...value,
                    accepted: [
                      value.tiles.map((t) => t.id),
                      ...e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((line) =>
                          line
                            .trim()
                            .split(/\s+/)
                            .map(
                              (n) =>
                                value.tiles[Number(n) - 1]?.id ?? "invalid",
                            ),
                        ),
                    ],
                  })
                }
              />
            </label>
            <p className="form-note">
              {t(
                "Alle Ausgangssätze müssen dieselbe Bedeutung haben. Trage hier nur fachlich geprüfte gültige Reihenfolgen ein.",
              )}
            </p>
          </>
        )}
      </fieldset>
    </AnswerTranslationProvider>
  );
}
