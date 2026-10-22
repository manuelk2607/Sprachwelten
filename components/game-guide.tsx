import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import {
  publicGames,
  guideIndex,
  guidePath,
  absoluteUrl,
  type PublicGame,
} from "@/lib/seo";
import { modeInfo } from "@/lib/modes";
import { modeGuides } from "@/lib/mode-guides";
import { gameFamilies } from "@/lib/game-families";
import { translate, type Locale } from "@/lib/translations";
function Shell({
  locale,
  game,
  children,
}: {
  locale: Locale;
  game?: PublicGame;
  children: ReactNode;
}) {
  const de = locale === "de",
    path = (l: Locale) => (game ? guidePath(game, l) : guideIndex(l));
  return (
    <div lang={locale}>
      <header className="header guide-header">
        <Link href={de ? "/" : "/en"} prefetch={false} className="brand">
          {site.name}
          <span className="brand-dot">.</span>
        </Link>
        <nav aria-label={de ? "Anleitungsnavigation" : "Guide navigation"}>
          <a href={guideIndex(locale)}>{de ? "Alle Spiele" : "All games"}</a>
          <a
            href={path("de")}
            hrefLang="de"
            lang="de"
            aria-current={de ? "page" : undefined}
          >
            DE
          </a>
          <a
            href={path("en")}
            hrefLang="en"
            lang="en"
            aria-current={!de ? "page" : undefined}
          >
            EN
          </a>
        </nav>
      </header>
      <main className="guide-page">{children}</main>
      <footer>
        <a href={`${de ? "/" : "/en"}#spiel-starten`}>
          {de ? "Zur Spielauswahl" : "Choose a game"}
        </a>
        <a href={site.repository} rel="noreferrer" target="_blank">
          GitHub
        </a>
      </footer>
    </div>
  );
}
export function GuideIndex({ locale }: { locale: Locale }) {
  const de = locale === "de",
    t = (s: string) => translate(s, locale);
  return (
    <Shell locale={locale}>
      <div className="guide-intro">
        <p className="eyebrow">
          {de ? "KOSTENLOSE SPIELE IM BROWSER" : "FREE BROWSER GAMES"}
        </p>
        <h1>
          {de
            ? "Sprachspiele für neugierige Köpfe."
            : "Language games for curious minds."}
        </h1>
        <p>
          {de
            ? "Ratet Bedeutungen, entdeckt Dialekte und bringt eure Zunge zum Stolpern. Hier findet ihr die Regeln aller Spiele – allein oder mit Freunden, ohne Installation und ohne Pflichtkonto."
            : "Guess meanings, discover dialects and twist your tongue. Find the rules for every game here. Play solo or with friends, with no installation or required account."}
        </p>
        <a
          className="button primary"
          href={`${de ? "/" : "/en"}#spiel-starten`}
        >
          {de ? "Zur Spielauswahl" : "Choose a game"}
        </a>
      </div>
      {gameFamilies.map((f) => (
        <section className="guide-family" key={f.id}>
          <h2>{t(f.title)}</h2>
          <div className="guide-grid">
            {publicGames
              .filter((game) => f.modes.includes(game.mode))
              .map((game) => {
                const info = modeInfo(game.mode);
                return (
                  <a
                    className="guide-link"
                    key={game.mode}
                    href={guidePath(game, locale)}
                  >
                    <h3>{t(info.title)}</h3>
                    <p>{t(info.description)}</p>
                    <span>{de ? "Regeln ansehen" : "Read the rules"} →</span>
                  </a>
                );
              })}
          </div>
        </section>
      ))}
    </Shell>
  );
}
export function GameGuide({
  locale,
  game,
}: {
  locale: Locale;
  game: PublicGame;
}) {
  const de = locale === "de",
    t = (s: string) => translate(s, locale),
    info = modeInfo(game.mode),
    guide = modeGuides[game.mode];
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t(info.title),
    description: t(info.description),
    url: absoluteUrl(guidePath(game, locale)),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
  };
  return (
    <Shell locale={locale} game={game}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
        }}
      />
      <article>
        <div className="guide-intro">
          <p className="eyebrow">
            {de ? "KOSTENLOSES SPRACHSPIEL" : "FREE LANGUAGE GAME"}
          </p>
          <h1>{t(info.title)}</h1>
          <p>{t(info.description)}</p>
          <p className="guide-facts">
            {info.minPlayers}–10 {de ? "Personen" : "players"} ·{" "}
            {de ? "1–10 Runden" : "1–10 rounds"} ·{" "}
            {de ? "Im Browser" : "In your browser"}
          </p>
          <a
            className="button primary"
            href={`${de ? "/" : "/en"}#spiel-starten`}
          >
            {de ? "Zur Spielauswahl" : "Choose a game"}
          </a>
        </div>
        <section className="guide-section">
          <h2>{de ? "So spielt ihr" : "How to play"}</h2>
          <p>{t(info.intro)}</p>
          <ol className="guide-steps">
            {guide.steps.map((step) => (
              <li key={step.title}>
                <h3>{t(step.title)}</h3>
                <p>{t(step.text)}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="guide-section">
          <h2>{de ? "Punkte und Regeln" : "Scoring and rules"}</h2>
          <p>{t(info.rule)}</p>
          <p>{t(guide.scoring)}</p>
          <p>{t(guide.tip)}</p>
          {game.mode === "taboo" && (
            <>
              <p>
                {de
                  ? "Jede Runde enthält einen Zug beider Teams. Ein gleiches Kartenlimit pro Teamzug verhindert Wiederholungen bei kleinen Vorräten. Nach den gewählten Runden ist ein Unentschieden möglich."
                  : "Each round includes one turn for each team. An equal card limit per turn avoids repeats in small decks. The game can finish in a draw after your chosen rounds."}
              </p>
              <a
                href="https://instructions.hasbro.com/api/download/E2616_en-us_taboo-game-instructions-manual.pdf"
                rel="noreferrer"
                target="_blank"
              >
                {de
                  ? "Offizielle Hasbro-Regeln als Grundlage"
                  : "Based on the official Hasbro rules"}{" "}
                ↗
              </a>
            </>
          )}
        </section>
        {game.mode === "tongue-twisters" && (
          <section className="guide-section">
            <h2>
              {de
                ? "Zungenknoten und Klangfallen"
                : "Tongue twisters and sound traps"}
            </h2>
            <p>
              {de
                ? "Wählt eine Originalsprache, die ihr sprechen möchtet. Beide Kategorien verwenden Text oder kurze Audioaufnahmen. Ihr sprecht den vollständigen Satz nach; die anderen bewerten eure Aussprache. Ein Sprachchat ist nicht eingebaut."
                : "Choose an original language you want to speak. Both categories use text or short recordings. Repeat the full sentence while the other players rate your pronunciation. Voice chat is not built in."}
            </p>
          </section>
        )}
        <section className="guide-section">
          <h2>{de ? "Was braucht ihr?" : "What do you need?"}</h2>
          <p>
            {de
              ? "Ein Smartphone, Tablet oder Computer mit Browser reicht. Erstellt auf der Startseite einen Raum und teilt Link oder Code. Ein Konto ist zum Spielen nicht nötig. Für gesprochene Spiele nutzt ihr denselben Raum oder euren eigenen Sprachchat. Die verfügbaren Runden hängen von den ungespielten Beiträgen der gewählten Sprache und Kategorie ab."
              : "A phone, tablet or computer with a browser is enough. Create a room on the home page and share its link or code. You do not need an account to play. For spoken games, play in the same room or use your own voice chat. Available rounds depend on unplayed contributions in your selected language and category."}
          </p>
        </section>
        <section className="guide-section">
          <h2>{de ? "Weitere Sprachspiele" : "More language games"}</h2>
          <div className="guide-grid">
            {publicGames
              .filter((g) => g.mode !== game.mode)
              .slice(0, 3)
              .map((g) => (
                <a
                  className="guide-link"
                  key={g.mode}
                  href={guidePath(g, locale)}
                >
                  {t(modeInfo(g.mode).title)} →
                </a>
              ))}
          </div>
        </section>
      </article>
    </Shell>
  );
}
