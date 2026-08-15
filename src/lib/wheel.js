import { supabase } from './supabase.js'

// Wheel of Fortune — весь trust на сервере (supabase/promo-and-wheel.sql):
//  - окно проверяется по серверному времени в Asia/Baku;
//  - результат (процент) выбирает spin_wheel weighted-логикой;
//  - один спин на окно гарантирует UNIQUE(account_id, window_key);
//  - выигрыш = account-bound промокод (source=wheel) через общий promo-движок.
// Клиент только показывает приглашение и анимирует колесо к готовому результату.

const WHEEL_ERROR_CODES = ['AUTH_REQUIRED', 'WHEEL_DISABLED', 'WHEEL_CLOSED', 'WHEEL_ALREADY_SPUN', 'WHEEL_NO_REWARDS']

export const wheelErrorCode = (error) => {
  const message = String(error?.message || error || '')
  return WHEEL_ERROR_CODES.find((code) => message.includes(code)) || 'WHEEL_ERROR'
}

// Публичный конфиг для отрисовки колеса (без весов). Возвращает достижимые проценты.
export const getWheelConfig = async () => {
  if (!supabase) return { enabled: false }
  const { data, error } = await supabase.rpc('get_wheel_public_config')
  if (error) return { enabled: false }
  return data || { enabled: false }
}

// Статус для текущего аккаунта: в окне? уже крутил? есть активная награда?
export const getWheelStatus = async () => {
  if (!supabase) return { enabled: false, in_window: false, signed_in: false }
  const { data, error } = await supabase.rpc('get_wheel_status')
  if (error) return { enabled: false, in_window: false, signed_in: false }
  return data || { enabled: false }
}

// Крутить. Результат определяет сервер; бросает Error с кодовой причиной.
export const spinWheel = async () => {
  if (!supabase) throw new Error('WHEEL_ERROR')
  const { data, error } = await supabase.rpc('spin_wheel')
  if (error) throw new Error(wheelErrorCode(error))
  return data // { percent, code, expires_at }
}
