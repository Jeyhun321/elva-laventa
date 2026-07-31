import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)
const SAVED_ACCOUNTS_KEY = 'elva-laventa-saved-accounts'

function publicAuthRedirectUrl() {
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString()
}

function readSavedAccounts() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function accountFromUser(user) {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
  }
}

function isGoogleUser(user) {
  const providers = [
    user?.app_metadata?.provider,
    ...(user?.identities || []).map((identity) => identity?.provider),
  ].filter(Boolean)

  return providers.includes('google')
}

function sessionForStorage(session) {
  if (!session?.access_token || !session?.refresh_token) return null
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  }
}

function withTimeout(promise, timeoutMs = 6000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('AUTH_TIMEOUT')), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isConfigured)
  const [accounts, setAccounts] = useState(readSavedAccounts)

  const rememberAccount = useCallback((nextUser, session) => {
    if (!nextUser?.id) return
    const nextSession = sessionForStorage(session)
    setAccounts((previous) => {
      const existing = previous.find((item) => item.id === nextUser.id)
      const next = {
        ...existing,
        ...accountFromUser(nextUser),
        ...(nextSession ? { session: nextSession } : {}),
      }
      const updated = [next, ...previous.filter((item) => item.id !== next.id)].slice(0, 10)
      try { localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated)) } catch { /* storage unavailable */ }
      return updated
    })
  }, [])

  useEffect(() => {
    if (!isConfigured || !supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      rememberAccount(data.session?.user, data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      rememberAccount(session?.user, session)
    })
    return () => sub.subscription.unsubscribe()
  }, [rememberAccount])

const loginWithGoogle = useCallback(async ({ selectAccount = false, loginHint = '', returnTo = '' } = {}) => {
  if (!supabase) throw new Error('NOT_CONFIGURED')
  if (returnTo.startsWith('/')) sessionStorage.setItem('elva-laventa-auth-return-to', returnTo)
    const { data: currentSession } = await supabase.auth.getSession()
    rememberAccount(currentSession.session?.user, currentSession.session)
    // Google-dan sonra istifadəçi GitHub Pages-də mağazanın düzgün ünvanına qayıdır.
    const redirectTo = publicAuthRedirectUrl()
    const { data, error } = await withTimeout(supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...((selectAccount || loginHint) ? { queryParams: { prompt: 'select_account', ...(loginHint ? { login_hint: loginHint } : {}) } } : {}),
      },
    }))
    if (error) throw error
    // Обычно Supabase сразу переводит браузер на Google. Этот запасной
    // переход нужен для браузеров, где автоматический редирект отключён.
    if (data?.url) window.location.assign(data.url)
  }, [rememberAccount])

  const switchToSavedAccount = useCallback(async (account) => {
    if (!account?.session?.accessToken || !account?.session?.refreshToken) {
      throw new Error('SAVED_SESSION_MISSING')
    }
    const { data, error } = await withTimeout(supabase.auth.setSession({
      access_token: account.session.accessToken,
      refresh_token: account.session.refreshToken,
    }))
    if (error) throw error
    setUser(data.user ?? null)
    rememberAccount(data.user, data.session)
  }, [rememberAccount])

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut({ scope: 'local' })
  }, [])

  // E-poçt + şifrə ilə qeydiyyat.
  // Ad, nömrə və doğum tarixi metadata-ya yazılır — trigger onları
  // profiles cədvəlinə köçürür.
  const signUp = useCallback(async ({ email, password, fullName, phone, birthDate }) => {
    if (!supabase) throw new Error('NOT_CONFIGURED')
    const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          birth_date: birthDate || '',
        },
      },
    })
    if (error) throw error
    // session boşdursa — təsdiq məktubu gözlənilir
    return { needsConfirm: !data.session }
  }, [])

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) throw new Error('NOT_CONFIGURED')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
  }, [])

  // «Şifrəni unutdum» — poçta bərpa linki göndərir
  const sendPasswordReset = useCallback(async (email) => {
    if (!supabase) throw new Error('NOT_CONFIGURED')
    const redirectTo = window.location.origin + import.meta.env.BASE_URL + 'reset'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw error
  }, [])

  // Bərpa linkindən sonra yeni şifrəni təyin edir
  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase) throw new Error('NOT_CONFIGURED')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }, [])

  // Google profilindən ad və şəkil
  const profile = user ? accountFromUser(user) : null
  const activeSavedAccount = user ? accounts.find((account) => account.id === user.id) || {} : null
  const visibleAccounts = user
    ? [{ ...activeSavedAccount, ...accountFromUser(user) }, ...accounts.filter((account) => account.id !== user.id)]
    : accounts

  return (
    <AuthContext.Provider
      value={{
        user, profile, accounts: visibleAccounts, loading,
        // isSignedIn — HƏR hansı yolla daxil olmuş istifadəçi (Google və ya e-poçt).
        // isGoogleUser — YALNIZ Google. Hazırda səbət/sevimlilər ona bağlıdır,
        // ona görə 1-ci addımda mənası DƏYİŞMİR (2-ci addımda keçirilecek).
        isSignedIn: Boolean(user),
        isGoogleUser: isGoogleUser(user),
        loginWithGoogle, logout, signUp, signInWithPassword,
        sendPasswordReset, updatePassword, switchToSavedAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
