import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  readStoredImpersonation, startImpersonation as apiStart,
  endImpersonation as apiEnd, clearStoredImpersonation,
} from '../lib/impersonation.js'

// Централизованный контекст режима «owner работает как выбранный пользователь».
//  - authenticatedActor = реальный owner (его Supabase-сессия не меняется);
//  - effectiveAccount   = impersonation.targetId (реальный UUID выбранного юзера).
// Хранится tab-scoped (sessionStorage) + TTL; серверный grant тоже истекает.
const ImpersonationContext = createContext(null)

export function ImpersonationProvider({ children }) {
  const [impersonation, setImpersonation] = useState(() => readStoredImpersonation())

  // Автовыход по истечении TTL (клиентская страховка; сервер тоже отклонит по expiry).
  useEffect(() => {
    if (!impersonation) return undefined
    const ms = new Date(impersonation.expiresAt).getTime() - Date.now()
    if (ms <= 0) { clearStoredImpersonation(); setImpersonation(null); return undefined }
    const id = window.setTimeout(() => { clearStoredImpersonation(); setImpersonation(null) }, Math.min(ms, 2_000_000_000))
    return () => window.clearTimeout(id)
  }, [impersonation])

  const startImpersonation = useCallback(async (targetId) => {
    const v = await apiStart(targetId)   // сервер решает: is_admin + target существует
    setImpersonation(v)
    return v
  }, [])

  const endImpersonation = useCallback(async () => {
    await apiEnd()
    setImpersonation(null)
  }, [])

  return (
    <ImpersonationContext.Provider
      value={{ impersonation, isImpersonating: Boolean(impersonation), startImpersonation, endImpersonation }}
    >
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider')
  return ctx
}
