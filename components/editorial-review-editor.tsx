"use client";
import { useRef, useState } from "react";
import type { Entry } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { difficultyLevels } from "@/lib/editorial-difficulty";
import {
  editorialReviewInput,
  difficultyLabels,
  type StoredEditorialReview,
} from "@/lib/editorial-review-input";
import { Select } from "./select";
import { FormErrors, useFormErrors, type FieldIssue } from "./form-errors";
type State = {
  entryRevision: number;
  review: StoredEditorialReview | null;
  effective: boolean;
  availability: { counts: Record<string, number> };
};
export function EditorialReviewEditor({ entry }: { entry: Entry }) {
  const { t } = useI18n(),
    form = useRef<HTMLFormElement>(null),
    validation = useFormErrors(form);
  const [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [level, setLevel] =
      useState<(typeof difficultyLevels)[number]>("introductory"),
    [reviewed, setReviewed] = useState(false),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [sources, setSources] = useState(
      entry.sourceUrl.startsWith("https:") ? entry.sourceUrl : "",
    ),
    [rationale, setRationale] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/entries/" + entry.id + "/difficulty");
      const data = (await r.json()) as State & { error?: string };
      if (!r.ok) throw new Error(data.error);
      setState(data);
      const review = data.review;
      if (review) {
        setLevel(review.level);
        setReviewed(data.effective);
        setDate(review.reviewedAt);
        setSources(review.sources.join("\n"));
        setRationale(review.rationale);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const stale = !!state && state.entryRevision !== entry.revision;
  return (
    <details
      className="editorial-review"
      onToggle={(event) => {
        if (event.currentTarget.open && !state && !busy) void load();
      }}
    >
      <summary>{t("Redaktionelle Spielstufe")}</summary>
      <p className="form-note">
        {t(
          "Diese Einstufung bezieht sich auf die gespeicherte Fassung. Änderungen am Beitrag machen die Freigabe ungültig.",
        )}
      </p>
      <p className="form-note">
        {t(
          "Eine Spielstufe benötigt mindestens 20 fachlich geprüfte Karten je Sprache und Kategorie. Lernniveaus bleiben davon getrennt.",
        )}
      </p>
      {state?.review && !state.effective && (
        <p className="notice">
          {t(
            "Diese Einstufung ist nicht freigegeben oder gehört zu einer älteren Fassung.",
          )}
        </p>
      )}
      {state && (
        <p className="form-note">
          {t("Fachlich freigegebene Karten in dieser Kategorie und Sprache")}:{" "}
          {state.availability.counts[level] ?? 0} / 20
        </p>
      )}
      {stale && (
        <p className="error">
          {t("Der Beitrag wurde inzwischen geändert. Bitte neu laden.")}
        </p>
      )}
      {busy && <p role="status">{t("Wird geladen …")}</p>}
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {!state && !busy && (
        <button
          type="button"
          className="button outline small"
          onClick={() => void load()}
        >
          {t("Erneut versuchen")}
        </button>
      )}
      {state && (
        <form
          ref={form}
          className="form-stack"
          onInvalidCapture={validation.invalid}
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            validation.clear();
            setError("");
            setNotice("");
            const parsed = editorialReviewInput.safeParse({
              entryRevision: entry.revision,
              reviewRevision: state.review?.reviewRevision ?? 0,
              level,
              reviewed,
              reviewedAt: date,
              sources: sources
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              rationale,
            });
            if (!parsed.success) {
              validation.report(
                parsed.error.issues.map((issue) => ({
                  path: issue.path.map((key) =>
                    typeof key === "symbol" ? String(key) : key,
                  ),
                  message: issue.message,
                })),
              );
              return;
            }
            setBusy(true);
            try {
              const r = await fetch(
                "/api/admin/entries/" + entry.id + "/difficulty",
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(parsed.data),
                },
              );
              const data = (await r.json()) as {
                error?: string;
                issues?: FieldIssue[];
              };
              if (!r.ok) {
                if (data.issues) validation.report(data.issues);
                throw new Error(data.error);
              }
              await load();
              setNotice("Einstufung gespeichert.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormErrors form={form} issues={validation.issues} />
          <div className="form-row">
            <label>
              {t("Spielstufe")}
              <Select
                name="level"
                value={level}
                disabled={busy || stale}
                onValueChange={(value) => setLevel(value as typeof level)}
              >
                {difficultyLevels.map((value) => (
                  <option key={value} value={value}>
                    {t(difficultyLabels[value])}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              {t("Prüfdatum")}
              <input
                name="reviewedAt"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy || stale}
              />
            </label>
          </div>
          <label>
            {t("Quellen (eine HTTPS-Adresse pro Zeile)")}
            <textarea
              name="sources"
              required
              rows={3}
              maxLength={4008}
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              disabled={busy || stale}
            />
          </label>
          <label>
            {t("Begründung der Einstufung")}
            <textarea
              name="rationale"
              required
              minLength={20}
              maxLength={1500}
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              disabled={busy || stale}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={busy || stale}
            />
            {t(
              "Ich habe Bedeutung, Region, Antworten und Schwierigkeitsstufe fachlich geprüft.",
            )}
          </label>
          <button className="button outline" disabled={busy || stale}>
            {t("Einstufung speichern")}
          </button>
        </form>
      )}
      {notice && <p role="status">{t(notice)}</p>}
    </details>
  );
}
