import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lang, TranslationKey } from '@/lib/i18n';
import { translations, isRTL } from '@/lib/i18n';

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  rtl: boolean;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

const STORAGE_KEY = 'sadi-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    return stored ?? 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    const rtl = isRTL(lang);
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: TranslationKey) => translations[lang][key] ?? translations.en[key] ?? key;
  const rtl = isRTL(lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, rtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
