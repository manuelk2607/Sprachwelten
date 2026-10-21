"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useApiResource } from "@/lib/use-api-resource";
import { reportReasons, type RoundReport } from "@/lib/round-reports";
import type { Entry } from "@/lib/content";
export function AdminReports({
  refresh,
  onChanged,
  onEdit,
}: {
  refresh: number;
  onChanged: () => void;
  onEdit: (entry: Entry) => void;
}) {
  const { t, locale } = useI18n(),
    [resolved, setResolved] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const resource = useApiResource<{ reports: RoundReport[] }>(
    "/api/admin/reports?resolved=" + resolved,
    String(refresh),
  );
  async function change(report: RoundReport) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/reports/" + report.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: report.revision,
          resolved: !resolved,
        }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error: string }).error);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function edit(id: string) {
    setError("");
    try {
      const r = await fetch("/api/entries/" + id),
        data = (await r.json()) as { entry: Entry; error: string };
      if (!r.ok) throw new Error(data.error);
      onEdit(data.entry);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="community-inbox admin-reports">
      <h2>{t("Meldungen aus Spielrunden")}</h2>
      <label className="report-filter">
        <input
          type="checkbox"
          checked={resolved}
          onChange={(e) => setResolved(e.target.checked)}
        />
        {t("Erledigte Meldungen anzeigen")}
      </label>
      {(error || resource.error) && (
        <p className="error" role="alert">
          {t(error || resource.error)}
        </p>
      )}
      {resource.loading ? (
        <p>{t("Wird geladen …")}</p>
      ) : !resource.data?.reports.length ? (
        <p className="muted">{t("Keine Meldungen in dieser Ansicht.")}</p>
      ) : (
        resource.data.reports.map((report) => (
          <article className="admin-entry" key={report.id}>
            <div>
              <strong>{report.snapshot.phrase || t("Audiobeitrag")}</strong>
              <p>{t(reportReasons[report.reason])}</p>
              {report.note && <p>{report.note}</p>}
              <small>{new Date(report.createdAt).toLocaleString(locale)}</small>
            </div>
            <div className="button-row">
              {report.entryId && (
                <button
                  className="button small outline"
                  disabled={busy}
                  onClick={() => void edit(report.entryId!)}
                >
                  {t("Beitrag bearbeiten")}
                </button>
              )}
              <button
                className="button small outline"
                disabled={busy}
                onClick={() => void change(report)}
              >
                {t(resolved ? "Wieder öffnen" : "Als erledigt markieren")}
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
