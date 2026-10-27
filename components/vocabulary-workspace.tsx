"use client";
import { useEffect, useState } from "react";
import type { Notebook, VocabularyCard } from "@/lib/vocabulary";
import { useAuthSession } from "@/lib/auth/provider";
import { useKeyedState } from "@/lib/use-keyed-state";
import { useI18n } from "@/lib/i18n";
import { languageLabel } from "@/lib/language-label";
import { Select } from "./select";
import { Dialog } from "./dialog";
import { NotebookDialog } from "./notebook-dialog";
type Task = {
  id: string;
  prompt: string;
  exercise: "writing" | "flashcard";
  sourceLanguage: string;
  targetLanguage: string;
};
type Result = {
  answers: string[];
  explanation: string;
  correct?: boolean;
  dueAt?: string;
};
type Catalog = {
  unavailableIds?:string[];
  cards: VocabularyCard[];
  more: boolean;
  topics?: { de: string; en: string }[];
  levels?: string[];
};
export function VocabularyWorkspace({
  sourceLanguage,
  targetLanguage,
  onPairChange,
  login,
  contribute,
  version,
  ready,
  openEntry,
}: {
  sourceLanguage: string;
  targetLanguage: string;
  onPairChange: (source: string, target: string) => void;
  login: () => void;
  contribute: () => void;
  version: number;
  ready: boolean;
  openEntry:(id:string)=>Promise<void>;
}) {
  const { t, locale } = useI18n(),
    session = useAuthSession(),
    owner = session?.user?.id ?? "";
  const pairKey = sourceLanguage + "|" + targetLanguage;
  const [refresh, setRefresh] = useState(0),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("alpha"),
    [level, setLevel] = useKeyedState(pairKey, ""),
    [topic, setTopic] = useKeyedState(pairKey, ""),
    [exercise, setExercise] = useState<"writing" | "flashcard">("writing"),
    [direction, setDirection] = useState("forward");
  const [bookId, setBookId] = useKeyedState(owner, ""),
    [books, setBooks] = useKeyedState<Notebook[]>(owner, []),
    [editing, setEditing] = useKeyedState<Notebook | true | null>(owner, null),
    [removing, setRemoving] = useKeyedState<Notebook | null>(owner, null);
  const scope = JSON.stringify([
    owner,
    bookId,
    sourceLanguage,
    targetLanguage,
    search,
    status,
    sort,
    level,
    topic,
  ]);
  const [selected, setSelected] = useKeyedState<string[]>(scope, []),
    [task, setTask] = useKeyedState<Task | null>(scope, null),
    [result, setResult] = useKeyedState<Result | null>(scope, null),
    [flipped, setFlipped] = useKeyedState(scope, false),
    [answer, setAnswer] = useKeyedState(scope, "");
  const dataKey = scope + ":" + locale + ":" + refresh + ":" + version,
    [catalog, setCatalog] = useKeyedState<Catalog | null>(dataKey, null),
    [offset, setOffset] = useKeyedState(dataKey, 0),
    [error, setError] = useKeyedState(dataKey, ""),
    [loading, setLoading] = useKeyedState(dataKey + ":" + offset, true),
    [busy, setBusy] = useState(false),
    [destination, setDestination] = useKeyedState(owner, ""),
    [opened, setOpened] = useKeyedState<string[]>(scope, []);
  const book = books.find((b) => b.id === bookId);
  const [onlySelected, setOnlySelected] = useKeyedState(scope, false),
    [practiceStatus, setPracticeStatus] = useKeyedState(scope, "all");
  useEffect(() => {
    if (
      book &&
      (![book.sourceLanguage, book.targetLanguage].includes(sourceLanguage) ||
        ![book.sourceLanguage, book.targetLanguage].includes(targetLanguage))
    ) {
      setBookId("");
    }
  }, [book, sourceLanguage, targetLanguage, setBookId]);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    fetch("/api/learning/notebooks", { signal: controller.signal })
      .then(async (r) => {
        const data = (await r.json()) as {
          notebooks: Notebook[];
          error?: string;
        };
        if (!r.ok) throw new Error(data.error);
        return data.notebooks;
      })
      .then((rows) => {
        if (!controller.signal.aborted) setBooks(rows);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [owner, refresh, setBooks, setError]);
  useEffect(() => {
    if (sourceLanguage === targetLanguage) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      sourceLanguage,
      targetLanguage,
      locale,
      offset: String(offset),
      status,
      sort,
      ...(search ? { query: search } : {}),
      ...(level ? { level } : {}),
      ...(topic ? { topic } : {}),
      ...(bookId ? { notebookId: bookId } : {}),
    });
    fetch("/api/learning/vocabulary?" + params, { signal: controller.signal })
      .then(async (r) => {
        const data = (await r.json()) as Catalog & { error?: string };
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setCatalog((old) => ({
            ...data,
            cards: offset ? [...(old?.cards ?? []), ...data.cards] : data.cards,
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
    sourceLanguage,
    targetLanguage,
    locale,
    offset,
    status,
    sort,
    search,
    level,
    topic,
    bookId,
    dataKey,
    setCatalog,
    setError,
    setLoading,
  ]);
  const cards = catalog?.cards ?? [];
  async function mutation(url: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      setSelected([]);
      setRefresh((v) => v + 1);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function items(action: "add" | "remove" | "move") {
    const source =
      action === "add" ? books.find((b) => b.id === destination) : book;
    if (!source) return;
    await mutation("/api/learning/notebooks/" + source.id + "/items", {
      action,
      revision: source.revision,
      entryIds: selected,
      ...(action === "move" ? { targetId: destination } : {}),
    });
  }
  async function practice(filterStatus = status, selection = false) {
    setOnlySelected(selection);
    setPracticeStatus(filterStatus);
    setBusy(true);
    setError("");
    setResult(null);
    setFlipped(false);
    setAnswer("");
    try {
      const r = await fetch("/api/learning/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vocabulary",
          sourceLanguage,
          targetLanguage,
          locale,
          status: filterStatus,
          exercise,
          direction,
          ...(bookId ? { notebookId: bookId } : {}),
          ...(level ? { level } : {}),
          ...(topic ? { topic } : {}),
          ...(selection ? { ids: selected } : {}),
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
  async function grade(remembered?: boolean) {
    if (!task) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/learning/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          id: task.id,
          locale,
          answer,
          ...(remembered !== undefined ? { remembered } : {}),
        }),
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
  async function flip() {
    if (!task) return;
    setBusy(true);
    try {
      const r = await fetch("/api/learning/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", id: task.id, locale }),
      });
      const data = (await r.json()) as Result & { error?: string };
      if (!r.ok) throw new Error(data.error);
      setResult(data);
      setFlipped(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const languagePair = sourceLanguage !== targetLanguage;
  return (
    <div className="vocabulary-workspace">
      <div className="notebook-toolbar">
        <label>
          {t("Vokabelheft")}
          <Select
            value={bookId}
            disabled={busy}
            onValueChange={(id) => {
              setBookId(id);
              const next = books.find((b) => b.id === id);
              if (next) onPairChange(next.sourceLanguage, next.targetLanguage);
            }}
          >
            <option value="">{t("Gesamter Wortschatz")}</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {languageLabel(b.sourceLanguage, locale)} →{" "}
                {languageLabel(b.targetLanguage, locale)} ({b.count})
              </option>
            ))}
          </Select>
        </label>
        <button
          className="button outline"
          disabled={!ready || busy}
          onClick={() => (owner ? setEditing(true) : login())}
        >
          {t("Neues Vokabelheft")}
        </button>
        {book && (
          <>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setEditing(book)}
            >
              {t("Heft bearbeiten")}
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setRemoving(book)}
            >
              {t("Heft löschen")}
            </button>
          </>
        )}
      </div>
      {book?.description && <p>{book.description}</p>}
      {book && (
        <p className="form-note">
          {t("Fortschritt in der Heft-Hauptrichtung")}:{" "}
          {languageLabel(book.sourceLanguage, locale)} →{" "}
          {languageLabel(book.targetLanguage, locale)}
        </p>
      )}
      {book && (
        <div className="learning-stats">
          <span>
            <strong>{book.count}</strong>
            {t("Wörter im Heft")}
          </span>
          <span>
            <strong>{book.due}</strong>
            {t("fällige Wiederholungen")}
          </span>
          <span>
            <strong>
              {book.practiced} / {book.count}
            </strong>
            {t("bereits geübt")}
          </span>
          <span>
            <strong>{book.mistakes}</strong>
            {t("Fehler insgesamt")}
          </span>
          <span>
            <strong>{book.difficult}</strong>
            {t("schwierige Wörter")}
          </span>
        </div>
      )}
      {book&&!!catalog?.unavailableIds?.length&&<div className="notice"><p>{t('Einige Beiträge wurden entfernt oder passen nicht mehr zur Heftsprache. Dein Lernstand bleibt erhalten.')}</p><button className="button outline" disabled={busy} onClick={()=>void mutation('/api/learning/notebooks/'+book.id+'/items',{action:'remove',revision:book.revision,entryIds:catalog.unavailableIds})}>{t('Nicht mehr verfügbare Wörter entfernen')}</button></div>}
      {!owner && (
        <p className="form-note">
          {t(
            "Du kannst den Wortschatz ohne Konto üben. Für eigene Hefte und dauerhaften Lernfortschritt melde dich an.",
          )}{" "}
          <button className="text-link" onClick={login}>
            {t("Anmelden")}
          </button>
        </p>
      )}
      {!languagePair && (
        <p role="alert">
          {t("Ausgangs- und Zielsprache müssen verschieden sein.")}
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {t(error)}{" "}
          <button
            className="text-link"
            onClick={() => setRefresh((v) => v + 1)}
          >
            {t("Erneut versuchen")}
          </button>
        </p>
      )}
      {task ? (
        <section className="learning-practice" aria-label={t("Vokabelübung")}>
          <p className="kind-pill">
            {languageLabel(task.sourceLanguage, locale)} →{" "}
            {languageLabel(task.targetLanguage, locale)}
          </p>
          <h2>{t("Deine Übung")}</h2>
          <p className="learning-prompt">{task.prompt}</p>
          {result && (
            <div role="status">
              {result.correct !== undefined && (
                <h3>{t(result.correct ? "Richtig!" : "Noch nicht ganz.")}</h3>
              )}
              <p>
                <strong>{t("Richtige Lösungen")}: </strong>
                {result.answers.join(" / ")}
              </p>
              <p>{result.explanation}</p>
              {result.dueAt && (
                <p>
                  {t("Nächste Wiederholung")}:{" "}
                  {new Date(result.dueAt).toLocaleString(locale)}
                </p>
              )}
            </div>
          )}
          {result?.correct !== undefined ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void practice(practiceStatus, onlySelected)}
            >
              {t("Nächste Aufgabe")}
            </button>
          ) : task.exercise === "flashcard" ? (
            flipped ? (
              <div className="learning-actions">
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void grade(false)}
                >
                  {t("Noch einmal lernen")}
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void grade(true)}
                >
                  {t("Gewusst")}
                </button>
              </div>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void flip()}
              >
                {t("Lernkarte aufdecken")}
              </button>
            )
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void grade();
              }}
            >
              <label>
                {t("Deine Antwort")}
                <input
                  lang={task.targetLanguage}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={300}
                  value={answer}
                  disabled={busy}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <button
                className="button primary"
                disabled={busy || !answer.trim()}
              >
                {t("Antwort prüfen")}
              </button>
            </form>
          )}
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setTask(null);
              setResult(null);
            }}
          >
            {t("Übung beenden")}
          </button>
        </section>
      ) : (
        <>
          <div className="learning-filters">
            <label>
              {t("Vokabeln suchen")}
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
              />
            </label>
            <label>
              {t("Lernstatus")}
              <Select value={status} onValueChange={setStatus}>
                <option value="all">{t("Alles")}</option>
                <option value="new">{t("Neu")}</option>
                <option value="due">{t("Jetzt fällig")}</option>
                <option value="difficult">{t("Schwierige Wörter")}</option>
                <option value="known">{t("Bereits gefestigt")}</option>
              </Select>
            </label>
            <label>
              {t("Sortieren")}
              <Select value={sort} onValueChange={setSort}>
                <option value="alpha">{t("Alphabetisch")}</option>
                <option value="recent">{t("Zuletzt hinzugefügt")}</option>
                <option value="due">{t("Fälligkeit")}</option>
                <option value="difficult">{t("Fehlerhäufigkeit")}</option>
              </Select>
            </label>
            <label>
              {t("Lernniveau")}
              <Select value={level} onValueChange={setLevel}>
                <option value="">{t("Alles")}</option>
                {(catalog?.levels ?? ["A1", "A2", "B1", "B2", "C1", "C2"]).map(
                  (l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ),
                )}
              </Select>
            </label>
          </div>
          <label>
            {t("Thema")}
            <Select value={topic} onValueChange={setTopic}>
              <option value="">{t("Alles")}</option>
              {[
                ...new Map(
                  (catalog?.topics ?? cards.map((c) => c.topic)).map(
                    (value) => [value.de || value.en, value],
                  ),
                ).entries(),
              ].map(([key, value]) => (
                <option key={key} value={key}>
                  {value[locale] || value.de || value.en}
                </option>
              ))}
            </Select>
          </label>
          <div className="learning-filters">
            <label>
              {t("Übungsform")}
              <Select
                value={exercise}
                onValueChange={(v) => setExercise(v as typeof exercise)}
              >
                <option value="writing">{t("Übersetzung schreiben")}</option>
                <option value="flashcard">{t("Karteikarten")}</option>
              </Select>
            </label>
            <label>
              {t("Lernrichtung")}
              <Select value={direction} onValueChange={setDirection}>
                <option value="forward">{t("Gewähltes Sprachpaar")}</option>
                <option value="reverse">{t("Umgekehrte Richtung")}</option>
                <option value="both">{t("Beide Richtungen")}</option>
              </Select>
            </label>
          </div>
          <p className="form-note">
            {t(
              "Umgekehrte Abfragen verwenden ausschließlich ausdrücklich dafür freigegebene Übersetzungen. Lernstände gelten pro Wort und Richtung für alle deine Hefte.",
            )}
          </p>
          <div className="learning-actions">
            <button
              className="button primary"
              disabled={busy || !ready || !languagePair || !cards.length}
              onClick={() => void practice()}
            >
              {t(book ? "Heft üben" : "Wortschatz üben")}
            </button>
            <button
              className="button outline"
              disabled={busy || !selected.length}
              onClick={() => void practice("all", true)}
            >
              {t("Auswahl üben")} ({selected.length})
            </button>
            <button
              className="button outline"
              disabled={busy || !owner}
              onClick={() => void practice("due")}
            >
              {t("Fällige Wörter üben")}
            </button>
            <button
              className="button outline"
              disabled={busy || !owner}
              onClick={() => void practice("difficult")}
            >
              {t("Schwierige Wörter üben")}
            </button>
            <button
              className="button outline"
              onClick={contribute}
              disabled={!ready}
            >
              {t("Vokabel beitragen")}
            </button>
          </div>
          {owner && (
            <div className="notebook-selection">
              <label>
                {t("Zielheft")}
                <Select value={destination} onValueChange={setDestination}>
                  <option value="">{t("Bitte auswählen")}</option>
                  {books
                    .filter((b) => b.id !== bookId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </Select>
              </label>
              <button
                className="button outline"
                disabled={busy || !selected.length || !destination}
                onClick={() => void items(book ? "move" : "add")}
              >
                {t(book ? "In Zielheft verschieben" : "In Heft übernehmen")}
              </button>
              {book && (
                <button
                  className="button outline"
                  disabled={busy || !selected.length}
                  onClick={() => void items("remove")}
                >
                  {t("Aus Heft entfernen")}
                </button>
              )}
            </div>
          )}
          {!!cards.length && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={cards.every((c) => selected.includes(c.id))}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [
                          ...new Set([...selected, ...cards.map((c) => c.id)]),
                        ].slice(0, 100)
                      : selected.filter(
                          (id) => !cards.some((c) => c.id === id),
                        ),
                  )
                }
              />
              {t("Sichtbare Wörter auswählen")}
            </label>
          )}
          {loading && !cards.length && (
            <p role="status">{t("Wird geladen …")}</p>
          )}
          {catalog && !cards.length && (
            <p>
              {t(
                book
                  ? "In diesem Heft sind für diese Auswahl noch keine Wörter vorhanden. Wähle im gesamten Wortschatz passende Wörter aus."
                  : "Für dieses bestätigte Sprachpaar sind noch keine Vokabeln vorhanden. Ältere unbestätigte Beiträge bleiben in der Verwaltung erhalten.",
              )}
            </p>
          )}
          <div className="learning-lessons">
            {cards.map((card) => (
              <article className="learning-card" key={card.id}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    aria-label={t("Vokabel auswählen") + ": " + card.source}
                    checked={selected.includes(card.id)}
                    disabled={
                      !selected.includes(card.id) && selected.length >= 100
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, card.id]
                          : selected.filter((id) => id !== card.id),
                      )
                    }
                  />
                  <span>
                    {card.level} ·{" "}
                    {card.topic[locale] || card.topic.de || card.topic.en}
                  </span>
                </label>
                <h2>{card.source}</h2>
                {card.sense && <p>{card.sense}</p>}
                <button
                  className="text-link"
                  aria-expanded={opened.includes(card.id)}
                  onClick={() =>
                    setOpened((old) =>
                      old.includes(card.id)
                        ? old.filter((id) => id !== card.id)
                        : [...old, card.id],
                    )
                  }
                >
                  {t(
                    opened.includes(card.id)
                      ? "Übersetzung ausblenden"
                      : "Übersetzung anzeigen",
                  )}
                </button>
                {opened.includes(card.id) && (
                  <div>
                    <p>
                      <strong>{card.target}</strong>
                    </p>
                    {card.answers.length > 1 && (
                      <p>{card.answers.slice(1).join(" / ")}</p>
                    )}
                    <p>{card.meaning}</p>
                    <p>{card.example}</p>
                        <p className="form-note">{t(card.contentStatus==='curated'?'Startsammlung':'Community-Beitrag')}{card.creditName?' · '+card.creditName:''}</p>
                        {card.sourceUrl&&<a className="text-link" href={card.sourceUrl} target="_blank" rel="noreferrer">{t('Quelle')}</a>}
                        <button className="text-link" onClick={()=>void openEntry(card.id).catch(()=>setError('Der Beitrag konnte nicht geladen werden.'))}>{t('Beitrag öffnen')}</button>
                  </div>
                )}
                <p className="form-note">
                  {t("Antworten")}: {card.attempts} · {t("Fehler insgesamt")}:{" "}
                  {card.lapses}
                  {card.dueAt
                    ? " · " + new Date(card.dueAt).toLocaleDateString(locale)
                    : ""}
                </p>
              </article>
            ))}
          </div>
          {catalog?.more && (
            <button
              className="button outline"
              disabled={loading}
              onClick={() => setOffset((v) => v + 30)}
            >
              {t("Weitere Lernkarten laden")}
            </button>
          )}
        </>
      )}
      {editing && (
        <NotebookDialog
          book={editing === true ? undefined : editing}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          close={() => setEditing(null)}
          saved={() => setRefresh((v) => v + 1)}
        />
      )}
      {removing && (
        <Dialog
          title={t("Vokabelheft löschen?")}
          close={() => setRemoving(null)}
        >
          <p>{removing.name}</p>
          <p>
            {t(
              "Nur das Heft wird entfernt. Vokabeln und dein Lernstand bleiben erhalten.",
            )}
          </p>
          <div className="learning-actions">
            <button
              className="button outline"
              onClick={() => setRemoving(null)}
            >
              {t("Abbrechen")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await mutation(
                    "/api/learning/notebooks/" + removing.id,
                    { revision: removing.revision },
                    "DELETE",
                  )
                ) {
                  if (bookId === removing.id) setBookId("");
                  setRemoving(null);
                }
              }}
            >
              {t("Heft endgültig löschen")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
