"use client";
import {PhraseText} from "./phrase-text";
import { useApiResource } from "@/lib/use-api-resource";
import { useKeyedState } from "@/lib/use-keyed-state";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth/provider";
import { useI18n } from "@/lib/i18n";
import { kindLabels, type Entry } from "@/lib/content";
import { MySuggestions } from "./my-suggestions";
import { Dialog } from "./dialog";
import { Header } from "./header";
import { AuthDialog } from "./auth-dialog";
import { ContributeDialog } from "./contribute-dialog";
import { Search } from "lucide-react";
export function MyContributions() {
  const { t } = useI18n(),
    session = useAuthSession(),
    userId = session?.user?.id;
  const [tab, setTab] = useState<"entries" | "suggestions">("entries"),
    [verify, setVerify] = useState(false),
    [removing, setRemoving] = useKeyedState<Entry | null>(userId ?? "", null),
    [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState(false),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useKeyedState<Entry | null>(userId ?? "", null);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [error, setError] = useKeyedState(
    JSON.stringify([userId, search, offset, refresh]),
    "",
  );
  useEffect(() => {
    if (query.trim() === search) return;
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);
  const resource = useApiResource<{ entries: Entry[]; more: boolean }>(
    userId
      ? "/api/me/entries?" +
          new URLSearchParams({ offset: String(offset), q: search })
      : null,
    userId + ":" + refresh,
  );
  const entries = resource.data?.entries ?? [],
    more = resource.data?.more ?? false,
    loading = resource.loading,
    failure = error || resource.error;
  async function remove() {
    if (!removing) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/me/entries/" + removing.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: removing.revision }),
      });
      const data = (await r.json()) as { error: string };
      if (!r.ok) throw new Error(data.error);
      setRemoving(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header active="me" onLogin={() => setAuth(true)} />
      <main className="admin-panel">
        <a className="text-link" href="/">
          ← {t("Zur Startseite")}
        </a>
        <h1>{t("Meine Beiträge")}</h1>
        <p className="muted">
          {t("Eigene Beiträge kannst du direkt bearbeiten.")}
        </p>
        {session?.user && (
          <div className="account-verification">
            <span>
              {t(
                session.user.emailVerified
                  ? "E-Mail bestätigt"
                  : "E-Mail noch nicht bestätigt",
              )}
            </span>
            {!session.user.emailVerified && (
              <button
                className="button outline"
                onClick={() => setVerify(true)}
              >
                {t("E-Mail bestätigen")}
              </button>
            )}
          </div>
        )}
        {session?.user && (
          <div
            className="dialog-actions"
            role="group"
            aria-label={t("Meine Inhalte")}
          >
            <button
              className={"button " + (tab === "entries" ? "dark" : "outline")}
              aria-pressed={tab === "entries"}
              onClick={() => setTab("entries")}
            >
              {t("Beiträge")}
            </button>
            <button
              className={
                "button " + (tab === "suggestions" ? "dark" : "outline")
              }
              aria-pressed={tab === "suggestions"}
              onClick={() => setTab("suggestions")}
            >
              {t("Verbesserungsvorschläge")}
            </button>
          </div>
        )}
        {session?.user && tab === "entries" && (
          <div className="own-entry-search">
            <label htmlFor="own-entry-query">
              {t("Eigene Beiträge durchsuchen")}
            </label>
            <div>
              <Search size={18} />
              <input
                id="own-entry-query"
                type="search"
                maxLength={200}
                placeholder={t("Wort, Übersetzung oder Erklärung")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        )}
        {!session?.user ? (
          <button className="button dark" onClick={() => setAuth(true)}>
            {t("Anmelden")}
          </button>
        ) : tab === "suggestions" ? (
          <MySuggestions key={session.user.id} userId={session.user.id} />
        ) : loading ? (
          <p role="status">{t("Wird geladen …")}</p>
        ) : (
          <>
            <div className="admin-entries">
              {entries.map((entry) => (
                <article key={entry.id} className="admin-entry">
                  <div>
                    <span className="kind-pill">
                      {t(kindLabels[entry.kind])}
                    </span>
                    <h2>{entry.phrase ? <PhraseText entry={entry}/> : t("Audiobeitrag")}</h2>
                    {entry.sense && (
                      <p className="form-note">
                        {t("Bedeutungsvariante")}: {entry.sense}
                      </p>
                    )}
                    <p>{entry.literal}</p>
                  </div>
                  <div className="admin-entry-actions">
                    <button
                      className="button outline"
                      onClick={() => setEditing(entry)}
                    >
                      {t("Bearbeiten")}
                    </button>
                    <button
                      className="button outline"
                      onClick={() => setRemoving(entry)}
                    >
                      {t("Löschen")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!entries.length && (
              <p role="status">
                {t(
                  search
                    ? "Keine eigenen Beiträge zu dieser Suche gefunden."
                    : "Keine Ergebnisse.",
                )}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button outline"
                disabled={!offset}
                onClick={() => setOffset((v) => Math.max(0, v - 30))}
              >
                {t("Zurück")}
              </button>
              <button
                className="button outline"
                disabled={!more}
                onClick={() => setOffset((v) => v + 30)}
              >
                {t("Weiter")}
              </button>
            </div>
          </>
        )}
        {failure && (
          <p className="error" role="alert">
            {t(failure)}
          </p>
        )}
      </main>
      {verify && (
        <AuthDialog
          initial="verify"
          email={session?.user.email}
          close={() => setVerify(false)}
        />
      )}
      {removing && (
        <Dialog
          title={t("Eigenen Beitrag löschen?")}
          close={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <p>{removing.phrase || t("Audiobeitrag")}</p>
          <p>
            {t(
              "Der Beitrag wird aus der Sammlung und neuen Spielen entfernt. Die Administration kann ihn wiederherstellen.",
            )}
          </p>
          {failure && <p className="error">{t(failure)}</p>}
          <div className="dialog-actions">
            <button
              className="button outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              {t("Abbrechen")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("Löschen")}
            </button>
          </div>
        </Dialog>
      )}
      {auth && <AuthDialog close={() => setAuth(false)} />}{" "}
      {editing && (
        <ContributeDialog
          initialEntry={editing}
          editTarget="own"
          close={() => setEditing(null)}
          saved={() => setRefresh((v) => v + 1)}
          openExisting={async () => {}}
        />
      )}
    </>
  );
}
