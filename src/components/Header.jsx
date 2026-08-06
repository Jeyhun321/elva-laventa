import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useCatalog } from '../context/CatalogContext.jsx'
import { IconSearch, IconHeart, IconBag, IconMenu, IconClose } from './Icons.jsx'
import UserMenu from './UserMenu.jsx'
import flowerLogo from '../assets/elva-laventa-logo.svg'

export default function Header() {
  const { t, lang, setLang, langs } = useI18n()
  const { cartCount, favCount } = useShop()
  const { categories } = useCatalog()
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // Mobildə dil üç düymə yerinə açılan siyahıdır (yer qazanmaq üçün)
  const [langOpen, setLangOpen] = useState(false)
  const catRef = useRef(null)
  const langRef = useRef(null)

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
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Dil siyahısı Esc ilə bağlanır
  useEffect(() => {
    if (!langOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setLangOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [langOpen])

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
    setCatOpen(false)
  }

  const changeSearch = (value) => {
    setQuery(value)
    if (!value.trim() && location.pathname === '/catalog') {
      navigate('/catalog', { replace: true })
    }
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
            type="search"
            value={query}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            aria-label={t('search_placeholder')}
          />
          <button type="submit" className="search-btn" aria-label={t('search_placeholder')}>
            <IconSearch />
          </button>
        </form>

        <div className="header-actions">
          {/* Masaüstü: üç düymə yan-yana (CSS ilə yalnız burada görünür) */}
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

          {/* Mobil: açılan siyahı — yalnız seçilmiş dil görünür */}
          <div className="lang-select" ref={langRef}>
            <button
              type="button"
              className={`lang-select-btn${langOpen ? ' open' : ''}`}
              onClick={() => setLangOpen((o) => !o)}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label={t('language')}
            >
              <span>{langs.find((l) => l.code === lang)?.label || lang}</span>
              <i className="lang-caret" aria-hidden="true" />
            </button>

            {langOpen && (
              <ul className="lang-menu" role="listbox" aria-label={t('language')}>
                {langs.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={lang === l.code}
                      className={`lang-menu-item${lang === l.code ? ' active' : ''}`}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
