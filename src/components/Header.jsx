import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useCatalog } from '../context/CatalogContext.jsx'
import { IconSearch, IconHeart, IconBag, IconMenu, IconClose } from './Icons.jsx'
import UserMenu from './UserMenu.jsx'
import flowerLogo from '../assets/elva-laventa-flower-logo.png'

export default function Header() {
  const { t, lang, setLang, langs } = useI18n()
  const { cartCount, favCount } = useShop()
  const { categories } = useCatalog()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
    setCatOpen(false)
  }

  const goCategory = (id) => {
    navigate(id === 'all' ? '/catalog' : `/catalog?cat=${id}`)
    setCatOpen(false)
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand brand-logo" aria-label="Elva LaVenta">
          <img className="brand-logo-image" src={flowerLogo} alt="Elva LaVenta" />
        </Link>

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            aria-label={t('search_placeholder')}
          />
          <button type="submit" className="search-btn" aria-label={t('search_placeholder')}>
            <IconSearch />
          </button>
        </form>

        <div className="header-actions">
          <div className="lang-switch" role="group" aria-label="Language">
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
