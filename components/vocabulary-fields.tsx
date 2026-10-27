"use client";
import type { VocabularyPair } from "@/lib/vocabulary";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker } from "./language-picker";
import { BilingualField } from "./bilingual-field";
export function VocabularyFields({
  value,
  onChange,
}: {
  value?: VocabularyPair;
  onChange: (v: VocabularyPair) => void;
}) {
  const { t } = useI18n();
  const pair = value ?? {
    translationLanguage: "",
    reversible: false,
    termAlternatives: [],
    translationAlternatives: [],
    context: { de: "", en: "" },
  };
  return (
    <div className="form-stack">
      {!value && (
        <p className="notice">
          {t(
            "Bei älteren Vokabeln muss die Übersetzungssprache erst bestätigt werden. Die Erklärungssprache reicht dafür nicht aus.",
          )}
        </p>
      )}
      <LanguagePicker
        label="Sprache der Übersetzung"
        name="challenge.vocabulary.translationLanguage"
        value={pair.translationLanguage}
        onChange={(translationLanguage) =>
          onChange({ ...pair, translationLanguage })
        }
      />
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={pair.reversible}
          onChange={(e) => onChange({ ...pair, reversible: e.target.checked })}
        />
        {t(
          "Diese Bedeutung kann auch in umgekehrter Richtung abgefragt werden.",
        )}
      </label>
      <p className="form-note">
        {t(
          "Nur bestätigen, wenn die Begriffe im angegebenen Kontext in beiden Richtungen gleichbedeutend sind. Mehrdeutige Begriffe benötigen einen eindeutigen Bedeutungshinweis.",
        )}
      </p>
      <BilingualField
        label="Kontext für die Übersetzung"
        path="challenge.vocabulary.context"
        value={pair.context}
        onChange={(context) => onChange({ ...pair, context })}
      />
      <label>
        {t("Weitere richtige Formen der Vokabel (eine pro Zeile)")}
        <textarea
          rows={2}
          maxLength={1260}
          value={pair.termAlternatives.join("\n")}
          onChange={(e) =>
            onChange({
              ...pair,
              termAlternatives: e.target.value
                ? e.target.value.split("\n").slice(0, 7)
                : [],
            })
          }
        />
      </label>
      <label>
        {t("Weitere richtige Übersetzungen (eine pro Zeile)")}
        <textarea
          rows={2}
          maxLength={2100}
          value={pair.translationAlternatives.join("\n")}
          onChange={(e) =>
            onChange({
              ...pair,
              translationAlternatives: e.target.value
                ? e.target.value.split("\n").slice(0, 7)
                : [],
            })
          }
        />
      </label>
      <label>
        {t("Beispielsatz in der Übersetzungssprache (optional)")}
        <textarea
          value={pair.translationExample ?? ""}
          maxLength={600}
          rows={2}
          onChange={(e) =>
            onChange({ ...pair, translationExample: e.target.value })
          }
        />
      </label>
    </div>
  );
}
