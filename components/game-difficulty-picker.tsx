"use client";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useKeyedState } from "@/lib/use-keyed-state";
import {
  difficultyLevels,
  type DifficultyLevel,
} from "@/lib/editorial-difficulty";
import { difficultyLabels } from "@/lib/editorial-review-input";
import type { DifficultySettings } from "@/lib/game-difficulty";
import { Select } from "./select";
export function GameDifficultyPicker({
  mode,
  settings,
  value,
  onChange,
  disabled,
}: {
  mode: string;
  settings: DifficultySettings;
  value?: DifficultyLevel;
  onChange: (v: DifficultyLevel | null) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n(),
    key = JSON.stringify([mode, settings]),
    [levels, setLevels] = useKeyedState<DifficultyLevel[]>(key, []),
    [error, setError] = useKeyedState(key, "");
  const {
    gameLanguages,
    meaningCategory,
    pronunciationCategory,
    attributionCategory,
  } = settings;
  const languages = (gameLanguages ?? []).join(",");
  useEffect(() => {
    if (!languages) return;
    const controller = new AbortController(),
      params = new URLSearchParams({
        mode,
        languages,
        ...(meaningCategory ? { meaningCategory } : {}),
        ...(pronunciationCategory ? { pronunciationCategory } : {}),
        ...(attributionCategory ? { attributionCategory } : {}),
      });
    fetch("/api/rooms/difficulties?" + params, { signal: controller.signal })
      .then(async (r) => {
        const data = (await r.json()) as {
          levels?: DifficultyLevel[];
          error?: string;
        };
        if (!r.ok) throw new Error(data.error);
        return data.levels ?? [];
      })
      .then((data) => {
        if (!controller.signal.aborted)
          setLevels(data.filter((level) => difficultyLevels.includes(level)));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [
    mode,
    languages,
    meaningCategory,
    pronunciationCategory,
    attributionCategory,
    setLevels,
    setError,
  ]);
  if (!levels.length && !value) return null;
  return (
    <div className="form-stack">
      <label>
        {t("Spielstufe")}
        <Select
          value={value ?? ""}
          disabled={disabled}
          onValueChange={(v) => onChange(v ? (v as DifficultyLevel) : null)}
        >
          <option value="">{t("Alle Aufgaben")}</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {t(difficultyLabels[level])}
            </option>
          ))}
        </Select>
      </label>
      {value && !levels.includes(value) && (
        <p className="notice">
          {t(
            "Diese Spielstufe ist nicht mehr freigegeben. Wähle alle Aufgaben oder eine andere Auswahl.",
          )}
          <button
            type="button"
            className="text-link"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            {t("Alle Aufgaben verwenden")}
          </button>
        </p>
      )}
      {value && error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
    </div>
  );
}
