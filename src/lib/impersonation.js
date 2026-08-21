import { supabase } from './supabase.js'

// Owner impersonation ("Войти как пользователь"). Actor (owner) остаётся
// аутентифицированным; доступ к данным target — ТОЛЬКО через is_admin-gated
// server RPC (supabase/admin-impersonation.sql). Второй auth-клиент НЕ создаётся,
// сессия owner не подменяется, service_role во фронте не используется.
// Контекст выбранного пользователя хранится tab-scoped (sessionStorage) и имеет TTL.

const SS_KEY = 'elva_impersonation'

export const readStoredImpersonation = () => {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v?.targetId || !v?.expiresAt) return null
    if (new Date(v.expiresAt).getTime() <= Date.now()) { sessionStorage.removeItem(SS_KEY); return null }
    return v
  } catch { return null }
}

const store = (v) => {
  try {
    if (v) sessionStorage.setItem(SS_KEY, JSON.stringify(v))
    else sessionStorage.removeItem(SS_KEY)
  } catch { /* storage unavailable */ }
}

export const clearStoredImpersonation = () => store(null)

// Старт: сервер проверяет is_admin() + существование target, создаёт grant с TTL,
// пишет аудит и возвращает контекст выбранного пользователя.
export const startImpersonation = async (targetId) => {
  if (!supabase) throw new Error('NO_DB')
  const { data, error } = await supabase.rpc('admin_impersonation_start', { p_target: targetId })
  if (error) throw new Error(error.message)
  const v = { targetId: data.target_id, email: data.email, name: data.full_name, expiresAt: data.expires_at }
  store(v)
  return v
}

// Завершение: серверный grant закрывается + аудит; owner-сессия НЕ трогается.
export const endImpersonation = async () => {
  store(null)
  if (supabase) { try { await supabase.rpc('admin_impersonation_end') } catch { /* всё равно вышли локально */ } }
}

// Data-обёртки (возвращают { data, error } как supabase — для ShopContext).
export const impGetCart = (t) => supabase.rpc('admin_imp_get_cart', { p_target: t })
export const impCartUpsert = (t, product, size, qty) =>
  supabase.rpc('admin_imp_cart_upsert', { p_target: t, p_product: Number(product), p_size: size || '', p_qty: Number(qty) || 1 })
export const impCartRemove = (t, product, size) =>
  supabase.rpc('admin_imp_cart_remove', { p_target: t, p_product: Number(product), p_size: size || '' })
export const impCartClear = (t) => supabase.rpc('admin_imp_cart_clear', { p_target: t })
export const impGetFavorites = (t) => supabase.rpc('admin_imp_get_favorites', { p_target: t })
export const impFavToggle = (t, product) =>
  supabase.rpc('admin_imp_fav_toggle', { p_target: t, p_product: Number(product) })
export const impGetProfile = (t) => supabase.rpc('admin_imp_get_profile', { p_target: t })
export const impGetWheelStatus = (t) => supabase.rpc('admin_imp_get_wheel_status', { p_target: t })
