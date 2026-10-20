"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Bilingual } from "@/lib/challenges";
import { useI18n, type Locale } from "@/lib/i18n";
import { useAuthSession } from "@/lib/auth/provider";

const TranslationAvailable = createContext(false);

/** One availability lookup for all answer fields in an editor. */
export function AnswerTranslationProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const { t } = useI18n();
  const session = useAuthSession();
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/translations", { signal: controller.signal })
      .then((response) => response.json() as Promise<{ available: boolean }>)
      .then((result) => {
        if (!controller.signal.aborted) setAvailable(result.available === true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    return () => controller.abort();
  }, [enabled]);
  if (!enabled) return children;
  return (
    <TranslationAvailable.Provider
      value={available === true && !!session?.user}
    >
      <p className="form-note">
        {t(
          "Übersetzungsvorschläge für Antworttexte kannst du prüfen, bearbeiten und einzeln übernehmen.",
        )}
      </p>
      {!session?.user && (
        <p className="form-note">
          {t(
            "Automatische Übersetzungsvorschläge sind mit Konto verfügbar. Ohne Konto kannst du die zweite Sprachfassung selbst ergänzen oder später als Originaltext anzeigen lassen.",
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
      {available === true && (
        <p className="form-note">
          {t(
            "Für Vorschläge werden deine Antworttexte an Cloudflare Workers AI gesendet.",
          )}
        </p>
      )}
      {children}
    </TranslationAvailable.Provider>
  );
}

type Suggestion = { snapshot: string; target: Locale; text: string };
export function BilingualField({
  label,
  value,
  onChange,
  path,
}: {
  label: string;
  path?: string;
  value: Bilingual;
  onChange: (value: Bilingual) => void;
}) {
  const { t, locale } = useI18n();
  const available = useContext(TranslationAvailable);
  const other = locale === "de" ? "en" : "de";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const snapshot = JSON.stringify([value.de, value.en]);
  const latest = useRef(snapshot);
  const version = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    latest.current = snapshot;
  }, [snapshot]);
  useEffect(() => () => request.current?.abort(), []);
  const pending = suggestion?.snapshot === snapshot ? suggestion : null;
  function edit(language: Locale, text: string) {
    version.current++;
    setSuggestion(null);
    setError("");
    onChange({ ...value, [language]: text });
  }
  async function suggest(sourceLocale: Locale) {
    const currentVersion = ++version.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy(true);
    setError("");
    setSuggestion(null);
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocale,
          texts: { meaning: value[sourceLocale] },
        }),
      });
      const result = (await response.json()) as {
        translation?: { meaning?: string };
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error ||
            "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
        );
      if (version.current !== currentVersion || latest.current !== snapshot)
        throw new Error(
          "Die Antwort wurde inzwischen geändert. Bitte die Übersetzung erneut vorschlagen lassen.",
        );
      if (!result.translation?.meaning?.trim())
        throw new Error(
          "Die automatische Übersetzung ist gerade nicht erreichbar. Du kannst die Übersetzung selbst ergänzen.",
        );
      setSuggestion({
        snapshot,
        target: sourceLocale === "de" ? "en" : "de",
        text: result.translation.meaning.trim(),
      });
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function field(language: Locale) {
    return (
      <label>
        {t(label)} · {language.toUpperCase()}
        <input
          name={path ? path + "." + language : undefined}
          value={value[language]}
          maxLength={300}
          onChange={(event) => edit(language, event.target.value)}
        />
      </label>
    );
  }
  return (
    <div className="bilingual-field">
      {field(locale)}
      <details>
        <summary>
          {t("Zweite Sprachfassung")} · {other.toUpperCase()}
        </summary>
        {field(other)}
      </details>
      <div className="answer-translation-actions">
        {(["de", "en"] as const).map((source) => (
          <button
            key={source}
            type="button"
            className="button outline small"
            disabled={busy || !available || !value[source].trim()}
            aria-label={
              t(
                source === "de"
                  ? "Englisch vorschlagen"
                  : "Deutsch vorschlagen",
              ) +
              " · " +
              t(label)
            }
            onClick={() => void suggest(source)}
          >
            {t(
              source === "de" ? "Englisch vorschlagen" : "Deutsch vorschlagen",
            )}
          </button>
        ))}
        {busy && <span role="status">{t("Wird übersetzt …")}</span>}
      </div>
      {pending && (
        <div className="answer-translation-preview">
          <label>
            {t("Übersetzungsvorschlag")} · {pending.target.toUpperCase()}
            <textarea
              aria-label={t("Übersetzungsvorschlag") + " · " + t(label)}
              value={pending.text}
              rows={2}
              maxLength={300}
              onChange={(event) =>
                setSuggestion({ ...pending, text: event.target.value })
              }
            />
          </label>
          <p className="form-note">
            {t(
              "Bitte prüfe den Vorschlag. Erst beim Übernehmen wird die bisherige Sprachfassung ersetzt.",
            )}
          </p>
          {pending.text.length > 300 && (
            <p role="alert">
              {t("Bitte kürze den Vorschlag auf höchstens 300 Zeichen.")}
            </p>
          )}
          <div className="answer-translation-actions">
            <button
              type="button"
              className="button outline small"
              disabled={!pending.text.trim() || pending.text.length > 300}
              onClick={() => {
                if (pending.snapshot === snapshot) {
                  onChange({ ...value, [pending.target]: pending.text.trim() });
                  setSuggestion(null);
                }
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
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
