import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ui, DEFAULT_LANG, LANGS } from './translations.js'

const I18nContext = createContext(null)

const STORAGE_KEY = 'elva_lang'

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)
    return LANGS.some((l) => l.code === saved) ? saved : DEFAULT_LANG
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  // t('key') -> cari dildə mətn; həmçinin {az,ru,en} obyektini birbaşa çevirir
  const t = useCallback(
    (key) => {
      if (key && typeof key === 'object') {
        return key[lang] ?? key[DEFAULT_LANG] ?? ''
      }
      const entry = ui[key]
      if (!entry) return key
      return entry[lang] ?? entry[DEFAULT_LANG] ?? key
    },
    [lang]
  )

  return (
    <I18nContext.Provider value={{ lang, setLang, t, langs: LANGS }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
