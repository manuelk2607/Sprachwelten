"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  otherLocale,
  textsOf,
  translationFields,
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
  const [suggestion, setSuggestion] = useState<{
    snapshot: string;
    texts: TranslationTexts;
  } | null>(null);
  const snapshot=JSON.stringify([sourceLocale,revision,fields.map(field=>field.key),translation,session?.user?.id]);
  const version = useRef(snapshot);
  const request = useRef<AbortController|null>(null);
  const preview=suggestion?.snapshot===snapshot ? suggestion : null;
  useEffect(() => {
    version.current = snapshot;
  }, [snapshot]);
  useEffect(()=>()=>request.current?.abort(),[]);
  const target = otherLocale(sourceLocale);
  const FieldsContainer = compact ? "details" : "div";
  const hasTranslation = fields.some((field) => translation[field.key]?.trim());
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/translations", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ available: boolean }>)
      .then((data) => {if(!controller.signal.aborted)setAvailable(data.available === true);})
      .catch(() => {if(!controller.signal.aborted)setAvailable(false);});
    return () => controller.abort();
  }, []);
  async function suggest() {
    const current = version.current;
    const source=getSource();
    const texts=textsOf(Object.fromEntries(fields.map(field=>[field.key,source[field.key]])));
    const controller=new AbortController();
    request.current?.abort();request.current=controller;
    setBusy(true);
    setError("");
    setSuggestion(null);
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        signal:controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLocale, texts }),
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
      const parsed=translationFields.safeParse(result.translation);
      if(!parsed.success || fields.some(field=>texts[field.key]&&!parsed.data[field.key]?.trim()))throw new Error("Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.");
      setSuggestion({ snapshot: current, texts:parsed.data });
    } catch (error) {
      if(controller.signal.aborted)return;
      setError(
        error instanceof Error
          ? error.message
          : "Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.",
      );
    } finally {
      if(request.current===controller)setBusy(false);
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
              "Die Sprache wird beim Öffnen des Formulars übernommen. Gespeicherte Beiträge und Entwürfe behalten ihre Ursprungssprache.",
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
          !fields.some((field) => getSource()[field.key]?.trim())
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
      {preview && (
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
                  setSuggestion({
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
                  (getSource()[field.key]?.trim() && !preview.texts[field.key]?.trim()) ||
                  preview.texts[field.key].length > field.max,
              )}
              onClick={() => {
                if(version.current!==preview.snapshot)return;
                onChange({
                  ...translation,
                  ...Object.fromEntries(
                    fields.map((field) => [
                      field.key,
                      preview.texts[field.key],
                    ]),
                  ),
                });
                setReviewed(false);
                setSuggestion(null);
              }}
            >
              {t("Vorschlag übernehmen")}
            </button>
            <button
              type="button"
              className="button outline small"
              onClick={() => setSuggestion(null)}
            >
              {t("Verwerfen")}
            </button>
          </div>
        </div>
      )}
      <FieldsContainer>
        {compact && (
          <summary>
            {t("Zweite Sprachfassung")} · {target.toUpperCase()}
          </summary>
        )}
        {fields.map((field) => (
          <label key={field.key}>
            {t(field.label)} · {t(target === "de" ? "Deutsch" : "Englisch")}
            <textarea
              name={"translation."+field.key}
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
      </FieldsContainer>
      {hasTranslation && (
        <label className="translation-review">
          <input
            name="translationReviewed"
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
