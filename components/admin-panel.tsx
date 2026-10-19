"use client";
import { useApiResource } from "@/lib/use-api-resource";
import { useKeyedState } from "@/lib/use-keyed-state";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth/provider";
import { useI18n } from "@/lib/i18n";
import { kindLabels, type Entry } from "@/lib/content";
import type { AdminEntry, AdminUser } from "@/lib/admin-types";
import { AdminInbox } from "./admin-inbox";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { BulkHistory } from "./bulk-history";
import { Header } from "./header";
import { AuthDialog } from "./auth-dialog";
import { ContributeDialog } from "./contribute-dialog";
import { Dialog } from "./dialog";
import { Select } from "./select";
export function AdminPanel() {
  const { t, locale } = useI18n(),
    session = useAuthSession();
  const [auth, setAuth] = useState(false),
    [tab, setTab] = useState<"entries" | "users">("entries"),
    [removed, setRemoved] = useState(false),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState<Entry | null>(null),
    [confirm, setConfirm] = useState<AdminEntry | null>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const userId = session?.user?.id;
  const [error, setError] = useKeyedState(
    JSON.stringify([userId, tab, removed, search, offset, refresh]),
    "",
  );
  const resource = useApiResource<{
    entries?: AdminEntry[];
    users?: AdminUser[];
    more: boolean;
  }>(
    userId
      ? "/api/admin/" +
          tab +
          "?" +
          new URLSearchParams({
            q: search,
            offset: String(offset),
            removed: String(removed),
          })
      : null,
    userId + ":" + refresh,
  );
  const entries = resource.data?.entries ?? [],
    users = resource.data?.users ?? [],
    more = resource.data?.more ?? false,
    loading = resource.loading,
    failure = error || resource.error;
  async function moderate() {
    if (!confirm) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/entries/" + confirm.id, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: confirm.revision,
          restore: !!confirm.deletedAt,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setConfirm(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const [selected, setSelected] = useKeyedState<Record<string, number>>(
      JSON.stringify([userId, tab, removed, search, offset, refresh]),
      {},
    ),
    [bulk, setBulk] = useState(false);
  const date = (value: string | null) =>
    value ? new Date(value).toLocaleString(locale) : "—";
  return (
    <>
      <Header active="admin" onLogin={() => setAuth(true)} />
      <main className="admin-panel">
        <a href="/" className="text-link">
          ← {t("Zur Startseite")}
        </a>
        <h1>{t("Administration")}</h1>
        <p className="muted">
          {t("Beiträge verwalten und registrierte Konten einsehen.")}
        </p>
        {!session?.user ? (
          <div className="empty-state">
            <p>{t("Bitte melde dich an, um den Admin-Bereich zu öffnen.")}</p>
            <button className="button dark" onClick={() => setAuth(true)}>
              {t("Anmelden")}
            </button>
          </div>
        ) : (
          <>
            <AdminInbox
              refresh={refresh}
              onChanged={() => {
                setRefresh((v) => v + 1);
                window.dispatchEvent(new Event("sprachwelten-inbox"));
              }}
              onEdit={setEditing}
            />
            <BulkHistory
              refresh={refresh}
              onChanged={() => setRefresh((v) => v + 1)}
            />
            <div className="admin-toolbar">
              <div
                className="admin-tabs"
                role="group"
                aria-label={t("Admin-Ansicht")}
              >
                <button
                  className={
                    "button " + (tab === "entries" ? "dark" : "outline")
                  }
                  onClick={() => {
                    setTab("entries");
                    setOffset(0);
                  }}
                >
                  {t("Beiträge")}
                </button>
                <button
                  className={"button " + (tab === "users" ? "dark" : "outline")}
                  onClick={() => {
                    setTab("users");
                    setOffset(0);
                  }}
                >
                  {t("Registrierte Konten")}
                </button>
              </div>
              <label>
                {t("Suchen")}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(
                    tab === "users"
                      ? "Name oder E-Mail"
                      : "Ausdruck, Übersetzung oder Name",
                  )}
                />
              </label>
              {tab === "entries" && (
                <label>
                  {t("Status")}
                  <Select
                    value={removed ? "removed" : "active"}
                    onValueChange={(v) => {
                      setRemoved(v === "removed");
                      setOffset(0);
                    }}
                  >
                    <option value="active">
                      {t("Veröffentlichte Beiträge")}
                    </option>
                    <option value="removed">{t("Entfernte Beiträge")}</option>
                  </Select>
                </label>
              )}
            </div>
            {tab === "entries" &&
              !removed &&
              entries.length > 0 &&
              !failure && (
                <div className="bulk-toolbar">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        entries.length > 0 &&
                        entries.every((e) => e.id in selected)
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Object.fromEntries(
                                entries.map((entry) => [
                                  entry.id,
                                  entry.revision,
                                ]),
                              )
                            : {},
                        )
                      }
                    />
                    {t("Alle auf dieser Seite auswählen")}
                  </label>
                  <button
                    className="button outline"
                    disabled={!Object.keys(selected).length}
                    onClick={() => setBulk(true)}
                  >
                    {t("Auswahl bearbeiten")} ({Object.keys(selected).length})
                  </button>
                </div>
              )}
            {failure && (
              <p className="error" role="alert">
                {t(failure)}
              </p>
            )}
            {loading ? (
              <p role="status">{t("Wird geladen …")}</p>
            ) : (
              !failure && (
                <>
                  {tab === "entries" ? (
                    <div className="admin-entries">
                      {entries.map((entry) => (
                        <article className="admin-entry" key={entry.id}>
                          <div>
                            {!removed && (
                              <label className="entry-select">
                                <input
                                  type="checkbox"
                                  aria-label={
                                    t("Beitrag auswählen") +
                                    ": " +
                                    (entry.phrase || t("Audiobeitrag"))
                                  }
                                  checked={entry.id in selected}
                                  onChange={(e) =>
                                    setSelected((previous) => {
                                      const next = { ...previous };
                                      if (e.target.checked)
                                        next[entry.id] = entry.revision;
                                      else delete next[entry.id];
                                      return next;
                                    })
                                  }
                                />
                                {t("Auswählen")}
                              </label>
                            )}
                            <span className="kind-pill">
                              {t(kindLabels[entry.kind])}
                            </span>
                            <h2>{entry.phrase || t("Audiobeitrag")}</h2>
                            {entry.sense && (
                              <p className="form-note">
                                {t("Bedeutungsvariante")}: {entry.sense}
                              </p>
                            )}
                            <p>
                              <strong>{t("Wörtliche Übersetzung")}: </strong>
                              {entry.literal || "—"}
                            </p>
                            {entry.meaning && <p>{entry.meaning}</p>}
                            <p className="muted">
                              {entry.language} · {date(entry.createdAt)}
                              {entry.creditName
                                ? " · " + t("Von") + " " + entry.creditName
                                : ""}
                            </p>
                            <p className="form-note">
                              {t("Konto (nur intern)")}:{" "}
                              {entry.authorName || t("Startsammlung")}
                            </p>
                          </div>
                          <div className="admin-entry-actions">
                            {!entry.deletedAt && (
                              <button
                                className="button outline"
                                onClick={() => setEditing(entry)}
                              >
                                {t("Bearbeiten")}
                              </button>
                            )}
                            <button
                              className="button outline"
                              onClick={() => setConfirm(entry)}
                            >
                              {t(
                                entry.deletedAt
                                  ? "Wiederherstellen"
                                  : "Löschen",
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="form-note">
                        {t(
                          "Hier stehen registrierte Konten. Die letzte Anmeldung ist keine Live-Anwesenheitsanzeige.",
                        )}
                      </p>
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              {[
                                "Name",
                                "E-Mail",
                                "Registriert am",
                                "Letzte Anmeldung",
                                "E-Mail bestätigt",
                                "Zugriff",
                              ].map((v) => (
                                <th key={v}>{t(v)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => (
                              <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{date(user.createdAt)}</td>
                                <td>{date(user.lastSignIn)}</td>
                                <td>{t(user.emailVerified ? "Ja" : "Nein")}</td>
                                <td>
                                  {t(user.isAdmin ? "Admin" : "Mitglied")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {(tab === "entries" ? !entries.length : !users.length) && (
                    <p>{t("Keine Ergebnisse.")}</p>
                  )}
                  <div className="dialog-actions">
                    <button
                      className="button outline"
                      disabled={!offset}
                      onClick={() => setOffset((v) => Math.max(0, v - 30))}
                    >
                      {t("Zurück")}
                    </button>
                    <span>
                      {t("Seite")} {Math.floor(offset / 30) + 1}
                    </span>
                    <button
                      className="button outline"
                      disabled={!more}
                      onClick={() => setOffset((v) => v + 30)}
                    >
                      {t("Weiter")}
                    </button>
                  </div>
                </>
              )
            )}
          </>
        )}
      </main>
      {auth && <AuthDialog close={() => setAuth(false)} />}{" "}
      {editing && (
        <ContributeDialog
          initialEntry={editing}
          close={() => setEditing(null)}
          saved={() => setRefresh((v) => v + 1)}
          openExisting={async () => {}}
        />
      )}
      {bulk && (
        <BulkEditDialog
          entries={Object.entries(selected).map(([id, revision]) => ({
            id,
            revision,
          }))}
          close={() => setBulk(false)}
          saved={() => setRefresh((v) => v + 1)}
        />
      )}
      {confirm && (
        <Dialog
          title={t(
            confirm.deletedAt
              ? "Beitrag wiederherstellen?"
              : "Beitrag löschen?",
          )}
          close={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>{confirm.phrase || t("Audiobeitrag")}</p>
          <p className="muted">
            {t(
              confirm.deletedAt
                ? "Der Beitrag erscheint danach wieder öffentlich und in neuen Spielen."
                : "Der Beitrag verschwindet aus der Sammlung und aus neuen Spielen. Du kannst ihn unter Entfernte Beiträge wiederherstellen. Bereits laufende Runden behalten ihre Karten.",
            )}
          </p>
          {failure && (
            <p className="error" role="alert">
              {t(failure)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              {t("Abbrechen")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void moderate()}
            >
              {t(confirm.deletedAt ? "Wiederherstellen" : "Löschen")}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
