"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "./dialog";
type Batch = { id: string; createdAt: string; count: number; canUndo: boolean };
export function BulkHistory({
  refresh,
  onChanged,
}: {
  refresh: number;
  onChanged: () => void;
}) {
  const { t, locale } = useI18n();
  const [batches, setBatches] = useState<Batch[]>([]),
    [selected, setSelected] = useState<Batch | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/bulk", { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as {
          batches: Batch[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        return data.batches;
      })
      .then((data) => {
        setBatches(data);
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError((cause as Error).message);
      });
    return () => controller.abort();
  }, [refresh]);
  async function undo() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undoBatchId: selected.id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setSelected(null);
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="community-inbox">
      <summary>{t("Letzte Sammeländerungen")}</summary>
      <p className="form-note">
        {t(
          "Eine Sammeländerung lässt sich zurücknehmen, solange keiner ihrer Beiträge danach geändert oder gelöscht wurde.",
        )}
      </p>
      {error && !selected && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {!batches.length ? (
        <p>{t("Noch keine Sammeländerungen.")}</p>
      ) : (
        <ul className="inbox-list">
          {batches.map((batch) => (
            <li key={batch.id}>
              <span>
                {new Date(batch.createdAt).toLocaleString(locale)} ·{" "}
                {batch.count} {t("Beiträge")}
              </span>
              <button
                className="button outline"
                disabled={!batch.canUndo}
                onClick={() => {
                  setError("");
                  setSelected(batch);
                }}
              >
                {t("Rückgängig machen")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <Dialog
          title={t("Sammeländerung rückgängig machen?")}
          close={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p>
            {t(
              "Die vorherigen Beitragsarten, Regionen und Spielaufgaben werden gemeinsam wiederhergestellt.",
            )}
          </p>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button outline"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              {t("Abbrechen")}
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void undo()}
            >
              {t("Rückgängig machen")}
            </button>
          </div>
        </Dialog>
      )}
    </details>
  );
}
