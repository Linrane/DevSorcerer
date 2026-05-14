import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type Language, languages, translations } from './translations';

const STORAGE_KEY = 'devsorcerer-language';

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* localStorage unavailable */ }

  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      if (lang === 'en') {
        if (vars) return fillVars(key, vars);
        return key;
      }
      const dict = translations[lang];
      let result = dict[key] ?? key;
      if (vars) result = fillVars(result, vars);
      return result;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  return useContext(LanguageContext);
}

function fillVars(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(`{${k}}`, String(v));
  }
  return result;
}
