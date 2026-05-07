import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { en, zh, type Translations } from "../i18n";
import type { Locale, LocaleSetting } from "../types";
import { readStorage, writeStorage } from "../lib/storage";

const locales: Record<Locale, Translations> = { en, zh };

interface I18nContextValue {
  locale: Locale;
  localeSetting: LocaleSetting;
  setLocaleSetting: (locale: LocaleSetting) => void;
  t: Translations;
}

const STORAGE_KEY = "my-bookmark-locale";

function resolveLocale(setting: LocaleSetting): Locale {
  if (setting === "system") return navigator.language.startsWith("zh") ? "zh" : "en";
  return setting;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localeSetting, setLocaleSettingState] = useState<LocaleSetting>("system");
  const [locale, setLocale] = useState<Locale>(resolveLocale("system"));

  useEffect(() => {
    readStorage<LocaleSetting>(STORAGE_KEY, "system").then((saved) => {
      const valid = saved === "en" || saved === "zh" || saved === "system" ? saved : "system";
      setLocaleSettingState(valid);
      setLocale(resolveLocale(valid));
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      if (localeSetting === "system") setLocale(resolveLocale("system"));
    };
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", handler);
    return () => window.matchMedia?.("(prefers-color-scheme: dark)").removeEventListener?.("change", handler);
  }, [localeSetting]);

  const setLocaleSetting = useCallback((newLocale: LocaleSetting) => {
    setLocaleSettingState(newLocale);
    setLocale(resolveLocale(newLocale));
    void writeStorage(STORAGE_KEY, newLocale);
  }, []);

  const value: I18nContextValue = {
    locale,
    localeSetting,
    setLocaleSetting,
    t: locales[locale],
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
