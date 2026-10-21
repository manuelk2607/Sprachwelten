"use client";
import { useEffect, useState } from "react";
import type { GameView } from "@/lib/game";
import type { RoomAction } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { PronunciationAudio } from "./pronunciation-audio";
export function TabooRound({
  room,
  busy,
  act,
}: {
  room: GameView;
  busy: boolean;
  act: (action: RoomAction) => Promise<void>;
}) {
  const { t } = useI18n(),
    [now, setNow] = useState(() => Date.now()),
    [text, setText] = useState(""),
    taboo = room.taboo!;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(
      0,
      Math.ceil(((taboo.deadline ?? now) - now) / 1000),
    ),
    describer = taboo.describerId === room.playerId,
    judge = taboo.judgeId === room.playerId,
    guessing = taboo.teams[taboo.team].includes(room.playerId) && !describer;
  const name = (id: string) =>
    room.players.find((p) => p.id === id)?.name ?? "";
  const send = (
    event: Extract<RoomAction, { action: "taboo" }>["event"],
    value?: string,
  ) =>
    act({
      action: "taboo",
      event,
      text: value,
      matchId: room.matchId!,
      roundNumber: room.roundNumber,
      cardIndex: taboo.cardIndex,
    });
  return (
    <section className="form-stack taboo-round">
      <h2>
        {t("Team")} {taboo.team === 0 ? "A" : "B"} · {taboo.scores[0]} :{" "}
        {taboo.scores[1]}
      </h2>
      <p>
        {t("Erklärt")}: {name(taboo.describerId)} · {t("Kontrolliert")}:{" "}
        {name(taboo.judgeId)}
      </p>
      <p className="form-note">
        {t("Karten pro Teamzug")}: {taboo.cardNumber}/{taboo.cardLimit} ·{" "}
        {t("Beide Teams haben dasselbe Kartenlimit.")}
      </p>
      {taboo.card ? (
        <div className="notice">
          <h2>{taboo.card.word}</h2>
          <p>
            <strong>{t("Verbotene Wörter")}:</strong>{" "}
            {taboo.card.forbidden.join(" · ")}
          </p>
          <PronunciationAudio id={room.prompt?.audioId} />
        </div>
      ) : (
        <p className="notice">
          {t(
            "Dein Team errät das geheime Wort. Nur Erklärung und Rateversuche sind sichtbar.",
          )}
        </p>
      )}
      {room.phase === "briefing" ? (
        describer ? (
          <button
            disabled={busy}
            className="button dark"
            onClick={() => void send("start")}
          >
            {t("60 Sekunden starten")}
          </button>
        ) : (
          <p>{t("Die erklärende Person startet den Timer.")}</p>
        )
      ) : (
        <>
          <p role="timer" aria-label={t("Verbleibende Sekunden")}>
            {seconds} s
          </p>
          {taboo.clue && <blockquote>{taboo.clue}</blockquote>}
          {seconds > 0 && (describer || guessing) && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void send(describer ? "clue" : "guess", text);
              }}
            >
              <label>
                {t(describer ? "Deine Erklärung" : "Dein Rateversuch")}
                <input
                  value={text}
                  maxLength={300}
                  required
                  onChange={(e) => setText(e.target.value)}
                  disabled={busy}
                />
              </label>
              <button className="button dark" disabled={busy}>
                {t(describer ? "Hinweis senden" : "Raten")}
              </button>
            </form>
          )}
          <ul>
            {taboo.guesses.map((g, i) => (
              <li key={i}>
                {g.name}: {g.text}
              </li>
            ))}
          </ul>
          <div className="button-row">
            {seconds <= 0 ? (
              <button
                className="button dark"
                disabled={busy}
                onClick={() => void send("timeout")}
              >
                {t("Zeit abgelaufen – Zug auflösen")}
              </button>
            ) : (
              <>
                {describer && (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void send("skip")}
                  >
                    {t("Überspringen · Punkt für das andere Team")}
                  </button>
                )}
                {judge && (
                  <>
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => void send("correct")}
                    >
                      {t("Mündlich richtig geraten")}
                    </button>
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => void send("buzz")}
                    >
                      {t("Regelverstoß · Punkt für das andere Team")}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
      <details>
        <summary>{t("Tabu-Regeln")}</summary>
        <p>
          {t(
            "Keine Wortteile, Abwandlungen oder Abkürzungen; keine Gesten, Geräusche, Reime oder Anfangsbuchstaben. Die kontrollierende Person beurteilt auch mündliche Hinweise. Singen ohne verbotene Wörter ist erlaubt.",
          )}
        </p>
        <p>
          {t(
            "Ihr könnt vor Ort oder über euren Sprachchat spielen. Getippte Hinweise und freie Rateversuche funktionieren ebenfalls.",
          )}
        </p>
        <a
          href="https://instructions.hasbro.com/api/download/E2616_en-us_taboo-game-instructions-manual.pdf"
          target="_blank"
          rel="noreferrer"
        >
          {t("Offizielle Regeln ansehen")}
        </a>
      </details>
    </section>
  );
}
