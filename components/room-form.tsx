"use client";
import {LanguageSetPicker} from "./language-set-picker";
import { useAuthSession } from "@/lib/auth/provider";
import { familyFor, gameFamilies } from "@/lib/game-families";
import { Select } from "./select";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { modeInfo, type PlayableGameMode } from "@/lib/modes";
import { Dialog } from "./dialog";
import { meaningCategories } from "@/lib/meaning-categories";
import { LanguagePicker } from "./language-picker";
import {
  roomStorageKey,
  savedRoomToken,
  subscribeToRoomStorage,
  resumeRoom,
} from "@/lib/room-session";

export function RoomForm({
  close,
  code = "",
  initialMode = "meaning-quiz",
  joinOnly = false,
}: {
  close: () => void;
  code?: string;
  initialMode?: PlayableGameMode;
  joinOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  const session = useAuthSession();
  const [join, setJoin] = useState(!!code || joinOnly);
  const [joinCode, setJoinCode] = useState(code);
  const existingToken = useSyncExternalStore(
    subscribeToRoomStorage,
    () => savedRoomToken(joinCode.trim().toUpperCase()),
    () => null,
  );
  const [mode, setMode] = useState<PlayableGameMode>(initialMode);
  const [pronunciationLanguage, setPronunciationLanguage] = useState(
    locale as string,
  );
  const [tabooLanguages,setTabooLanguages]=useState<string[]>([locale]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const info = modeInfo(mode);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const room = String(data.get("code") ?? "")
      .trim()
      .toUpperCase();
    try {
      if (join && (await resumeRoom(room, savedRoomToken(room)))) {
        window.location.assign(`/room/${room}`);
        return;
      }
      const response = await fetch(
        join ? `/api/rooms/${room}/join` : "/api/rooms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.get("name"),
            locale: data.get("locale") ?? locale,
            mode,
            tabooLanguages:mode==="taboo"?tabooLanguages:undefined,
            meaningCategory: data.get("meaningCategory") ?? undefined,
            pronunciationCategory:
              data.get("pronunciationCategory") ?? undefined,
            pronunciationLanguage:
              data.get("pronunciationLanguage") ?? undefined,
            attributionCategory: data.get("attributionCategory") ?? undefined,
          }),
        },
      );
      const json = (await response.json()) as {
        token: string;
        room: { code: string };
        error: string;
      };
      if (!response.ok) throw new Error(json.error);
      localStorage.setItem(roomStorageKey(json.room.code), json.token);
      window.location.assign(`/room/${json.room.code}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? t(error.message)
          : t("Der Raum ist gerade nicht erreichbar."),
      );
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={join ? t("Deine Runde wartet.") : t(info.title)}
      close={close}
    >
      <p className="muted">
        {t(
          join
            ? "Einladungslink oder Raumcode genügen. Ein Konto brauchst du zum Spielen nicht."
            : info.intro,
        )}
      </p>
      {!joinOnly && (
        <div className="segmented">
          <button
            className={!join ? "selected" : ""}
            onClick={() => {
              setJoin(false);
              setError("");
            }}
          >
            {t("Raum erstellen")}
          </button>
          <button
            className={join ? "selected" : ""}
            onClick={() => {
              setJoin(true);
              setError("");
            }}
          >
            {t("Raum beitreten")}
          </button>
        </div>
      )}
      <form className="form-stack" onSubmit={submit}>
        {!join && (
          <label>
            {t("Spielmodus")}
            <Select
              value={familyFor(mode).id}
              onValueChange={(value) => setMode(value as PlayableGameMode)}
            >
              {gameFamilies.map((m) => (
                <option key={m.id} value={m.id}>
                  {t(m.title)}
                </option>
              ))}
            </Select>
          </label>
        )}
        {!join && familyFor(mode).modes.length > 1 && (
          <label>
            {t("Kategorie")}
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as PlayableGameMode)}
            >
              {familyFor(mode).modes.map((id) => (
                <option key={id} value={id}>
                  {t(modeInfo(id).title)}
                </option>
              ))}
            </Select>
          </label>
        )}
        {!join && mode === "meaning-quiz" && (
          <label>
            {t("Kategorie")}
            <Select name="meaningCategory" defaultValue="all">
              {Object.entries(meaningCategories).map(([id, title]) => (
                <option key={id} value={id}>
                  {t(title)}
                </option>
              ))}
            </Select>
          </label>
        )}
        {!join && mode === "tongue-twisters" && (
          <label>
            {t("Kategorie")}
            <Select name="pronunciationCategory" defaultValue="both">
              <option value="both">{t("Beide Kategorien")}</option>
              <option value="twister">{t("Zungenknoten")}</option>
              <option value="sound">{t("Klangfallen")}</option>
            </Select>
          </label>
        )}
        {!join && mode === "tongue-twisters" && (
          <LanguagePicker
            label="Sprache der Zungenbrecher"
            name="pronunciationLanguage"
            value={pronunciationLanguage}
            onChange={setPronunciationLanguage}
            allowAll
            preserveSelectionWhileSearching
          />
        )}
        {!join&&mode==="taboo"&&<LanguageSetPicker value={tabooLanguages} onChange={setTabooLanguages} disabled={busy}/>}
        {!join && mode === "who-said-it" && (
          <label>
            {t("Kategorie")}
            <Select name="attributionCategory" defaultValue="both">
              <option value="both">{t("Beide Kategorien")}</option>
              <option value="person">{t("Personenzitat")}</option>
              <option value="song">{t("Liedstelle")}</option>
            </Select>
          </label>
        )}
        <label>
          {t("Dein Spielname")}
          <input
            name="name"
            required={!session?.user && !(join && existingToken)}
            minLength={2}
            maxLength={24}
            autoComplete="nickname"
            placeholder={session?.user?.name ?? t("Dein Name in dieser Runde")}
          />
        </label>
        {join && existingToken && (
          <p className="form-note">
            {t(
              "Du bist diesem Raum bereits beigetreten. Wir stellen deinen bisherigen Zugang wieder her.",
            )}
          </p>
        )}
        {session?.user && (
          <p className="form-note">
            {t("Ohne Spielnamen verwenden wir deinen Anzeigenamen.")}
          </p>
        )}
        {!join && (
          <label>
            {t("Spielsprache")}
            <Select name="locale" defaultValue={locale}>
              <option value="de">{t("Deutsch")}</option>
              <option value="en">{t("Englisch")}</option>
            </Select>
          </label>
        )}
        {!join && (
          <p className="form-note">
            {t(info.details)}
            <br />
            {t(info.rule)}
          </p>
        )}
        {join && (
          <label>
            {t("Raumcode")}
            <input
              name="code"
              className="code-input"
              required
              pattern="[A-Za-z0-9]{6}"
              minLength={6}
              maxLength={6}
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
              placeholder="ABC123"
              autoComplete="off"
            />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy} className="button primary full">
          {t(busy ? "Einen Moment …" : join ? "Mitspielen" : "Raum erstellen")}
          <ArrowRight size={18} />
        </button>
      </form>
    </Dialog>
  );
}
