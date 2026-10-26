"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { translate, type Locale } from "./translations";
export type { Locale } from "./translations";
const I18n = createContext({
  locale: "de" as Locale,
  setLocale: (_locale: Locale) => {},
  t: (text: string) => text,
});
export function I18nProvider({
  children,
  initialLocale = "de",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLanguage] = useState<Locale>(initialLocale);
  useEffect(() => {
    const path = window.location.pathname;
    const routeLocale =
      path === "/en" || path.startsWith("/en/")
        ? "en"
        : path === "/lernen" || path === "/spiele" || path.startsWith("/spiele/")
          ? "de"
          : null;
    const parameter = new URLSearchParams(window.location.search).get("lang");
    const explicit =
      routeLocale ??
      (parameter === "en" || parameter === "de" ? parameter : null);
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("sprachwelten-language");
    } catch {}
    const preferred =
      explicit ?? (stored === "de" || stored === "en" ? stored : null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the route or saved browser language once.
    if (preferred) setLanguage(preferred);
  }, []);
  const setLocale = useCallback((value: Locale) => {
    setLanguage(value);
    try {localStorage.setItem("sprachwelten-language", value);} catch {/* The current tab can still change language when storage is blocked. */}
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const t = useCallback((text: string) => translate(text, locale), [locale]);
  return (
    <I18n.Provider value={{ locale, setLocale, t }}>{children}</I18n.Provider>
  );
}
export const useI18n = () => useContext(I18n);
