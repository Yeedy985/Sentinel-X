'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import zh from './locales/zh.json';
import en from './locales/en.json';

type Locale = 'zh' | 'en';
type Translations = typeof zh;

const locales: Record<Locale, Translations> = { zh, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
});

function getNestedValue(obj: any, path: string): string {
  const val = path.split('.').reduce((o, k) => o?.[k], obj);
  return typeof val === 'string' ? val : path;
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem('sentinel_language');
  if (saved === 'en' || saved === 'zh') return saved;
  const nav = navigator.language;
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('sentinel_language', l);
  }, []);

  const t = useCallback((key: string) => {
    return getNestedValue(locales[locale], key);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
