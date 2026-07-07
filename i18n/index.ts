import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import hi from './locales/hi'
import id from './locales/id'
import ja from './locales/ja'
import ko from './locales/ko'
import ms from './locales/ms'
import pt from './locales/pt'
import ru from './locales/ru'
import tr from './locales/tr'
import ur from './locales/ur'
import zh from './locales/zh'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'ur', nativeName: 'اردو' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', nativeName: 'Bahasa Melayu' },
] as const

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    de: { translation: de },
    es: { translation: es },
    fr: { translation: fr },
    hi: { translation: hi },
    id: { translation: id },
    ja: { translation: ja },
    ko: { translation: ko },
    ms: { translation: ms },
    pt: { translation: pt },
    ru: { translation: ru },
    tr: { translation: tr },
    ur: { translation: ur },
    zh: { translation: zh },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
