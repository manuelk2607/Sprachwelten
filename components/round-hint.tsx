"use client";
import { useId, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { GameView } from "@/lib/game";
import { useI18n } from "@/lib/i18n";
import { TranslationNotice } from "./translation-notice";

export function RoundHint({
  hint,
  album,
  artist,
}: {
  hint: GameView["hint"];
  album?: string;
  artist?: string;
}) {
  const { t } = useI18n(),
    id = useId();
  const [open, setOpen] = useState(false),
    [albumOpen, setAlbumOpen] = useState(false);
  const hasHint = !!hint || !!artist;
  return (
    <section className="round-hint">
      {hasHint && (
        <>
          <button
            type="button"
            className="button small outline"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => {
              setOpen((value) => !value);
              setAlbumOpen(false);
            }}
          >
            <Lightbulb size={17} />
            {t(open ? "Tipp ausblenden" : "Tipp anzeigen")}
          </button>
          <div id={id} hidden={!open}>
            {open &&
              (hint ? (
                <>
                  <p>{hint.text}</p>
                  <TranslationNotice
                    status={hint.status}
                    sourceLocale={hint.sourceLocale}
                  />
                </>
              ) : (
                <p>
                  <strong>{t("Interpret oder Fassung")}:</strong> {artist}
                </p>
              ))}
          </div>
        </>
      )}
      {album && (!hasHint || open) && (
        <>
          <button
            type="button"
            className="button small outline"
            aria-expanded={albumOpen}
            aria-controls={id + "-album"}
            onClick={() => setAlbumOpen((value) => !value)}
          >
            {t(albumOpen ? "Album ausblenden" : "Album anzeigen")}
          </button>
          <div id={id + "-album"} hidden={!albumOpen}>
            {albumOpen && (
              <p>
                <strong>{t("Album")}:</strong> {album}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
