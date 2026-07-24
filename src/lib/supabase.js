import { createClient } from '@supabase/supabase-js'

// ============================================================
//  Supabase bağlantısı
//  Bu iki dəyər ictimaidir (public) — brauzerdə görünməsi normaldır.
//  Bazanı RLS siyasətləri qoruyur: oxumaq hamıya, yazmaq yalnız
//  daxil olmuş istifadəçiyə icazəlidir. service_role açarı ASLA burada olmamalıdır.
// ============================================================

export const SUPABASE_URL = 'https://xvuwuxgzsgswlbwrrzsx.supabase.co'
export const SUPABASE_ANON_KEY = '' // TODO: Settings → API → anon public

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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
