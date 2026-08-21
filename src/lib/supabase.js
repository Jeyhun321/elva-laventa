import { createClient } from '@supabase/supabase-js'

// ============================================================
//  Supabase bağlantısı
//  Bu iki dəyər ictimaidir (public) — brauzerdə görünməsi normaldır.
//  Bazanı RLS siyasətləri qoruyur: oxumaq hamıya, yazmaq yalnız
//  daxil olmuş istifadəçiyə icazəlidir. service_role açarı ASLA burada olmamalıdır.
// ============================================================

export const SUPABASE_URL = 'https://njvlvceqkjsvlfyajmee.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_btLK4kgQowu111Gu1NULtQ_eh2OudI6'

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Клиент сам завершает OAuth после возврата Google. Это поддерживает
        // и код в URL, и токен в hash, поэтому вход не зависит от формата ответа.
        detectSessionInUrl: true,
        storageKey: 'elva-laventa-store-auth',
      },
    })
  : null

// LAV-BUG (admin identity mismatch): админка использует ТУ ЖЕ сессию, что и
// витрина — единая identity. Прежняя отдельная admin-сессия (storageKey
// 'elva-laventa-admin-auth') была уязвимостью: устаревший owner-токен в ней
// давал доступ к /admin, даже когда на сайте выбран ДРУГОЙ аккаунт. Теперь
// owner-eligibility решает ТЕКУЩИЙ витринный аккаунт (его JWT в is_admin()),
// а смена аккаунта на витрине мгновенно пересчитывает доступ.
export const adminSupabase = supabase

// Одноразовая очистка осиротевшего хранилища прежней admin-сессии, чтобы старый
// owner-токен не «воскрешал» доступ. Витринную сессию/корзину НЕ трогаем.
try {
  if (typeof window !== 'undefined') window.localStorage.removeItem('elva-laventa-admin-auth')
} catch { /* storage unavailable */ }

// --- Kömkəçi funksiyalar ---

export const signInWithGoogle = async (redirectTo) => {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo || window.location.origin + import.meta.env.BASE_URL },
  })
}

export const signOut = async () => {
  if (!supabase) return
  await supabase.auth.signOut()
}

export const getSession = async () => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
