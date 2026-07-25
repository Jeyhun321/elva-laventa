import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ui, DEFAULT_LANG, LANGS } from './translations.js'

const I18nContext = createContext(null)

const STORAGE_KEY = 'elva_lang'

// Названия уже добавленных товаров. Это запасной перевод для старых записей,
// где в базе одно и то же название было сохранено для всех языков.
const productNameTranslations = {
  'çiçəkli maxi don': { az: 'Çiçəkli Maxi Don', ru: 'Цветочное макси-платье', en: 'Floral Maxi Dress' },
  'qırmızı ürəkli maxi don': { az: 'Qırmızı Ürəkli Maxi Don', ru: 'Красное макси-платье с сердечками', en: 'Red Heart Maxi Dress' },
  'çəhrayı ürəkli maxi don': { az: 'Çəhrayı Ürəkli Maxi Don', ru: 'Розовое макси-платье с сердечками', en: 'Pink Heart Maxi Dress' },
  'qəhvəyi çiçəkli don': { az: 'Qəhvəyi Çiçəkli Don', ru: 'Коричневое платье с цветами', en: 'Brown Floral Dress' },
  'narıncı kətan don': { az: 'Narıncı Kətan Don', ru: 'Оранжевое льняное платье', en: 'Orange Linen Dress' },
  'bej kətan köynək donu': { az: 'Bej Kətan Köynək Donu', ru: 'Бежевое льняное платье-рубашка', en: 'Beige Linen Shirt Dress' },
  'mavi kətan köynək donu': { az: 'Mavi Kətan Köynək Donu', ru: 'Синее льняное платье-рубашка', en: 'Blue Linen Shirt Dress' },
  'boz kətan don': { az: 'Boz Kətan Don', ru: 'Серое льняное платье', en: 'Grey Linen Dress' },
  'bordo kətan don': { az: 'Bordo Kətan Don', ru: 'Бордовое льняное платье', en: 'Burgundy Linen Dress' },
  'duman boz kətan don': { az: 'Duman Boz Kətan Don', ru: 'Дымчато-серое льняное платье', en: 'Smoke Grey Linen Dress' },
  'qəhvəyi kətan köynək donu': { az: 'Qəhvəyi Kətan Köynək Donu', ru: 'Коричневое льняное платье-рубашка', en: 'Brown Linen Shirt Dress' },
  'parlaq narıncı kətan don': { az: 'Parlaq Narıncı Kətan Don', ru: 'Ярко-оранжевое льняное платье', en: 'Bright Orange Linen Dress' },
  'yaşıl kətan don': { az: 'Yaşıl Kətan Don', ru: 'Зелёное льняное платье', en: 'Green Linen Dress' },
  'zeytun kətan köynək donu': { az: 'Zeytun Kətan Köynək Donu', ru: 'Оливковое льняное платье-рубашка', en: 'Olive Linen Shirt Dress' },
}

const normaliseText = (value) => String(value || '').trim().toLocaleLowerCase('az')

const parseLocalisedValue = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text.startsWith('{')) return null

  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const getProductTranslation = (value) => {
  const localised = parseLocalisedValue(value)
  const candidates = localised
    ? [localised.az, localised.ru, localised.en]
    : [value]

  return candidates
    .map((candidate) => productNameTranslations[normaliseText(candidate)])
    .find(Boolean)
}

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
      const localised = parseLocalisedValue(key)
      if (localised) {
        const translatedProduct = getProductTranslation(localised)
        const requested = String(localised[lang] ?? '').trim()
        const azValue = String(localised.az ?? '').trim()

        // Если старый товар сохранён без отдельных переводов, подставляем
        // корректное название на выбранном языке. Ручной перевод из админки
        // всегда остаётся приоритетным.
        if (translatedProduct && (!requested || requested === azValue)) {
          return translatedProduct[lang] ?? translatedProduct[DEFAULT_LANG]
        }

        return requested || localised[DEFAULT_LANG] || localised.az || localised.en || localised.ru || ''
      }

      if (typeof key === 'string') {
        const translatedProduct = getProductTranslation(key)
        if (translatedProduct) return translatedProduct[lang] ?? translatedProduct[DEFAULT_LANG]
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
