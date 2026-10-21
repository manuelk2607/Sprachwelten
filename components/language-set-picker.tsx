"use client";
import { useI18n } from "@/lib/i18n";
import { languages } from "@/lib/content";
import { languageLabel } from "@/lib/language-label";
import { LanguagePicker } from "./language-picker";
export function LanguageSetPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n(),
    codes = [...new Set([...Object.keys(languages), ...value])];
  return (
    <fieldset className="language-set">
      <legend>{t("Sprachen für Tabu")}</legend>
      <p className="form-note">
        {t(
          "Wählt nur Sprachen, die beide Teams beherrschen. Mindestens eine Sprache bleibt ausgewählt.",
        )}
      </p>
      <div className="language-set-options">
        {codes.map((code) => (
          <label className="language-set-option" key={code}>
            <input
              type="checkbox"
              checked={value.includes(code)}
              disabled={
                disabled ||
                (!value.includes(code) && value.length >= 10) ||
                (value.length === 1 && value[0] === code)
              }
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...value, code]
                    : value.filter((c) => c !== code),
                )
              }
            />
            {languageLabel(code, locale)}
          </label>
        ))}
      </div>
      <LanguagePicker
        key={value.join(",")}
        label="Weitere Sprache hinzufügen"
        value=""
        onChange={(code) => {
          if (code && !value.includes(code) && value.length < 10)
            onChange([...value, code]);
        }}
        disabled={disabled || value.length >= 10}
      />
    </fieldset>
  );
}
