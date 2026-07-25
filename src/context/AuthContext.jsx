import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'

const AuthContext = createContext(null)
const SAVED_ACCOUNTS_KEY = 'elva-laventa-saved-accounts'

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isConfigured)
  const [accounts, setAccounts] = useState(readSavedAccounts)

  const rememberAccount = useCallback((nextUser) => {
    if (!nextUser?.id) return
    const next = accountFromUser(nextUser)
    setAccounts((previous) => {
      const updated = [next, ...previous.filter((item) => item.id !== next.id)].slice(0, 8)
      try { localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated)) } catch { /* storage unavailable */ }
      return updated
    })
  }, [])

  useEffect(() => {
    if (!isConfigured || !supabase) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      rememberAccount(data.session?.user)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      rememberAccount(session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loginWithGoogle = useCallback(async ({ selectAccount = false, loginHint = '' } = {}) => {
    if (!supabase) throw new Error('NOT_CONFIGURED')
    // Google-dan sonra istifadəçi saytın öz ünvanına qayıdır
    const redirectTo = window.location.origin + import.meta.env.BASE_URL
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...((selectAccount || loginHint) ? { queryParams: { prompt: 'select_account', ...(loginHint ? { login_hint: loginHint } : {}) } } : {}),
      },
    })
    if (error) throw error
  }, [])

  const switchToSavedAccount = useCallback(async (account) => {
    await loginWithGoogle({ selectAccount: true, loginHint: account?.email || '' })
  }, [loginWithGoogle])

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
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
  const profile = user
    ? {
        id: user.id,
        email: user.email || '',
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split('@')[0] : ''),
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      }
    : null

  return (
    <AuthContext.Provider
      value={{
        user, profile, accounts, loading,
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
