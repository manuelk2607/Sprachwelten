"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  otherLocale,
  textsOf,
  type TranslationTexts,
} from "@/lib/content-translations";
import { useAuthSession } from "@/lib/auth/provider";
export type TranslationField = {
  key: keyof TranslationTexts;
  label: string;
  max: number;
};
export function TranslationEditor({
  sourceLocale,
  fields,
  getSource,
  translation,
  onChange,
  revision,
  reviewed,
  setReviewed,
  compact = false,
}: {
  sourceLocale: Locale;
  fields: TranslationField[];
  getSource: () => TranslationTexts;
  translation: Partial<TranslationTexts>;
  onChange: (value: Partial<TranslationTexts>) => void;
  revision: number;
  reviewed: boolean;
  setReviewed: (value: boolean) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const session = useAuthSession();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [machine, setMachine] = useState(false);
  const [preview, setPreview] = useState<{
    revision: number;
    texts: TranslationTexts;
  } | null>(null);
  const version = useRef(revision);
  useEffect(() => {
    version.current = revision;
  }, [revision]);
  const target = otherLocale(sourceLocale);
  const hasTranslation = fields.some((field) => translation[field.key]?.trim());
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/translations", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ available: boolean }>)
      .then((data) => setAvailable(data.available === true))
      .catch(() => setAvailable(false));
    return () => controller.abort();
  }, []);
  async function suggest() {
    const current = version.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLocale, texts: getSource() }),
      });
      const result = (await response.json()) as {
        translation: TranslationTexts;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      if (version.current !== current)
        throw new Error(
          "Dein Ausgangstext hat sich geändert. Bitte die Übersetzung erneut erstellen.",
        );
      if (compact) {
        setPreview({ revision: current, texts: result.translation });
        return;
      }
      onChange(result.translation);
      setReviewed(false);
      setMachine(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={
        compact
          ? "translation-editor inline-hint-translation"
          : "translation-editor"
      }
      aria-label={t("Übersetzung ergänzen")}
    >
      {!compact && (
        <>
          <p className="form-note">
            <strong>
              {t("Sprache deiner Erklärung")}:{" "}
              {t(sourceLocale === "de" ? "Deutsch" : "Englisch")}
            </strong>{" "}
            {t(
              "Sie folgt automatisch deiner aktuellen Oberflächensprache. Originalausdrücke bleiben unverändert.",
            )}
          </p>
          <h3>
            {t("Übersetzung ins")}{" "}
            {t(target === "de" ? "Deutsche" : "Englische")}
          </h3>
          <p className="muted">
            {t(
              "Du kannst die zweite Sprachfassung selbst schreiben oder einen Vorschlag bearbeiten. Fehlende Felder erscheinen später als gekennzeichneter Originaltext.",
            )}
          </p>
        </>
      )}
      <button
        type="button"
        className="button outline"
        disabled={
          busy ||
          available !== true ||
          !session?.user ||
          (compact && !fields.some((field) => getSource()[field.key]?.trim()))
        }
        onClick={() => void suggest()}
      >
        {busy ? t("Wird übersetzt …") : t("Übersetzung vorschlagen")}
      </button>
      {!session?.user && (
        <p className="form-note">
          {t(
            "Automatische Übersetzungsvorschläge sind mit Konto verfügbar. Ohne Konto kannst du die zweite Sprachfassung selbst ergänzen oder später als Originaltext anzeigen lassen.",
          )}
        </p>
      )}
      {available === true && !compact && (
        <p className="form-note">
          {t(
            "Für Vorschläge werden deine Erklärungstexte an Cloudflare Workers AI gesendet.",
          )}
        </p>
      )}
      {available === false && (
        <p className="form-note">
          {t(
            "Automatische Übersetzung ist momentan nicht verfügbar. Du kannst die Übersetzung selbst ergänzen.",
          )}
        </p>
      )}
      {machine && hasTranslation && (
        <p role="status" className="form-note">
          {t(
            "Automatischer Übersetzungsvorschlag: Bitte Bedeutung und kulturelle Feinheiten prüfen und bei Bedarf korrigieren.",
          )}
        </p>
      )}
      {compact && preview?.revision === revision && (
        <div className="answer-translation-preview">
          {fields.map((field) => (
            <label key={field.key}>
              {t("Übersetzungsvorschlag")} ·{" "}
              {t(target === "de" ? "Deutsch" : "Englisch")}
              <textarea
                maxLength={field.max}
                rows={2}
                value={preview.texts[field.key]}
                onChange={(event) =>
                  setPreview({
                    ...preview,
                    texts: {
                      ...preview.texts,
                      [field.key]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
          <div className="answer-translation-actions">
            <button
              type="button"
              className="button outline small"
              disabled={fields.some(
                (field) =>
                  !preview.texts[field.key]?.trim() ||
                  preview.texts[field.key].length > field.max,
              )}
              onClick={() => {
                onChange({
                  ...translation,
                  ...Object.fromEntries(
                    fields.map((field) => [
                      field.key,
                      preview.texts[field.key],
                    ]),
                  ),
                });
                setReviewed(true);
                setPreview(null);
              }}
            >
              {t("Vorschlag übernehmen")}
            </button>
            <button
              type="button"
              className="button outline small"
              onClick={() => setPreview(null)}
            >
              {t("Verwerfen")}
            </button>
          </div>
        </div>
      )}
      <details open={!compact}>
        {compact && (
          <summary>
            {t("Zweite Sprachfassung")} · {target.toUpperCase()}
          </summary>
        )}
        {fields.map((field) => (
          <label key={field.key}>
            {t(field.label)} · {t(target === "de" ? "Deutsch" : "Englisch")}
            <textarea
              value={translation[field.key] ?? ""}
              maxLength={field.max}
              rows={field.key === "meaning" || field.key === "body" ? 3 : 2}
              onChange={(e) => {
                onChange({ ...translation, [field.key]: e.target.value });
                setReviewed(false);
              }}
            />
          </label>
        ))}
      </details>
      {hasTranslation && (
        <label className="translation-review">
          <input
            type="checkbox"
            checked={reviewed}
            required
            onChange={(e) => setReviewed(e.target.checked)}
          />
          <span>{t("Ich habe die zweite Sprachfassung geprüft.")}</span>
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </section>
  );
}
export { textsOf };
