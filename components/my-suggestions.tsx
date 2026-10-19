"use client";
import { useState } from "react";
import { useApiResource } from "@/lib/use-api-resource";
import { useI18n } from "@/lib/i18n";
type Suggestion = {
  id: string;
  entryId: string;
  phrase: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  feedback: string;
};
const statusLabels = {
  pending: "In Prüfung",
  accepted: "Übernommen",
  rejected: "Abgelehnt",
} as const;
export function MySuggestions({ userId }: { userId: string }) {
  const { t, locale } = useI18n(),
    [offset, setOffset] = useState(0),
    [refresh, setRefresh] = useState(0);
  const resource = useApiResource<{ suggestions: Suggestion[]; more: boolean }>(
    "/api/me/suggestions?offset=" + offset,
    userId + ":" + refresh,
  );
  const items = resource.data?.suggestions ?? [],
    more = resource.data?.more ?? false,
    loading = resource.loading,
    error = resource.error;
  return (
    <section aria-label={t("Meine Verbesserungsvorschläge")}>
      <div className="inbox-heading">
        <h2>{t("Meine Verbesserungsvorschläge")}</h2>
        <button
          className="button outline"
          onClick={() => setRefresh((v) => v + 1)}
        >
          {t("Aktualisieren")}
        </button>
      </div>
      <p className="form-note">
        {t(
          "Hier siehst du den Prüfstatus deiner Vorschläge und die Rückmeldung der Administration.",
        )}
      </p>
      {loading ? (
        <p role="status">{t("Wird geladen …")}</p>
      ) : error ? (
        <p className="error" role="alert">
          {t(error)}
        </p>
      ) : (
        <>
          <div className="admin-entries">
            {items.map((s) => (
              <article key={s.id} className="admin-entry">
                <div>
                  <span className="kind-pill">{t(statusLabels[s.status])}</span>
                  <h3>{s.phrase || t("Audiobeitrag")}</h3>
                  <p className="form-note">
                    {t("Eingereicht")}:{" "}
                    {new Date(s.createdAt).toLocaleString(locale)}
                    {s.reviewedAt && (
                      <>
                        {" "}
                        · {t("Geprüft")}:{" "}
                        {new Date(s.reviewedAt).toLocaleString(locale)}
                      </>
                    )}
                  </p>
                  {s.feedback && (
                    <blockquote>
                      <strong>{t("Rückmeldung")}</strong>
                      <p>{s.feedback}</p>
                    </blockquote>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!items.length && (
            <p>
              {t("Du hast noch keine Verbesserungsvorschläge eingereicht.")}
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
    </section>
  );
}
