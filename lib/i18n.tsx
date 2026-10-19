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
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLanguage] = useState<Locale>("de");
  useEffect(() => {
    const stored = localStorage.getItem("sprachwelten-language");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the persisted browser language once after server rendering.
    if (stored === "de" || stored === "en") setLanguage(stored);
  }, []);
  const setLocale = useCallback((value: Locale) => {
    setLanguage(value);
    localStorage.setItem("sprachwelten-language", value);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "Sprachwelten";
  }, [locale]);
  const t = useCallback((text: string) => translate(text, locale), [locale]);
  return (
    <I18n.Provider value={{ locale, setLocale, t }}>{children}</I18n.Provider>
  );
}
export const useI18n = () => useContext(I18n);
