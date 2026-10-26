"use client";
import { useI18n } from "@/lib/i18n";
import {
  learningLevels,
  type LearningChallenge,
  type LearningQuestion,
} from "@/lib/learning-content";
import { Select } from "./select";
import { BilingualField } from "./bilingual-field";
export const emptyLearningQuestion = (): LearningQuestion => ({
  id: crypto.randomUUID().slice(0, 8),
  exercise: "writing",
  prompt: { de: "", en: "" },
  answers: [""],
  choices: [],
  explanation: { de: "", en: "" },
});
export function LearningEditor({
  value,
  onChange,
}: {
  value: LearningChallenge;
  onChange: (v: LearningChallenge) => void;
}) {
  const { t } = useI18n();
  const update = (index: number, patch: Partial<LearningQuestion>) =>
    onChange({
      ...value,
      questions: value.questions.map((q, i) =>
        i === index ? { ...q, ...patch } : q,
      ),
    });
  return (
    <div className="learning-editor">
      <BilingualField
        label="Thema"
        path="challenge.topic"
        value={value.topic}
        onChange={(topic) => onChange({ ...value, topic })}
      />
      <label>
        {t("Lernniveau")}
        <Select
          name="challenge.level"
          value={value.level}
          onValueChange={(level) =>
            onChange({ ...value, level: level as LearningChallenge["level"] })
          }
        >
          {learningLevels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </Select>
      </label>
      <p className="form-note">
        {t(
          "Gib eindeutige Lösungen und eine hilfreiche Rückmeldung an. Weitere richtige Schreibweisen werden ausdrücklich als Alternativen hinterlegt.",
        )}
      </p>
      {value.questions.map((q, index) => (
        <fieldset key={q.id} className="learning-question-editor">
          <legend>
            {t("Übung")} {index + 1}
          </legend>
          <label>
            {t("Übungsart")}
            <Select
              name={"challenge.questions." + index + ".exercise"}
              value={q.exercise}
              onValueChange={(exercise) =>
                update(index, {
                  exercise: exercise as LearningQuestion["exercise"],
                })
              }
            >
              <option value="recall">{t("Lernkarte & Abfrage")}</option>
              <option value="writing">{t("Schreibübung")}</option>
              <option value="gap">{t("Lückentext")}</option>
              <option value="completion">{t("Satzergänzung")}</option>
              <option value="comprehension">{t("Verständnisfrage")}</option>
            </Select>
          </label>
          <BilingualField
            label="Aufgabenstellung"
            path={"challenge.questions." + index + ".prompt"}
            value={q.prompt}
            onChange={(prompt) => update(index, { prompt })}
          />
          {q.exercise === "gap" && (
            <p className="form-note">{t("Markiere die Lücke mit ___.")}</p>
          )}
          <label>
            {t("Richtige Lösungen (eine pro Zeile)")}
            <textarea
              name={"challenge.questions." + index + ".answers"}
              maxLength={2400}
              rows={2}
              value={q.answers.join("\n")}
              onChange={(e) =>
                update(index, {
                  answers: e.target.value.split("\n").slice(0, 8),
                })
              }
            />
          </label>
          <label>
            {t("Antwortauswahl (optional, eine pro Zeile)")}
            <textarea
              name={"challenge.questions." + index + ".choices"}
              maxLength={1200}
              rows={3}
              value={q.choices.join("\n")}
              onChange={(e) =>
                update(index, {
                  choices: e.target.value
                    ? e.target.value.split("\n").slice(0, 4)
                    : [],
                })
              }
            />
          </label>
          <BilingualField
            label="Erklärung nach der Antwort"
            path={"challenge.questions." + index + ".explanation"}
            value={q.explanation}
            onChange={(explanation) => update(index, { explanation })}
          />
          {value.questions.length > 1 && (
            <button
              type="button"
              className="text-link"
              onClick={() =>
                onChange({
                  ...value,
                  questions: value.questions.filter((_, i) => i !== index),
                })
              }
            >
              {t("Übung entfernen")}
            </button>
          )}
        </fieldset>
      ))}
      {value.questions.length < 8 && (
        <button
          type="button"
          className="button outline"
          onClick={() =>
            onChange({
              ...value,
              questions: [...value.questions, emptyLearningQuestion()],
            })
          }
        >
          {t("Weitere Übung")}
        </button>
      )}
    </div>
  );
}
