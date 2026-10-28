"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { languageLabel } from "@/lib/language-label";
import { useKeyedState } from "@/lib/use-keyed-state";
import {GameDifficultyPicker} from './game-difficulty-picker';
import type {DifficultyLevel} from '@/lib/editorial-difficulty';
type Count = { code: string; count: number;reviewedCount?:number };
export function GameLanguagePicker({
  mode,
  value,
  onChange,
  disabled = false,
  meaningCategory,
  pronunciationCategory,
  attributionCategory,
  remember = false,
  difficulty,onDifficultyChange,
}: {
  mode: string;
  value?: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  meaningCategory?: string;
  pronunciationCategory?: string;
  attributionCategory?: string;
  remember?: boolean;
  difficulty?:DifficultyLevel;onDifficultyChange?:(value:DifficultyLevel|null)=>void;
}) {
  const { t, locale } = useI18n(),
    [search, setSearch] = useState("");
  const key = JSON.stringify([
    mode,
    meaningCategory,
    pronunciationCategory,
    attributionCategory,
  ]);
  const [counts, setCounts] = useKeyedState<Count[] | null>(key, null),
    [error, setError] = useKeyedState(key, "");
  const base = JSON.stringify([key, value]);
  const [pending, setPending] = useState<{
    base: string;
    value: string[];
  } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reconcile optimistic checkboxes after the central room mutation completes or fails.
    if (!disabled) setPending(null);
  }, [disabled, base]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      mode,
      ...(meaningCategory ? { meaningCategory } : {}),
      ...(pronunciationCategory ? { pronunciationCategory } : {}),
      ...(attributionCategory ? { attributionCategory } : {}),
    });
    fetch("/api/rooms/languages?" + params, { signal: controller.signal })
      .then(async (r) => {
        const data = (await r.json()) as { languages: Count[]; error?: string };
        if (!r.ok) throw new Error(data.error);
        return data.languages;
      })
      .then((data) => {
        if (!controller.signal.aborted) setCounts(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [
    key,
    mode,
    meaningCategory,
    pronunciationCategory,
    attributionCategory,
    setCounts,
    setError,
  ]);
  const selected =
    (pending?.base === base ? pending.value : undefined) ??
    value ??
    (mode === "tongue-twisters" || mode === "taboo"
      ? [locale]
      : (counts ?? []).map((v) => v.code));
  const change = (next: string[]) => {
    setPending({ base, value: next });
    onChange(next);
    if (remember)
      try {
        localStorage.setItem(
          "sprachwelten-game-languages:" + mode,
          JSON.stringify(next),
        );
      } catch {}
  };
  useEffect(() => {
    if (!remember || value || !counts?.length) return;
    let saved: string[] = [];
    try {
      const raw = JSON.parse(
        localStorage.getItem("sprachwelten-game-languages:" + mode) ?? "null",
      );
      if (Array.isArray(raw))
        saved = raw
          .filter(
            (code: unknown): code is string =>
              typeof code === "string" && counts.some((c) => c.code === code),
          )
          .slice(0, 64);
    } catch {}
    const fallback =
      mode === "tongue-twisters" || mode === "taboo"
        ? counts.some((c) => c.code === locale)
          ? [locale]
          : []
        : counts.map((c) => c.code);
    if (saved.length || fallback.length)
      onChange(saved.length ? saved : fallback);
  }, [remember, value, counts, mode, locale, onChange]);
  const codes = [
    ...new Set([...(counts ?? []).map((v) => v.code), ...selected]),
  ];
  return (
    <fieldset className="language-set game-language-picker" disabled={disabled}>
      <legend>{t("Sprachen im Spiel")}</legend>
      <p className="form-note">
        {t(
          "Nur Aufgaben aus diesen Sprachen werden verwendet. Die Auswahl gilt für den ganzen Raum.",
        )}
      </p>
      {mode === "language-quiz" && (
        <p className="form-note">
          {t("Das Sprachenquiz benötigt mindestens vier ausgewählte Sprachen.")}
        </p>
      )}
      {mode === "false-friends" && (
        <p className="form-note">
          {t(
            "Bei Wortpaaren müssen beide Sprachen ausgewählt sein. Die Mengen zählen die Beteiligung an Paaren.",
          )}
        </p>
      )}
      <label>
        {t("Sprachen suchen")}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="text-link"
        disabled={!counts?.length}
        onClick={() => change(counts!.map((c) => c.code))}
      >
        {t("Alle verfügbaren Sprachen auswählen")}
      </button>
      {error && <p role="alert">{t(error)}</p>}
      {!counts && !error && <p role="status">{t("Wird geladen …")}</p>}
      {counts && !counts.length && (
        <p>{t("Keine Aufgaben in dieser Auswahl vorhanden.")}</p>
      )}
      <div className="language-set-options">
        {codes
          .filter((code) =>
            `${code} ${languageLabel(code, locale)}`
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase()),
          )
          .map((code) => (
            <label className="language-set-option" key={code}>
              <input
                type="checkbox"
                checked={selected.includes(code)}
                disabled={
                  selected.includes(code) &&
                  selected.length <= (mode === "language-quiz" ? 4 : 1)
                }
                onChange={(e) =>
                  change(
                    e.target.checked
                      ? [...selected, code]
                      : selected.filter((c) => c !== code),
                  )
                }
              />
              {languageLabel(code, locale)}{" "}
              <span>({counts?.find((v) => v.code === code)?.count ?? 0})</span>
            </label>
          ))}
      </div>
      {onDifficultyChange&&(difficulty||(counts??[]).some(c=>(c.reviewedCount??0)>=20))&&<GameDifficultyPicker mode={mode} settings={{gameLanguages:selected,meaningCategory,pronunciationCategory,attributionCategory}} value={difficulty} onChange={onDifficultyChange} disabled={disabled}/>}
    </fieldset>
  );
}
