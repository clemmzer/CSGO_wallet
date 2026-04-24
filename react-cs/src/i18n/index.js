import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)      // détecte la langue du navigateur
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en }
    },
    fallbackLng: "fr",        // langue par défaut si non détectée
    supportedLngs: ["fr", "en"],
    interpolation: {
      escapeValue: false      // React gère déjà l'échappement XSS
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"] // sauvegarde le choix de l'utilisateur
    }
  });

export default i18n;