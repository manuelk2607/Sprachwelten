"use client";
import { useEffect, useState } from "react";
import type { Entry } from "@/lib/content";
import { useAuthSession } from "@/lib/auth/provider";
import { useI18n } from "@/lib/i18n";
import { useKeyedState } from "@/lib/use-keyed-state";
import { learningLevels, learningText } from "@/lib/learning-content";
import { LanguagePicker } from "./language-picker";
import { Select } from "./select";
import { localizedTexts, translationStatus } from "@/lib/content-translations";
import { isRegisteredLanguage } from "@/lib/language-codes";
import { languageLabel } from "@/lib/language-label";
const topicKey = (topic: { de: string; en: string }) => topic.de || topic.en;
type Task = { id: string; exercise: string; prompt: string; choices: string[] };
type Result = {
  correct: boolean;
  answers: string[];
  explanation: string;
  dueAt?: string;
};
type Catalog = {
  more?: boolean;
  topics?: { de: string; en: string }[];
  levels?: string[];
  entries: Entry[];
  languages: { language: string; count: number }[];
  stats: {
    practiced: number;
    attempts: number;
    mistakes: number;
    due: number;
  } | null;
};
export function LearningDashboard({
  contribute,
  login,
  ready,
  version,
}: {
  contribute: (kind: "vocabulary" | "grammar", language: string) => void;
  login: () => void;
  ready: boolean;
  version: number;
}) {
  const { t, locale } = useI18n(),
    session = useAuthSession();
  const [language, setLanguage] = useState("en"),
    [domain, setDomain] = useState(""),
    [level, setLevel] = useState(""),
    [topic, setTopic] = useState(""),
    [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([
    language,
    domain,
    level,
    topic,
    session?.user.id,
    refresh,
    version,
  ]);
  const [offset, setOffset] = useKeyedState(key, 0),
    [loading, setLoading] = useKeyedState(key, true);
  const [catalog, setCatalog] = useKeyedState<Catalog | null>(key, null),
    [error, setError] = useKeyedState(key, "");
  const taskKey = JSON.stringify([
    language,
    domain,
    level,
    topic,
    session?.user.id,
  ]);
  const [task, setTask] = useKeyedState<Task | null>(taskKey, null),
    [result, setResult] = useKeyedState<Result | null>(taskKey, null),
    [answer, setAnswer] = useKeyedState(taskKey, ""),
    [opened, setOpened] = useKeyedState<string[]>(taskKey, []);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sprachwelten-learning-language");
      if (saved && isRegisteredLanguage(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a non-sensitive browser preference once.
        setLanguage(saved);
      }
    } catch {}
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(
      "/api/learning?" +
        new URLSearchParams({
          language,
          offset: String(offset),
          ...(domain ? { domain } : {}),
          ...(level ? { level } : {}),
          ...(topic ? { topic } : {}),
        }),
      {
        signal: controller.signal,
      },
    )
      .then(async (r) => {
        const data = (await r.json()) as Catalog & { error?: string };
        if (!r.ok) throw new Error(data.error);
        return data as Catalog;
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setCatalog((old) => ({
            ...data,
            entries: offset
              ? [...(old?.entries ?? []), ...data.entries]
              : data.entries,
          }));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    language,
    domain,
    level,
    topic,
    offset,
    key,
    setCatalog,
    setError,
    setLoading,
  ]);
  const entries = (catalog?.entries ?? []).filter(
    (e) =>
      e.challenge?.type === "learning" &&
      (!domain || e.kind === domain) &&
      (!level || e.challenge.level === level) &&
      (!topic || topicKey(e.challenge.topic) === topic),
  );
  const topics = [
    ...new Set(
      (
        catalog?.topics ??
        (catalog?.entries ?? []).flatMap((e) =>
          e.challenge?.type === "learning" ? [e.challenge.topic] : [],
        )
      ).map(topicKey),
    ),
  ];
  async function practice(review = false) {
    setBusy(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      const r = await fetch("/api/learning/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          language,
          locale,
          review,
          ...(domain ? { domain } : {}),
          ...(level ? { level } : {}),
          ...(topic ? { topic } : {}),
        }),
      });
      const data = (await r.json()) as Task & { error?: string };
      if (!r.ok) throw new Error(data.error);
      setTask(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!task) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/learning/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", id: task.id, answer, locale }),
      });
      const data = (await r.json()) as Result & { error?: string };
      if (!r.ok) throw new Error(data.error);
      setResult(data);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="learning-dashboard" aria-labelledby="learning-title">
      <div className="section-top">
        <div>
          <div className="eyebrow">{t("DEINE SPRACHE. DEIN TEMPO.")}</div>
          <h1 id="learning-title">{t("Lernen")}</h1>
          <p className="muted">
            {t(
              "Wähle eine Zielsprache. Entdecke Regeln und Wörter und festige sie mit regelmäßigen Wiederholungen.",
            )}
          </p>
        </div>
        <a className="text-link" href="#entdecken">
          {t("Zur Sammlung")}
        </a>
      </div>
      {!!catalog?.languages.length && (
        <div
          className="learning-actions"
          aria-label={t("Verfügbare Lernsprachen")}
        >
          {catalog.languages.map((item) => (
            <button
              type="button"
              key={item.language}
              className="text-link"
              disabled={busy}
              aria-pressed={language === item.language}
              onClick={() => {
                setLanguage(item.language);
                setTopic("");
              }}
            >
              {languageLabel(item.language, locale)} ({item.count})
            </button>
          ))}
        </div>
      )}
      <div className="learning-filters">
        <LanguagePicker
          label="Zielsprache"
          value={language}
          disabled={busy || !ready}
          onChange={(value) => {
            setLanguage(value);
            setTopic("");
            try {
              localStorage.setItem("sprachwelten-learning-language", value);
            } catch {}
          }}
        />
        <label>
          {t("Lernbereich")}
          <Select value={domain} disabled={busy} onValueChange={setDomain}>
            <option value="">{t("Alles")}</option>
            <option value="vocabulary">{t("Vokabeln")}</option>
            <option value="grammar">{t("Grammatik")}</option>
          </Select>
        </label>
        <label>
          {t("Lernniveau")}
          <Select value={level} disabled={busy} onValueChange={setLevel}>
            <option value="">{t("Alles")}</option>
            {learningLevels
              .filter((l) => !catalog?.levels || catalog.levels.includes(l))
              .map((l) => (
                <option key={l}>{l}</option>
              ))}
          </Select>
        </label>
        <label>
          {t("Thema")}
          <Select value={topic} disabled={busy} onValueChange={setTopic}>
            <option value="">{t("Alles")}</option>
            {topics.map((value) => (
              <option key={value} value={value}>
                {learningText(
                  catalog?.topics?.find((item) => topicKey(item) === value) ??
                    (
                      catalog!.entries.find(
                        (e) =>
                          e.challenge?.type === "learning" &&
                          topicKey(e.challenge.topic) === value,
                      )!.challenge as Extract<
                        NonNullable<Entry["challenge"]>,
                        { type: "learning" }
                      >
                    ).topic,
                  locale,
                )}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {catalog?.stats && (
        <div className="learning-stats" aria-label={t("Dein Lernfortschritt")}>
          <span>
            <strong>{catalog.stats.practiced}</strong> {t("geübte Aufgaben")}
          </span>
          <span>
            <strong>{catalog.stats.attempts}</strong> {t("Antworten")}
          </span>
          <span>
            <strong>{catalog.stats.mistakes}</strong> {t("Fehler insgesamt")}
          </span>
          <span>
            <strong>{catalog.stats.due}</strong> {t("jetzt fällig")}
          </span>
        </div>
      )}
      {!session?.user && (
        <p className="form-note">
          {t(
            "Du kannst ohne Konto üben. Angemeldet werden Fortschritt und fällige Wiederholungen für dich gespeichert.",
          )}{" "}
          <button className="text-link" onClick={login}>
            {t("Anmelden")}
          </button>
        </p>
      )}
      <div className="learning-actions">
        <button
          className="button primary"
          disabled={busy || !ready || !entries.length}
          onClick={() => void practice()}
        >
          {t("Jetzt üben")}
        </button>
        <button
          className="button outline"
          disabled={busy || !session?.user || !catalog?.stats?.due}
          onClick={() => void practice(true)}
        >
          {t("Fällige Aufgaben wiederholen")}
        </button>
        <button
          className="button outline"
          disabled={!ready || busy}
          onClick={() => contribute("vocabulary", language)}
        >
          {t("Vokabel beitragen")}
        </button>
        <button
          className="button outline"
          disabled={!ready || busy}
          onClick={() => contribute("grammar", language)}
        >
          {t("Grammatik beitragen")}
        </button>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {t(error)}
        </p>
      )}
      {task ? (
        <div className="learning-practice" key={task.id}>
          <h2>{t("Deine Übung")}</h2>
          <p className="learning-prompt">{task.prompt}</p>
          {!result ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {task.choices.length ? (
                <fieldset disabled={busy}>
                  <legend>{t("Deine Antwort")}</legend>
                  {task.choices.map((choice) => (
                    <label key={choice} className="learning-choice">
                      <input
                        type="radio"
                        name="learning-answer"
                        value={choice}
                        checked={answer === choice}
                        onChange={() => setAnswer(choice)}
                        required
                      />
                      {choice}
                    </label>
                  ))}
                </fieldset>
              ) : (
                <label>
                  {t("Deine Antwort")}
                  <input
                    autoComplete="off"
                    maxLength={300}
                    required
                    disabled={busy}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
              )}
              <button
                className="button primary"
                disabled={busy || !answer.trim()}
              >
                {t("Antwort prüfen")}
              </button>
            </form>
          ) : (
            <div role="status">
              <h3>{t(result.correct ? "Richtig!" : "Noch nicht ganz.")}</h3>
              <p>
                <strong>{t("Richtige Lösungen")}: </strong>
                {result.answers.join(" / ")}
              </p>
              <p>{result.explanation}</p>
              {result.dueAt && (
                <p className="form-note">
                  {t("Nächste Wiederholung")}:{" "}
                  {new Date(result.dueAt).toLocaleString(locale)}
                </p>
              )}
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void practice()}
              >
                {t("Nächste Aufgabe")}
              </button>
            </div>
          )}
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setTask(null);
              setResult(null);
            }}
          >
            {t("Zurück zu den Lernkarten")}
          </button>
        </div>
      ) : (
        <div className="learning-lessons">
          {!catalog && !error && <p role="status">{t("Wird geladen …")}</p>}
          {catalog && !entries.length && (
            <p>
              {t(
                "Für diese Auswahl sind noch keine Lernmaterialien vorhanden. Trage eine Vokabel oder Grammatikregel bei.",
              )}
            </p>
          )}
          {entries.map((entry) => {
            const texts = localizedTexts(entry, locale);
            const c = entry.challenge;
            if (c?.type !== "learning") return null;
            const revealed = opened.includes(entry.id);
            return (
              <article className="learning-card" key={entry.id}>
                <span className="kind-pill">
                  {t(entry.kind === "vocabulary" ? "Vokabel" : "Grammatik")} ·{" "}
                  {c.level} · {learningText(c.topic, locale)}
                </span>
                <h2>{entry.phrase}</h2>
                <button
                  className="text-link"
                  aria-expanded={revealed}
                  onClick={() =>
                    setOpened((old) =>
                      revealed
                        ? old.filter((id) => id !== entry.id)
                        : [...old, entry.id],
                    )
                  }
                >
                  {t(revealed ? "Lernkarte schließen" : "Lernkarte öffnen")}
                </button>
                {revealed && (
                  <div>
                    <p>
                      <strong>{texts.literal}</strong>
                    </p>
                    <p>{texts.meaning}</p>
                    {texts.example && <blockquote>{texts.example}</blockquote>}
                    {texts.culturalNote && <p>{texts.culturalNote}</p>}
                    {translationStatus(entry, locale) === "missing" && (
                      <p className="form-note">
                        {t("Originaltext – Übersetzung fehlt")}
                      </p>
                    )}
                    <p className="form-note">
                      {t(
                        entry.status === "curated"
                          ? "Startsammlung"
                          : "Community-Beitrag",
                      )}
                    </p>
                    {entry.sourceUrl && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={entry.sourceUrl}
                      >
                        {t("Quelle")}
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
          {catalog?.more && (
            <button
              type="button"
              className="button outline"
              disabled={loading}
              onClick={() => setOffset((v) => v + 12)}
            >
              {t("Weitere Lernkarten laden")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
