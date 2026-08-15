import { supabase } from './supabase.js'

// Единый discount-движок (см. supabase/promo-and-wheel.sql, DECISIONS #D-007).
// Клиент НИКОГДА не считает и не присылает итоговую скидку — только показывает
// preview из trusted-RPC. Финальную скидку считает и фиксирует place_order.

const PROMO_ERROR_CODES = [
  'AUTH_REQUIRED',
  'PROMO_NOT_FOUND',
  'PROMO_INACTIVE',
  'PROMO_EXPIRED',
  'PROMO_NOT_STARTED',
  'PROMO_ACCOUNT_MISMATCH',
  'PROMO_ALREADY_USED',
  'PROMO_LIMIT_REACHED',
  'PROMO_MIN_ORDER',
]

// Достаём кодовую причину из сообщения PostgREST (raw ошибку пользователю не показываем).
export const promoErrorCode = (error) => {
  const message = String(error?.message || error || '')
  return PROMO_ERROR_CODES.find((code) => message.includes(code)) || 'PROMO_INVALID'
}

// i18n-ключ по коду ошибки промокода
export const promoErrorKey = (codeOrError) => {
  const code = typeof codeOrError === 'string' && PROMO_ERROR_CODES.includes(codeOrError)
    ? codeOrError
    : promoErrorCode(codeOrError)
  return `promo_err_${code}`
}

// Preview скидки для checkout (Apply). Только читает — использование НЕ фиксирует.
// Бросает Error с кодовой причиной (PROMO_* / AUTH_REQUIRED / PROMO_INVALID).
export const validatePromo = async (code, subtotal) => {
  if (!supabase) throw new Error('PROMO_INVALID')
  const clean = String(code || '').trim()
  if (!clean) throw new Error('PROMO_NOT_FOUND')
  const { data, error } = await supabase.rpc('validate_promo', {
    p_code: clean,
    p_subtotal: Number(subtotal) || 0,
  })
  if (error) throw new Error(promoErrorCode(error))
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('PROMO_INVALID')
  return {
    code: clean,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    discountAmount: Number(row.discount_amount),
  }
}

// Скидка от текущего subtotal по уже проверенному промокоду (для пересчёта summary,
// если корзина изменилась). Сервер всё равно пересчитает авторитетно при заказе.
export const previewDiscount = (promo, subtotal) => {
  if (!promo) return 0
  const base = Number(subtotal) || 0
  if (promo.discountType === 'percent') {
    return Math.round(base * (Number(promo.discountValue) || 0)) / 100 // 2 знака
  }
  return Math.min(Number(promo.discountValue) || 0, base)
}
