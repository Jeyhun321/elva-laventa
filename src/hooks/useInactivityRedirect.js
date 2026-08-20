import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { logDiag } from '../lib/lifecycleDiag.js'

// İstifadəçi 30 dəqiqə və ya daha çox saytdan uzaq qalıbsa (brauzer bağlı,
// telefon kilidli, tab arxa planda), geri qayıdanda onu avtomatik ana səhifəyə
// aparır. Aktiv istifadəni kəsmir — yoxlama YALNIZ qayıdış anlarında olur.
//
// Nə TƏMİZLƏNMİR: səbət, sevimlilər, giriş, dil, Supabase sessiyası —
// yalnız cari marşrut dəyişir (navigate, reload yox).

const KEY = 'lv_last_activity'
const TIMEOUT_MS = 30 * 60 * 1000 // 30 dəqiqə
const WRITE_THROTTLE_MS = 30 * 1000 // storage-a ən çox 30 saniyədə bir yazırıq

const readLast = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

export default function useInactivityRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  const lastWriteRef = useRef(0)
  const redirectingRef = useRef(false)
  const bootedRef = useRef(false)
  // Saxlanılan damğanı ilk render zamanı (effektlərdən ƏVVƏL) tuturuq ki,
  // marşrut effekti onu yeniləməmişdən qabaq boot yoxlaması doğru dəyəri görsün.
  const bootLastRef = useRef(readLast())

  useEffect(() => {
    pathRef.current = location.pathname
  }, [location.pathname])

  const writeNow = useCallback(() => {
    const now = Date.now()
    lastWriteRef.current = now
    try {
      localStorage.setItem(KEY, String(now))
    } catch {
      /* storage əlçatan deyil — səssiz keçirik */
    }
  }, [])

  // Həddindən çox yazmamaq üçün throttle (hər hərəkətdə deyil)
  const stampThrottled = useCallback(() => {
    if (Date.now() - lastWriteRef.current < WRITE_THROTTLE_MS) return
    writeNow()
  }, [writeNow])

  // Verilən "son aktivlik" dəyərinə görə: 30 dəq+ keçibsə və ana səhifədə
  // deyiliksə → ana səhifə. Əks halda damğanı yenilə.
  const maybeRedirect = useCallback((last) => {
    if (redirectingRef.current) return
    const now = Date.now()
    if (last && now - last >= TIMEOUT_MS && pathRef.current !== '/') {
      redirectingRef.current = true
      writeNow() // dövrə düşməmək üçün əvvəlcə timestamp-i yeniləyirik
      logDiag('nav-redirect', { reason: 'idle-30m', from: pathRef.current, idleMin: Math.round((now - last) / 60000) })
      navigate('/', { replace: true })
      window.setTimeout(() => { redirectingRef.current = false }, 1000)
    } else {
      stampThrottled()
    }
  }, [navigate, writeNow, stampThrottled])

  // Marşrut dəyişməsi = mənalı aktivlik (boot-dan sonra)
  useEffect(() => {
    if (!bootedRef.current) return
    writeNow()
  }, [location.pathname, location.search, writeNow])

  // İstifadəçi hərəkətləri (throttle ilə)
  useEffect(() => {
    const onActivity = () => stampThrottled()
    const events = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => events.forEach((e) => window.removeEventListener(e, onActivity))
  }, [stampThrottled])

  // Qayıdış nöqtələri: ilk yüklənmə (render-də tutulan dəyər), tab yenidən
  // görünəndə və bfcache-dən bərpa (canlı dəyər — arxa planda yazılmır).
  useEffect(() => {
    maybeRedirect(bootLastRef.current)
    bootedRef.current = true
    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRedirect(readLast())
    }
    const onPageShow = () => maybeRedirect(readLast())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [maybeRedirect])
}
