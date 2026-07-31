import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import TabBar from './components/TabBar.jsx'
import ShopAuthGate from './components/ShopAuthGate.jsx'
import SystemLogReporter from './components/SystemLogReporter.jsx'
import { useI18n } from './i18n/I18nContext.jsx'
import { useCatalog } from './context/CatalogContext.jsx'

// Ana səhifə dərhal lazımdır — ayrıca yüklənmir.
import HomePage from './pages/HomePage.jsx'

// Qalan səhifələr yalnız açılanda yüklənir (route-based code splitting).
// Beləliklə ana səhifədə admin paneli, sifariş və kataloq kodu yüklənmir.
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx'))
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname, search])
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

  return (
    <>
      <ScrollToTop />
      <SystemLogReporter />
      <Header />
      <main>
        {catalogLoading ? <RouteLoading /> : (
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />
              {/* Gizli idarə paneli — menyuda göstərilmir */}
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        )}
      </main>
      <Footer />
      <TabBar />
      <ShopAuthGate />
    </>
  )
}
