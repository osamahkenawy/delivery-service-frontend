import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import hi from './locales/hi.json';
import tl from './locales/tl.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  es: { translation: es },
  pt: { translation: pt },
  hi: { translation: hi },
  tl: { translation: tl }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;


