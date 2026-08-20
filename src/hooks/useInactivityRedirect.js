import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { logDiag } from '../lib/lifecycleDiag.js'
import { shouldRedirectHome, INACTIVITY_TIMEOUT_MS } from '../lib/inactivity.js'

// İstifadəçi 30 dəqiqə və ya daha çox saytdan uzaq qalıbsa (brauzer bağlı,
// telefon kilidli, tab arxa planda), geri qayıdanda onu avtomatik ana səhifəyə
// aparır. Aktiv istifadəni kəsmir — yoxlama YALNIZ qayıdış anlarında olur.
//
// Nə TƏMİZLƏNMİR: səbət, sevimlilər, giriş, dil, Supabase sessiyası —
// yalnız cari marşrut dəyişir (navigate, reload yox).

const KEY = 'lv_last_activity'
const TIMEOUT_MS = INACTIVITY_TIMEOUT_MS // 30 dəqiqə (общий с src/lib/inactivity.js)
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
    if (shouldRedirectHome({ last, now, path: pathRef.current, timeoutMs: TIMEOUT_MS })) {
      redirectingRef.current = true
      writeNow() // dövrə düşməmək üçün əvvəlcə timestamp-i yeniləyirik
      logDiag('nav-redirect', {
        reason: 'idle-30m', from: pathRef.current, to: '/', replace: true,
        idleMin: Math.round((now - last) / 60000),
        visibilityState: typeof document !== 'undefined' ? document.visibilityState : '?',
      })
      navigate('/', { replace: true })
      window.setTimeout(() => { redirectingRef.current = false }, 1000)
    } else {
      stampThrottled()
    }
  }, [navigate, writeNow, stampThrottled])
  // Ссылка на актуальный maybeRedirect — чтобы эффект ниже НЕ пересоздавался при
  // смене идентичности navigate/maybeRedirect (иначе он повторно вызывал boot-проверку).
  const maybeRedirectRef = useRef(maybeRedirect)
  useEffect(() => { maybeRedirectRef.current = maybeRedirect }, [maybeRedirect])

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
  //
  // LAV-BUG-057: этот эффект должен выполниться РОВНО ОДИН РАЗ (mount). Раньше в
  // deps был `maybeRedirect`, чья идентичность менялась при каждой навигации
  // (через `navigate`), из-за чего эффект пересоздавался и ПОВТОРНО вызывал
  // boot-проверку `maybeRedirect(bootLastRef.current)` со STALE `bootLastRef`.
  // При открытии товара после долгого idle это давало PUSH /product → REPLACE /.
  // Теперь boot-проверка одноразовая, а слушатели зовут актуальный maybeRedirect
  // через ref (свежий readLast()), поведение «30 мин → home» сохранено.
  useEffect(() => {
    maybeRedirectRef.current(bootLastRef.current)
    bootedRef.current = true
    const onVisibility = () => {
      if (document.visibilityState === 'visible') maybeRedirectRef.current(readLast())
    }
    const onPageShow = () => maybeRedirectRef.current(readLast())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
