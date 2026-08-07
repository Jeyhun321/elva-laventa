import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { IconHome, IconGrid, IconHeart, IconBag, IconSettings } from './Icons.jsx'

// Aşağıdakı tab paneli — yalnız mobil ekranda (CSS ilə ≤900px).
// Səbət sayğacı başlıqdakı ilə EYNİ dəyəri göstərir (cartCount = sayların cəmi).
export default function TabBar() {
  const { t } = useI18n()
  const { cartCount, favCount } = useShop()
  const { pathname } = useLocation()
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  // Aşağı sürüşdürəndə panel gizlənir, yuxarı sürüşdürəndə qayıdır.
  useEffect(() => {
    if (typeof window === 'undefined') return
    lastY.current = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const diff = y - lastY.current
      if (Math.abs(diff) < 8) return // kiçik titrəyişlərə reaksiya vermirik
      // Səhifənin ən başında panel həmişə görünür
      setHidden(y > 90 && diff > 0)
      lastY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // İdarə panelində mağaza tabları göstərilmir
  if (pathname.startsWith('/admin')) return null
  // Məhsul səhifəsində aşağı naviqasiya gizlənir — altdakı sabit "Səbətə əlavə et"
  // paneli ilə üst-üstə düşməsin (mockup: məhsulda alt-menyu yoxdur, alış paneli var).
  if (pathname.startsWith('/product')) return null

  // Məhsul səhifəsi də "Kataloq" bölməsinə aiddir
  const isActive = (to) => (
    to === '/'
      ? pathname === '/'
      : to === '/catalog'
        ? pathname.startsWith('/catalog') || pathname.startsWith('/product')
        : pathname.startsWith(to)
  )

  const tabs = [
    { to: '/', label: t('home'), Icon: IconHome },
    { to: '/catalog', label: t('catalog'), Icon: IconGrid },
    { to: '/favorites', label: t('favorites'), Icon: IconHeart, count: favCount },
    { to: '/cart', label: t('cart'), Icon: IconBag, count: cartCount },
    { to: '/settings', label: t('settings'), Icon: IconSettings },
  ]

  return (
    <nav className={`tabbar${hidden ? ' tabbar-hidden' : ''}`} aria-label={t('menu')}>
      {tabs.map(({ to, label, Icon, count }) => {
        const active = isActive(to)
        return (
          <Link
            key={to}
            to={to}
            className={`tabbar-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="tabbar-icon">
              <Icon />
              {count > 0 && <span className="tabbar-badge">{count > 99 ? '99+' : count}</span>}
            </span>
            <span className="tabbar-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
