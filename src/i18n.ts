// src/i18n.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importamos los archivos de traducción que nos pasaste
import enTranslations from './locales/en/translations.json';
import esTranslations from './locales/es/translations.json';
import ptTranslations from './locales/pt/translations.json';

i18n
  .use(initReactI18next) // Pasa i18n a react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      es: {
        translation: esTranslations,
      },
      pt: {
        translation: ptTranslations,
      },
    },
    fallbackLng: 'en', // Idioma por defecto si el del navegador no está disponible
    interpolation: {
      escapeValue: false, // React ya se encarga de la seguridad (XSS)
    },
  });

export default i18n;