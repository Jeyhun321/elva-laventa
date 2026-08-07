import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useCatalog } from '../context/CatalogContext.jsx'
import { IconSearch, IconHeart, IconBag, IconMenu, IconClose } from './Icons.jsx'
import { SEARCH_MIN } from '../lib/search.js'
import UserMenu from './UserMenu.jsx'
import flowerLogo from '../assets/elva-laventa-logo.svg'

export default function Header() {
  const { t, lang, setLang, langs } = useI18n()
  const { cartCount, favCount } = useShop()
  const { categories } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()

  const qParam = new URLSearchParams(location.search).get('q') || ''
  const [query, setQuery] = useState(qParam)
  const [catOpen, setCatOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const catRef = useRef(null)
  const inputRef = useRef(null)
  // Naviqasiya effekti üçün son location-a "canlı" istinad (stale closure olmasın)
  const locRef = useRef(location)
  locRef.current = location

  // Sürüşdürəndə başlıq bir az sıxılır və yüngül kölgə alır (yalnız görünüş)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // URL (?q=) → input sinxronu. Yalnız istifadəçi yazmayanda tətbiq olunur ki,
  // öz debounce push-umuz və ya "geri" naviqasiyası inputu döyməsin.
  useEffect(() => {
    const el = inputRef.current
    const typing = el && document.activeElement === el
    if (!typing && qParam !== query) setQuery(qParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam])

  // Yazarkən avtomatik axtarış (debounce ~300ms). Axtarış TAM kliyentdədir —
  // məhsullar onsuz da yaddaşdadır, Supabase-ə hər hərfə sorğu getmir.
  // Yalnız sonuncu dəyər URL-ə yazılır (köhnə sorğu yenisini əvəz etmir) —
  // hər dəyişikliydə əvvəlki timer ləğv olunur (latest-wins, race yoxdur).
  useEffect(() => {
    const q = query.trim()
    const handle = setTimeout(() => {
      const loc = locRef.current
      const curQ = new URLSearchParams(loc.search).get('q') || ''
      if (q.length >= SEARCH_MIN) {
        if (q !== curQ) {
          // Ana səhifədən ilk axtarış — push (geri ana səhifəyə qayıtsın);
          // kataloqda isə replace (hər hərf tarixçəni doldurmasın).
          navigate(`/catalog?q=${encodeURIComponent(q)}`, { replace: loc.pathname === '/catalog' })
        }
      } else if (curQ) {
        navigate('/catalog', { replace: true }) // qısaldı/təmizləndi → adi kataloq
      }
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Lupa/Enter — könüllü əl ilə submit (artıq məcburi deyil)
  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q.length >= SEARCH_MIN ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
    setCatOpen(false)
  }

  // X — inputu və axtarış state-ini təmizlə, adi kataloqa qayıt
  const clearSearch = () => {
    setQuery('')
    const loc = locRef.current
    if (new URLSearchParams(loc.search).get('q')) navigate('/catalog', { replace: true })
    inputRef.current?.focus()
  }

  const goCategory = (id) => {
    navigate(id === 'all' ? '/catalog' : `/catalog?cat=${id}`)
    setCatOpen(false)
  }

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="container header-inner">
        <a href={import.meta.env.BASE_URL} className="brand brand-logo" aria-label="Elva LaVenta">
          <img className="brand-logo-image" src={flowerLogo} alt="Elva LaVenta" />
        </a>

        <div className="cat-wrap" ref={catRef}>
          <button
            className={`cat-btn${catOpen ? ' open' : ''}`}
            onClick={() => setCatOpen((o) => !o)}
            aria-expanded={catOpen}
          >
            {catOpen ? <IconClose /> : <IconMenu />}
            <span>{t('catalog')}</span>
          </button>

          {catOpen && (
            <div className="cat-menu" role="menu">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className="cat-menu-item"
                  role="menuitem"
                  onClick={() => goCategory(c.id)}
                >
                  {t(c.label)}
                </button>
              ))}
            </div>
          )}
        </div>

        <form className="search" onSubmit={submitSearch} role="search">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            aria-label={t('search_placeholder')}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={clearSearch}
              aria-label={t('close')}
            >
              <IconClose />
            </button>
          )}
          <button type="submit" className="search-btn" aria-label={t('search_placeholder')}>
            <IconSearch />
          </button>
        </form>

        <div className="header-actions">
          {/* Masaüstü: üç düymə yan-yana (CSS ilə yalnız burada görünür).
              Mobildə dil seçimi başlıqdan çıxarıldı — o, aşağı naviqasiyadakı
              Parametrlər (Settings) səhifəsindədir (i18n məntiqi dəyişməyib). */}
          <div className="lang-switch" role="group" aria-label={t('language')}>
            {langs.map((l) => (
              <button
                key={l.code}
                className={`lang-btn${lang === l.code ? ' active' : ''}`}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
              >
                {l.label}
              </button>
            ))}
          </div>

          <UserMenu />

          <Link to="/favorites" className="header-icon" aria-label={t('favorites')}>
            <IconHeart />
            {favCount > 0 && <span className="count-badge">{favCount}</span>}
            <em>{t('favorites')}</em>
          </Link>

          <Link to="/cart" className="header-icon" aria-label={t('cart')}>
            <IconBag />
            {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            <em>{t('cart')}</em>
          </Link>
        </div>
      </div>
    </header>
  )
}
