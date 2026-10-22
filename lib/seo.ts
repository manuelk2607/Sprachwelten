import type { Metadata } from "next";
import { site } from "./site";
import { modeInfo, type PlayableGameMode } from "./modes";
import { translate, type Locale } from "./translations";
export const publicGames: { mode: PlayableGameMode; de: string; en: string }[] =
  [
    { mode: "meaning-quiz", de: "was-soll-das-heissen", en: "meaning-quiz" },
    { mode: "language-quiz", de: "sprachenquiz", en: "language-quiz" },
    { mode: "dialect-detective", de: "dialektquiz", en: "dialect-quiz" },
    {
      mode: "everyday-language",
      de: "alltagssprache",
      en: "everyday-language",
    },
    { mode: "loanword-quiz", de: "lehnwortreise", en: "loanwords" },
    { mode: "tongue-twisters", de: "zungenbrecher", en: "tongue-twisters" },
    { mode: "word-outsider", de: "wortverwandtschaft", en: "odd-word-out" },
    { mode: "word-chain", de: "wortketten", en: "word-chains" },
    { mode: "taboo", de: "tabu", en: "taboo" },
    { mode: "who-said-it", de: "zitate-und-lieder", en: "quotes-and-songs" },
    { mode: "false-friends", de: "false-friends", en: "false-friends" },
    { mode: "word-builder", de: "satzbaukasten", en: "sentence-builder" },
    { mode: "joke-quiz", de: "pointe-bitte", en: "jokes" },
  ];
export type PublicGame = (typeof publicGames)[number];
export const absoluteUrl = (path: string) => new URL(path, site.url).href;
export const guideIndex = (locale: Locale) =>
  locale === "de" ? "/spiele" : "/en/games";
export const guidePath = (game: PublicGame, locale: Locale) =>
  guideIndex(locale) + "/" + game[locale];
export const findGuide = (slug: string, locale: Locale) =>
  publicGames.find((game) => game[locale] === slug);
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  locale: Locale,
  languages?: Record<string, string>,
): Metadata {
  const image = absoluteUrl(`/social-preview-${locale}.png`);
  return {
    title: path === "/" || path === "/en" ? { absolute: title } : title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
      ...(languages ? { languages } : {}),
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: site.name,
      locale: locale === "de" ? "de_DE" : "en_US",
      alternateLocale: [locale === "de" ? "en_US" : "de_DE"],
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt:
            locale === "de"
              ? "Sprachwelten – Sprachen entdecken. Zusammen spielen."
              : "Sprachwelten – Discover languages. Play together.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export function guideMetadata(game: PublicGame, locale: Locale) {
  const info = modeInfo(game.mode);
  return pageMetadata(
    translate(info.title, locale) +
      (locale === "de" ? " online spielen" : " online"),
    translate(info.description, locale),
    guidePath(game, locale),
    locale,
    {
      de: absoluteUrl(guidePath(game, "de")),
      en: absoluteUrl(guidePath(game, "en")),
      "x-default": absoluteUrl(guidePath(game, "de")),
    },
  );
}
export function indexMetadata(locale: Locale) {
  return pageMetadata(
    locale === "de"
      ? "Kostenlose Sprachspiele: Regeln und Anleitungen"
      : "Free language games: rules and guides",
    locale === "de"
      ? "Entdecke Sprachspiele für dich und deine Freunde: Bedeutungsquiz, Tabu, Zungenbrecher, Dialekte und mehr. Kostenlos im Browser, ohne Konto spielbar."
      : "Discover language games for you and your friends: meaning quizzes, Taboo, tongue twisters, dialects and more. Free in your browser, no account needed.",
    guideIndex(locale),
    locale,
    {
      de: absoluteUrl(guideIndex("de")),
      en: absoluteUrl(guideIndex("en")),
      "x-default": absoluteUrl(guideIndex("de")),
    },
  );
}
export const privateMetadata: Metadata = {
  robots: { index: false, follow: false },
};
export const sitemapEntries = () => [
  {
    url: absoluteUrl("/"),
    alternates: { languages: { de: absoluteUrl("/"), en: absoluteUrl("/en") } },
  },
  {
    url: absoluteUrl("/en"),
    alternates: { languages: { de: absoluteUrl("/"), en: absoluteUrl("/en") } },
  },
  ...(["de", "en"] as const).flatMap((locale) => [
    {
      url: absoluteUrl(guideIndex(locale)),
      alternates: {
        languages: {
          de: absoluteUrl(guideIndex("de")),
          en: absoluteUrl(guideIndex("en")),
        },
      },
    },
    ...publicGames.map((game) => ({
      url: absoluteUrl(guidePath(game, locale)),
      alternates: {
        languages: {
          de: absoluteUrl(guidePath(game, "de")),
          en: absoluteUrl(guidePath(game, "en")),
        },
      },
    })),
  ]),
];

export function homeMetadata(locale: Locale) {
  return pageMetadata(
    locale === "de"
      ? "Sprachwelten – kostenlose Sprachspiele online"
      : "Sprachwelten – free online language games",
    locale === "de"
      ? "Kostenlose Sprachspiele für dich und deine Freunde: Redewendungen, Dialekte, Tabu und Zungenbrecher. Direkt im Browser, auf Deutsch und Englisch."
      : "Free language games for you and your friends: idioms, dialects, Taboo and tongue twisters. Play in your browser, in German or English.",
    locale === "de" ? "/" : "/en",
    locale,
    {
      de: absoluteUrl("/"),
      en: absoluteUrl("/en"),
      "x-default": absoluteUrl("/"),
    },
  );
}
