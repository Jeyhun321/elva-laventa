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
const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.endsWith('/admin')

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

// Админка хранит авторизацию отдельно от авторизации витрины. Благодаря этому
// владелец может быть в админке под одним Gmail, а на сайте — под другим.
export const adminSupabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // OAuth-код админки должен обрабатываться только на /admin.
        // Иначе вход обычного покупателя мог бы случайно создать админ-сеанс.
        detectSessionInUrl: isAdminRoute,
        storageKey: 'elva-laventa-admin-auth',
      },
    })
  : null

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
