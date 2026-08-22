import { Suspense, useEffect, useRef } from 'react'
import { Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import TabBar from './components/TabBar.jsx'
import ShopAuthGate from './components/ShopAuthGate.jsx'
import WheelOfFortune from './components/WheelOfFortune.jsx'
import ImpersonationBanner from './components/ImpersonationBanner.jsx'
import SystemLogReporter from './components/SystemLogReporter.jsx'
import { useI18n } from './i18n/I18nContext.jsx'
import { useCatalog } from './context/CatalogContext.jsx'
import { useAuth } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import NotFoundPage from './components/NotFoundPage.jsx'
import { lazyWithRetry } from './lib/recovery.js'
import { logDiag, idHint } from './lib/lifecycleDiag.js'
import useInactivityRedirect from './hooks/useInactivityRedirect.js'

// Ana səhifə dərhal lazımdır — ayrıca yüklənmir.
import HomePage from './pages/HomePage.jsx'

// Qalan səhifələr yalnız açılanda yüklənir (route-based code splitting).
// Beləliklə ana səhifədə admin paneli, sifariş və kataloq kodu yüklənmir.
const CatalogPage = lazyWithRetry(() => import('./pages/CatalogPage.jsx'))
const ProductPage = lazyWithRetry(() => import('./pages/ProductPage.jsx'))
const CartPage = lazyWithRetry(() => import('./pages/CartPage.jsx'))
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage.jsx'))
const FavoritesPage = lazyWithRetry(() => import('./pages/FavoritesPage.jsx'))
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage.jsx'))
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage.jsx'))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage.jsx'))
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage.jsx'))

// Sürüşmə mövqeyinin idarəsi (LAV-BUG-031).
// Brauzerin öz "auto" bərpası ilə bizim scroll-to-top-un yarışını dayandırırıq:
// history.scrollRestoration = 'manual' → mövqeyi YALNIZ özümüz idarə edirik.
// PUSH/REPLACE (yeni səhifə/filtr) → yuxarı; POP (geri/irəli) → əvvəlki mövqe bərpa
// olunur. Товары асинхрон yükləndiyi üçün bərpanı bir neçə kadr təkrar edirik ki,
// məzmun hündürlüyü dəyişəndə düzgün yerə düşsün (yanlış bölməyə tullanma olmasın).
function ScrollManager() {
  const location = useLocation()
  const navType = useNavigationType()
  const positions = useRef(new Map())

  // Cari maршрутун sürüşmə mövqeyini yadda saxla (kadr-kadr, ucuz).
  useEffect(() => {
    const key = location.key
    const save = () => { positions.current.set(key, window.scrollY) }
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      save() // maршрут dəyişməzdən əvvəl son mövqeyi qeyd et
      window.removeEventListener('scroll', save)
    }
  }, [location.key])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    if (navType === 'POP') {
      const saved = positions.current.get(location.key)
      if (saved != null) {
        let raf = 0
        let tries = 0
        const restore = () => {
          // behavior:'instant' — CSS `scroll-behavior: smooth`-u əvəz edir,
          // yoxsa bərpa smooth animasiya kimi "sıçrayır" (LAV-BUG-036).
          window.scrollTo({ top: saved, left: 0, behavior: 'instant' })
          if (++tries < 8) raf = requestAnimationFrame(restore)
        }
        raf = requestAnimationFrame(restore)
        return () => cancelAnimationFrame(raf)
      }
    }
    // REPLACE (yerində yenilənmə: axtarış/filtr/sort) — mövqeyi SAXLA, sıçratma.
    // Yalnız PUSH (yeni səhifə) yuxarıdan başlayır.
    if (navType === 'PUSH') {
      // Yeni səhifə → dərhal yuxarı. behavior:'instant' MÜTLƏQ lazımdır:
      // əks halda 'auto' CSS `scroll-behavior: smooth`-a tabe olub səhifəni
      // товар açılmazdan əvvəl görünən şəkildə "sürüşdürür" (LAV-BUG-036).
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    return undefined
  }, [location.key, navType])

  return null
}

function AccountHomeRedirect() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const previousAccountId = useRef(undefined)

  useEffect(() => {
    if (loading) return
    const nextAccountId = user?.id || null
    const previous = previousAccountId.current
    // Ana səhifəyə YALNIZ bir HƏQİQİ hesabdan BAŞQA həqiqi hesaba keçəndə (A → B)
    // qayıdırıq. `null → hesab` keçidinə TOXUNMURUQ: bu, ya adi ilk giriş, ya da
    // tab arxa plandan qayıdanda Supabase-in sessiyanı yenidən qurarkən buraxdığı
    // qısamüddətli "çıxış → giriş" sıçrayışıdır (token refresh). Əvvəllər bu sıçrayış
    // məhsul/səbət/checkout səhifəsində olan istifadəçini səhvən ana səhifəyə atırdı.
    if (previous && nextAccountId && previous !== nextAccountId) {
      logDiag('nav-redirect', { reason: 'account-switch', from: idHint(previous), to: idHint(nextAccountId) })
      navigate('/', { replace: true })
    }
    previousAccountId.current = nextAccountId
  }, [loading, navigate, user?.id])

  return null
}

// Səhifə yüklənənə qədər qısa göstərici (boş ekran qalmasın)
function RouteLoading() {
  const { t } = useI18n()
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-dot" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  )
}

export default function App() {
  const { loading: catalogLoading } = useCatalog()
  const location = useLocation()
  const showHomeWhileCatalogLoads = location.pathname === '/'
  // Админка — самостоятельный SaaS-дашборд с собственным sidebar/topbar: витринные
  // Header/Footer/TabBar на /admin не показываем (не дублируем навигацию магазина).
  const isAdminRoute = location.pathname.startsWith('/admin')

  // 30 dəqiqə+ arxa plandan qayıdanda ana səhifəyə (səbət/sessiya toxunulmur)
  useInactivityRedirect()

  // Диагностика: фиксируем каждую смену маршрута (timeline для разбора реального
  // long-idle инцидента — видно, открылся ли product route и не откатился ли он).
  useEffect(() => { logDiag('route', { to: location.pathname }) }, [location.pathname])

  // Brauzerin öz sürüşmə bərpası bizim idarəmizlə yarışmasın (LAV-BUG-031)
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = prev }
  }, [])

  return (
    <>
      <ScrollManager />
      <AccountHomeRedirect />
      <SystemLogReporter />
      <ImpersonationBanner />
      {!isAdminRoute && <Header />}
      <main>
        {catalogLoading && !showHomeWhileCatalogLoads ? <RouteLoading /> : (
          <Suspense fallback={<RouteLoading />}>
            <ErrorBoundary key={location.pathname}>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Gizli idarə paneli — menyuda göstərilmir */}
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        )}
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <TabBar />}
      <ShopAuthGate />
      <WheelOfFortune />
    </>
  )
}
