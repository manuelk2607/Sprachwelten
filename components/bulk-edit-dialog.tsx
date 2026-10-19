"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { kindLabels } from "@/lib/content";
import { contexts } from "@/lib/quiz-categories";
import { Dialog } from "./dialog";
import { RegionPicker } from "./region-picker";
import { Select } from "./select";
export function BulkEditDialog({
  entries,
  close,
  saved,
}: {
  entries: { id: string; revision: number }[];
  close: () => void;
  saved: () => void;
}) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState(""),
    [regionId, setRegion] = useState(""),
    [contextId, setContext] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          kind: kind || undefined,
          regionId: regionId || undefined,
          contextId: contextId || undefined,
        }),
      });
      const data = (await r.json()) as { error: string };
      if (!r.ok) throw new Error(data.error);
      saved();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={t("Auswahl bearbeiten")}
      close={() => {
        if (!busy) close();
      }}
    >
      <p>
        {entries.length} {t("ausgewählte Beiträge")}
      </p>
      <p className="muted">
        {t(
          "Nur gewählte Felder werden geändert. Passende Spielaufgaben bleiben erhalten; inkompatible Änderungen werden blockiert. Alle Änderungen werden gemeinsam gespeichert und können später rückgängig gemacht werden.",
        )}
      </p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          {t("Art des Beitrags")}
          <Select value={kind} onValueChange={setKind}>
            <option value="">{t("Unverändert lassen")}</option>
            {(
              [
                "idiom",
                "dialect",
                "word",
                "situation",
                "tongue_twister",
              ] as const
            ).map((k) => (
              <option value={k} key={k}>
                {t(kindLabels[k])}
              </option>
            ))}
          </Select>
        </label>
        <RegionPicker
          value={regionId}
          onChange={setRegion}
          allowCreate={false}
          unchanged
        />
        <label>
          {t("Gesprächskontext:")}
          <Select value={contextId} onValueChange={setContext}>
            <option value="">{t("Unverändert lassen")}</option>
            {Object.entries(contexts).map(([id, label]) => (
              <option key={id} value={id}>
                {label[locale]}
              </option>
            ))}
          </Select>
        </label>
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={close}
          >
            {t("Abbrechen")}
          </button>
          <button
            className="button primary"
            disabled={busy || !(kind || regionId || contextId)}
          >
            {t(busy ? "Wird gespeichert …" : "Änderungen für alle speichern")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
