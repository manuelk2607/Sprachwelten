"use client";
import { useState } from "react";
import type { Notebook, NotebookInput } from "@/lib/vocabulary";
import { useI18n } from "@/lib/i18n";
import { Dialog } from "./dialog";
import { LanguagePicker } from "./language-picker";
export function NotebookDialog({
  book,
  sourceLanguage,
  targetLanguage,
  close,
  saved,
}: {
  book?: Notebook;
  sourceLanguage: string;
  targetLanguage: string;
  close: () => void;
  saved: () => void;
}) {
  const { t } = useI18n(),
    [input, setInput] = useState<NotebookInput>(
      book ?? { name: "", description: "", sourceLanguage, targetLanguage },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/learning/notebooks" + (book ? "/" + book.id : ""),
        {
          method: book ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            ...(book ? { revision: book.revision } : {}),
          }),
        },
      );
      const data = (await r.json()) as { error?: string };
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
      title={t(book ? "Vokabelheft bearbeiten" : "Neues Vokabelheft")}
      close={close}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          {t("Name des Hefts")}
          <input
            required
            maxLength={80}
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
          />
        </label>
        <label>
          {t("Beschreibung")}
          <textarea
            rows={2}
            maxLength={600}
            value={input.description}
            onChange={(e) =>
              setInput({ ...input, description: e.target.value })
            }
          />
        </label>
        <div className="form-row">
          <LanguagePicker
            label="Ausgangssprache"
            value={input.sourceLanguage}
            onChange={(sourceLanguage) =>
              setInput({ ...input, sourceLanguage })
            }
            disabled={busy || !!book?.count}
          />
          <LanguagePicker
            label="Zielsprache"
            value={input.targetLanguage}
            onChange={(targetLanguage) =>
              setInput({ ...input, targetLanguage })
            }
            disabled={busy || !!book?.count}
          />
        </div>
        {!!book?.count && (
          <p className="form-note">
            {t(
              "Für ein anderes Sprachpaar lege ein neues Heft an oder entferne zuerst die Wörter.",
            )}
          </p>
        )}
        {error && <p role="alert">{t(error)}</p>}
        <button
          className="button primary"
          disabled={busy || input.sourceLanguage === input.targetLanguage}
        >
          {t("Speichern")}
        </button>
      </form>
    </Dialog>
  );
}
