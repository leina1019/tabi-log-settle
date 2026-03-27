import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ja } from '../locales/ja';
import { en } from '../locales/en';
import { zh } from '../locales/zh';

export type Language = 'ja' | 'en' | 'zh';

type Translations = typeof ja;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('tabilog_language');
      if (saved === 'ja' || saved === 'en' || saved === 'zh') {
        return saved;
      }
    } catch (e) {
      // Ignore
    }
    return 'ja';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('tabilog_language', lang);
    } catch (e) {}
  };

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let dict: any = ja;
    if (language === 'en') dict = en;
    if (language === 'zh') dict = zh;

    const keys = key.split('.');
    let value = dict;
    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }

    if (value === undefined) {
      // Fallback to ja
      value = ja;
      for (const k of keys) {
        if (value === undefined) break;
        value = (value as any)[k];
      }
    }

    if (typeof value !== 'string') {
      return key; // Missing translation key
    }

    let result = value;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return result;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
};
