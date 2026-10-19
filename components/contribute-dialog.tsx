"use client";
import { useKeyedState } from "@/lib/use-keyed-state";
import { presentationOf } from "@/lib/content-media";
import type { Entry } from "@/lib/content";
import { MediaChoiceInput, type MediaChoice } from "./media-choice";
import { ChallengeEditor, initialChallenge } from "./challenge-editor";
import type { Challenge } from "@/lib/challenges";
import { FormErrors, useFormErrors, type FieldIssue } from "./form-errors";
import { RegionPicker } from "./region-picker";
import { Select } from "./select";
import { useI18n, type Locale } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import {
  kindLabels,
  needsLiteralTranslation,
  type ContentKind,
} from "@/lib/content";
import { contexts } from "@/lib/quiz-categories";
import { textsOf, type TranslationTexts } from "@/lib/content-translations";
import { TranslationEditor, type TranslationField } from "./translation-editor";
import { AudioInput } from "./audio-input";
import { LanguagePicker } from "./language-picker";
import {
  duplicateEntryMessage,
  type ExistingEntry,
} from "@/lib/entry-duplicates";
import { useAuthSession } from "@/lib/auth/provider";
export function ContributeDialog({
  close,
  saved,
  openExisting,
  initialEntry,
  editTarget = "admin",
  review,
}: {
  close: () => void;
  saved: () => void;
  openExisting: (id: string) => Promise<void>;
  initialEntry?: Entry;
  editTarget?: "admin" | "own" | "suggest";
  review?: { id: string; revision: number };
}) {
  const { t, locale } = useI18n();
  const session = useAuthSession();
  const formRef = useRef<HTMLFormElement>(null);
  const validation = useFormErrors(formRef);
  const [media, setMedia] = useState<MediaChoice>({
    text: presentationOf(initialEntry ?? {}) !== "audio",
    audio: presentationOf(initialEntry ?? {}) !== "text",
  });
  const [challenge, setChallenge] = useState<Challenge | undefined>(
    initialEntry ? initialEntry.challenge : initialChallenge("idiom"),
  );
  const [kind, setKind] = useState<ContentKind>(initialEntry?.kind ?? "idiom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sense, setSense] = useState(initialEntry?.sense ?? "");
  const [phrase, setPhrase] = useState(initialEntry?.phrase ?? "");
  const [language, setLanguage] = useState(initialEntry?.language ?? "de");
  const [regionId, setRegionId] = useState(initialEntry?.regionId ?? "");
  const [contextId, setContextId] = useState(initialEntry?.contextId ?? "");
  const duplicateKey = JSON.stringify([
    kind,
    phrase,
    language,
    regionId,
    contextId,
    challenge,
    media.text,
    media.audio,
    sense,
  ]);
  const [duplicate, setDuplicate] = useKeyedState<ExistingEntry | null>(
    duplicateKey,
    null,
  );
  const [opening, setOpening] = useState(false);
  const [audio, setAudio] = useState<{ id: string; durationMs: number } | null>(
    initialEntry?.audioId ? { id: initialEntry.audioId, durationMs: 0 } : null,
  );
  const [audioBusy, setAudioBusy] = useState(false);
  useEffect(() => {
    if (
      initialEntry ||
      !media.text ||
      !phrase.trim() ||
      (kind === "dialect" && !regionId) ||
      (kind === "situation" && !contextId)
    )
      return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        kind,
        phrase: phrase.trim(),
        language,
        sense,
        ...(kind === "dialect" ? { regionId } : {}),
        ...(kind === "situation" ? { contextId } : {}),
        ...(challenge?.type === "attribution"
          ? { attributionCategory: challenge.category }
          : {}),
        ...(challenge?.type === "friends"
          ? {
              otherLanguage: challenge.otherLanguage,
              otherWord: challenge.otherWord,
            }
          : {}),
        ...(challenge?.type === "order"
          ? { targetLanguage: challenge.targetLanguage }
          : {}),
      });
      fetch("/api/entries/duplicates?" + query, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return;
          const data = (await response.json()) as {
            duplicate: ExistingEntry | null;
          };
          if (!controller.signal.aborted) setDuplicate(data.duplicate);
        })
        .catch(() => {
          /* The database still enforces uniqueness if the preview is unavailable. */
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    kind,
    phrase,
    language,
    regionId,
    contextId,
    challenge,
    media.text,
    media.audio,
    audio?.id,
    sense,
    initialEntry,
    setDuplicate,
  ]);
  const showExisting = async () => {
    if (!duplicate) return;
    setOpening(true);
    setError("");
    try {
      await openExisting(duplicate.id);
    } catch {
      setError(
        t(
          "Der vorhandene Beitrag konnte gerade nicht geladen werden. Bitte versuche es erneut.",
        ),
      );
    } finally {
      setOpening(false);
    }
  };
  const [sourceLocale, setSourceLocale] = useState<Locale>(
    initialEntry?.sourceLocale ?? locale,
  );
  const [translation, setTranslation] = useState<Partial<TranslationTexts>>(
    initialEntry?.translations?.[
      (initialEntry.sourceLocale ?? "de") === "de" ? "en" : "de"
    ] ?? {},
  );
  const [revision, setRevision] = useState(0);
  const [reviewed, setReviewed] = useState(!!initialEntry);
  const literalRequired =
    needsLiteralTranslation(kind) && challenge?.type !== "meaning";
  const answerDriven =
    challenge?.type === "relay" ||
    challenge?.type === "academic" ||
    challenge?.type === "joke" ||
    challenge?.type === "meaning" ||
    challenge?.type === "outsider";
  const senseRelevant = [
    "idiom",
    "dialect",
    "situation",
    "word",
    "false_friend",
  ].includes(kind);
  const freeRegionRelevant = ["idiom", "word"].includes(kind);
  const hintField: TranslationField = {
    key: "hint",
    label: "Tipp fürs Spiel",
    max: 300,
  };
  const fields: TranslationField[] = [
    { key: "literal", label: "Wörtliche Übersetzung", max: 300 },
    { key: "meaning", label: "Bedeutung oder Erklärung", max: 1500 },
    { key: "example", label: "Beispielsatz", max: 600 },
    { key: "culturalNote", label: "Kultureller Hinweis", max: 1000 },
    ...(kind === "dialect" ? [hintField] : []),
  ];
  const sourceChanged = () => {
    setRevision((value) => value + 1);
    setTranslation({});
    setReviewed(false);
  };
  const getSource = () =>
    textsOf(Object.fromEntries(new FormData(formRef.current!).entries()));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || audioBusy) return;
    validation.clear();
    if (!media.text && !media.audio) {
      validation.report([
        {
          path: ["presentation"],
          message: "Bitte mindestens Text oder Audio auswählen.",
        },
      ]);
      return;
    }
    if (media.audio && !audio) {
      validation.report([
        {
          path: ["audioId"],
          message: "Bitte eine Aufnahme oder Audiodatei hinzufügen.",
        },
      ]);
      return;
    }
    setBusy(true);
    setError("");
    const data = {
      ...Object.fromEntries(new FormData(e.currentTarget)),
      note: String(new FormData(e.currentTarget).get("note") ?? ""),
      sourceLocale,
      translation,
      translationReviewed: reviewed,
      presentation: media.text ? (media.audio ? "both" : "text") : "audio",
      phrase: media.text ? phrase : "",
      audioId: media.audio ? audio?.id : undefined,
      challenge,
      ...(initialEntry ? { revision: initialEntry.revision } : {}),
    };
    try {
      const endpoint = review
        ? "/api/admin/suggestions/" + review.id
        : initialEntry
          ? editTarget === "suggest"
            ? "/api/entries/" + initialEntry.id + "/suggestions"
            : editTarget === "own"
              ? "/api/me/entries/" + initialEntry.id
              : "/api/admin/entries/" + initialEntry.id
          : "/api/entries";
      const response = await fetch(endpoint, {
        method: initialEntry && editTarget !== "suggest" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          review
            ? {
                action: "accept",
                revision: review.revision,
                input: data,
                note: data.note,
                feedback: String(
                  new FormData(e.currentTarget).get("feedback") ?? "",
                ),
              }
            : data,
        ),
      });
      const json = (await response.json()) as {
        error: string;
        duplicate?: ExistingEntry;
        issues?: FieldIssue[];
      };
      if (!response.ok) {
        if (json.issues) validation.report(json.issues);
        if (json.duplicate && !initialEntry) setDuplicate(json.duplicate);
        throw new Error(json.error);
      }
      saved();
      close();
    } catch (error) {
      setError(
        error instanceof Error
          ? t(error.message)
          : t("Dein Beitrag konnte nicht gespeichert werden."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={t(
        review
          ? "Vorschlag prüfen und übernehmen"
          : editTarget === "suggest"
            ? "Verbesserung vorschlagen"
            : initialEntry
              ? "Beitrag bearbeiten"
              : "Ein Stück Sprache teilen.",
      )}
      close={close}
      wide
    >
      <p className="muted">
        {t(
          "Eine Redewendung von deiner Oma? Ein Wort aus deiner Heimat? Gib ihm hier einen Platz.",
        )}
      </p>
      {!initialEntry && !session?.user && (
        <p className="notice">
          {t(
            "Du kannst ohne Konto beitragen. Mit einem Konto kannst du deine Beiträge später geräteübergreifend bearbeiten und löschen sowie den Stand deiner Verbesserungsvorschläge verfolgen. Melde dich dafür vor dem Einreichen an. Gastbeiträge werden keinem später erstellten Konto automatisch zugeordnet.",
          )}
        </p>
      )}
      <form
        ref={formRef}
        className="form-stack"
        onSubmit={submit}
        onInvalidCapture={validation.invalid}
      >
        <FormErrors issues={validation.issues} form={formRef} />
        <div className="form-row">
          <label>
            {t("Art des Beitrags")}
            <Select
              name="kind"
              disabled={busy}
              value={kind}
              onValueChange={(value) => {
                setKind(value as ContentKind);
                setChallenge(initialChallenge(value as ContentKind));
                sourceChanged();
              }}
            >
              {Object.entries(kindLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {t(label)}
                </option>
              ))}
            </Select>
          </label>
          <LanguagePicker
            label={
              kind === "loanword"
                ? "Heutige Sprache des Lehnworts"
                : "Sprache des Originalausdrucks"
            }
            name="language"
            value={language}
            onChange={setLanguage}
            disabled={busy}
          />
        </div>
        <div data-field="presentation">
          <MediaChoiceInput
            value={media}
            onChange={(value) => {
              setMedia(value);
              setError("");
            }}
            disabled={busy || audioBusy}
          />
        </div>
        {media.text && (
          <label>
            {t(
              kind === "word" || kind === "false_friend"
                ? "Wort oder kurzer Ausdruck"
                : kind === "tongue_twister" || kind === "sound_pair"
                  ? "Satz zum Nachsprechen"
                  : kind === "situation"
                    ? "Situation oder Formulierung"
                    : kind === "joke"
                      ? "Witz mit Pointe"
                      : "Originalausdruck",
            )}
            <textarea
              name="phrase"
              disabled={busy}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              required
              minLength={
                [
                  "word",
                  "false_friend",
                  "gaming_mission",
                  "youth_chat",
                  "loanword",
                ].includes(kind)
                  ? 1
                  : 3
              }
              maxLength={kind === "joke" ? 1500 : 180}
              rows={kind === "joke" ? 4 : 2}
            />
          </label>
        )}
        {senseRelevant ? (
          <>
            <label>
              {t("Bedeutungsvariante")} <span>{t("(optional)")}</span>
              <input
                name="sense"
                value={sense}
                onChange={(e) => setSense(e.target.value)}
                maxLength={160}
                placeholder={t("z. B. Bank als Sitzmöbel")}
              />
            </label>
            <p className="form-note">
              {t(
                "Nur bei einer anderen Bedeutung desselben Ausdrucks ausfüllen. Für ergänzende Erklärungen nutze den vorhandenen Beitrag.",
              )}
            </p>
          </>
        ) : (
          <input type="hidden" name="sense" value={sense} />
        )}
        <div data-field="audioId" hidden={!media.audio}>
          <AudioInput
            onChange={setAudio}
            onBusy={setAudioBusy}
            disabled={busy}
            required={media.audio}
            initialId={initialEntry?.audioId}
          />
        </div>
        {kind === "dialect" ? (
          <RegionPicker
            name="regionId"
            disabled={busy}
            required
            value={regionId}
            onChange={setRegionId}
          />
        ) : freeRegionRelevant ? (
          <label>
            {t("Region")} <span>{t("(optional)")}</span>
            <input
              name="region"
              defaultValue={initialEntry?.region ?? ""}
              maxLength={100}
              placeholder={t("z. B. Bayern, Québec, Stockholm")}
            />
          </label>
        ) : (
          <input
            type="hidden"
            name="region"
            value={initialEntry?.region ?? ""}
          />
        )}
        {kind === "dialect" && (
          <>
            <label>
              {t("Tipp fürs Spiel")}{" "}
              <span>
                {t("(optional)")} ·{" "}
                {t(sourceLocale === "de" ? "Deutsch" : "Englisch")}
              </span>
              <textarea
                name="hint"
                defaultValue={initialEntry?.hint ?? ""}
                disabled={busy}
                maxLength={300}
                rows={2}
                onChange={sourceChanged}
              />
            </label>
            <p className="form-note">
              {t(
                "Gib einen kleinen Hinweis, ohne die Lösung zu verraten. Im Spiel wird er erst auf Wunsch eingeblendet und kostet keine Punkte.",
              )}
            </p>
          </>
        )}
        {kind === "situation" && (
          <label>
            {t("Richtiger Gesprächskontext")}
            <Select
              name="contextId"
              disabled={busy}
              required
              value={contextId}
              onValueChange={(value) => setContextId(value)}
            >
              <option value="" disabled>
                {t("Bitte auswählen")}
              </option>
              {Object.entries(contexts).map(([id, labels]) => (
                <option key={id} value={id}>
                  {labels[locale]}
                </option>
              ))}
            </Select>
          </label>
        )}
        {media.audio && !media.text && kind === "false_friend" && (
          <p className="form-note">
            {t(
              "Sprich beide Wörter in derselben Reihenfolge wie im Formular ein. Die Bedeutungen und das zweite Wort werden für die Auflösung gespeichert.",
            )}
          </p>
        )}
        {media.audio && !media.text && kind === "word_order" && (
          <p className="form-note">
            {t(
              "Sprich den Ausgangssatz ein. Die Wortbausteine und gültigen Reihenfolgen ergänzt du weiterhin als Text.",
            )}
          </p>
        )}
        {challenge && (
          <ChallengeEditor value={challenge} onChange={setChallenge} />
        )}
        {duplicate && (
          <div className="duplicate-notice" role="status">
            <p>{t(duplicateEntryMessage)}</p>
            <button
              type="button"
              className="button outline"
              disabled={opening}
              onClick={() => void showExisting()}
            >
              {opening ? t("Wird geladen …") : t("Vorhandenen Beitrag öffnen")}
            </button>
          </div>
        )}
        {["word", "dialect", "situation"].includes(kind) && (
          <p className="form-note">
            {t(
              "Du wählst die richtige Antwort. Drei andere Möglichkeiten ergänzt die App automatisch und zeigt sie in der jeweiligen Oberflächensprache an.",
            )}
          </p>
        )}
        {literalRequired ? (
          <fieldset className="source-fields" onChange={sourceChanged}>
            <legend>
              {t("Deine Erklärung")} ·{" "}
              {t(sourceLocale === "de" ? "Deutsch" : "Englisch")}
            </legend>
            <label>
              {t("Wörtliche Übersetzung")} <span>{t("(erforderlich)")}</span>
              <input
                required
                minLength={1}
                name="literal"
                defaultValue={initialEntry?.literal ?? ""}
                maxLength={300}
              />
            </label>
            <label>
              {t("Erklärung (optional)")}
              <textarea
                name="meaning"
                defaultValue={initialEntry?.meaning ?? ""}
                maxLength={1500}
                rows={3}
              />
            </label>
            <label>
              {t("Beispielsatz")} <span>{t("(optional)")}</span>
              <input
                name="example"
                defaultValue={initialEntry?.example ?? ""}
                maxLength={600}
              />
            </label>
            <label>
              {t("Kultureller Hinweis")} <span>{t("(optional)")}</span>
              <textarea
                name="culturalNote"
                defaultValue={initialEntry?.culturalNote ?? ""}
                maxLength={1000}
                rows={2}
              />
            </label>
          </fieldset>
        ) : (
          <details
            className="source-fields optional-source-fields"
            onChange={sourceChanged}
          >
            <summary>{t("Optionale Zusatzinformationen")}</summary>
            <p className="form-note">
              {t(
                answerDriven
                  ? "Die richtige Antwort ist bereits die Lösung. Ergänze hier nur Hintergrundwissen, wenn es wirklich hilft."
                  : kind === "tongue_twister"
                    ? "Für einen Zungenknoten genügt der Satz oder die Aufnahme. Eine Bedeutung ist nicht erforderlich."
                    : "Die eigentliche Lösung steht bereits in der Spielaufgabe. Zusätzliche Hinweise sind freiwillig.",
              )}
            </p>
            <input
              type="hidden"
              name="literal"
              value={initialEntry?.literal ?? ""}
            />
            <label>
              {t("Zusätzliche Erklärung")} <span>{t("(optional)")}</span>
              <textarea
                name="meaning"
                defaultValue={initialEntry?.meaning ?? ""}
                maxLength={1500}
                rows={3}
              />
            </label>
            <label>
              {t("Beispiel oder Aussprachehilfe")}{" "}
              <span>{t("(optional)")}</span>
              <input
                name="example"
                defaultValue={initialEntry?.example ?? ""}
                maxLength={600}
              />
            </label>
            <label>
              {t("Kultureller Hinweis")} <span>{t("(optional)")}</span>
              <textarea
                name="culturalNote"
                defaultValue={initialEntry?.culturalNote ?? ""}
                maxLength={1000}
                rows={2}
              />
            </label>
          </details>
        )}
        {(literalRequired || kind === "dialect") && (
          <TranslationEditor
            sourceLocale={sourceLocale}
            setSourceLocale={(value) => {
              setSourceLocale(value);
              sourceChanged();
            }}
            fields={literalRequired ? fields : [hintField]}
            getSource={() =>
              literalRequired
                ? getSource()
                : textsOf({ hint: getSource().hint })
            }
            translation={translation}
            onChange={setTranslation}
            revision={revision}
            reviewed={reviewed}
            setReviewed={setReviewed}
          />
        )}
        <label>
          {t("Beitragende Person")} <span>{t("(optional)")}</span>
          <input
            name="creditName"
            defaultValue={initialEntry?.creditName ?? ""}
            maxLength={80}
            placeholder={t("z. B. deine Oma oder dein Anzeigename")}
          />
        </label>
        <p className="form-note">
          {t(
            "Nenne die Person, von der der Ausdruck stammt. Ohne Angabe wird kein Name angezeigt.",
          )}
        </p>
        <label>
          {t("Quelle")} <span>{t("(optional)")}</span>
          <input
            name="sourceUrl"
            defaultValue={initialEntry?.sourceUrl ?? ""}
            type="url"
            maxLength={500}
            placeholder="https://…"
          />
        </label>
        {review && (
          <label>
            {t("Rückmeldung an beitragende Person")}{" "}
            <span>{t("(optional)")}</span>
            <textarea name="feedback" maxLength={1000} rows={2} />
          </label>
        )}
        {(editTarget === "suggest" || review) && (
          <label>
            {t(review ? "Interne Notiz" : "Hinweis zur Änderung")}{" "}
            <span>{t("(optional)")}</span>
            <textarea name="note" maxLength={1000} rows={2} />
          </label>
        )}
        <p className="form-note">
          {t(
            editTarget === "suggest"
              ? "Dein Vorschlag wird zuerst geprüft. Der öffentliche Beitrag bleibt bis zur Freigabe unverändert."
              : "Dein Beitrag wird öffentlich sichtbar und kann im passenden Spielmodus erscheinen. Ein Name erscheint nur, wenn du ihn oben einträgst.",
          )}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          disabled={busy || opening || audioBusy || !!duplicate}
          className="button primary"
        >
          {busy
            ? t("Wird gespeichert …")
            : t(
                review
                  ? "Vorschlag übernehmen"
                  : editTarget === "suggest"
                    ? "Zur Prüfung senden"
                    : initialEntry
                      ? "Änderungen speichern"
                      : "Beitrag veröffentlichen",
              )}
        </button>
      </form>
    </Dialog>
  );
}
