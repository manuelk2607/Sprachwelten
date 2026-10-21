"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { GameView } from "@/lib/game";
import { reportReasons } from "@/lib/round-reports";
import { Dialog } from "./dialog";
import { Select } from "./select";
export function RoundReportButton({
  room,
  token,
}: {
  room: GameView;
  token: string;
}) {
  const { t } = useI18n(),
    [open, setOpen] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reason, setReason] = useState("answer");
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const note = new FormData(e.currentTarget).get("note");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/rooms/" + room.code + "/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          matchId: room.matchId,
          roundNumber: room.roundNumber,
          reason,
          note,
        }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error: string }).error);
      setSent(true);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="button small outline"
        disabled={sent}
        onClick={() => setOpen(true)}
      >
        {t(sent ? "Problem gemeldet" : "Problem mit dieser Aufgabe melden")}
      </button>
      {open && (
        <Dialog title={t("Problem melden")} close={() => setOpen(false)}>
          <p>{room.prompt?.phrase || t("Audiobeitrag")}</p>
          <form className="form-stack" onSubmit={send}>
            <label>
              {t("Was stimmt nicht?")}
              <Select value={reason} onValueChange={setReason}>
                {Object.entries(reportReasons).map(([id, label]) => (
                  <option key={id} value={id}>
                    {t(label)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              {t("Dein Hinweis")} · {t("(optional)")}
              <textarea name="note" maxLength={1000} rows={4} />
            </label>
            {error && (
              <p className="error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="button dark" disabled={busy}>
              {t("Meldung senden")}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
