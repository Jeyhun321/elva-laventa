import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { quickCategories } from '../data/homeNav.js'
import {
  IconLayers,
  IconDress,
  IconBlouse,
  IconSkirt,
  IconPercent,
  IconSparkle,
  IconPerfume,
  IconAccessory,
  IconMenu,
  IconClose,
} from './Icons.jsx'

// icon açarı → komponent
const ICONS = {
  layers: IconLayers,
  dress: IconDress,
  blouse: IconBlouse,
  skirt: IconSkirt,
  percent: IconPercent,
  sparkle: IconSparkle,
  perfume: IconPerfume,
}

// Kiçik künc nişanı (mockup: Endirimlər → %, Yenilər → YENİ)
const BADGE = { sale: '%', new: 'YENİ' }

function CircleIcon({ icon }) {
  const Icon = ICONS[icon] || IconAccessory
  return <Icon />
}

export default function Categories() {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)

  // Drawer açıq ikən Escape ilə bağlanır və arxa fon sürüşməsi kilidlənir
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <section className="section cats-section" aria-labelledby="cats-title">
      <div className="container">
        {/* Başlıq — yalnız desktopda (mobildə market görünüşü, kompakt) */}
        <div className="section-head cats-head reveal">
          <span className="eyebrow">{t('cats_eyebrow')}</span>
          <h2 className="section-title" id="cats-title">{t('cats_title')}</h2>
        </div>

        <div className="cats-rail">
          {/* Menyu düyməsi (hamburger) — bütün kateqoriyaları açır. Yalnız mobil. */}
          <button
            type="button"
            className="cats-menu-btn"
            aria-label={t('all_categories')}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu />
          </button>

          <ul className="cats-row">
            {quickCategories.map((cat) => (
              <li key={cat.id}>
                <Link className="cat-circle" to={cat.link}>
                  <span className="cat-circle-icon" aria-hidden="true">
                    <CircleIcon icon={cat.icon} />
                    {BADGE[cat.id] && <span className="cat-circle-badge">{BADGE[cat.id]}</span>}
                  </span>
                  <span className="cat-circle-label">{t(cat.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bütün kateqoriyalar — drawer (hazırda UI; keçidlər real filtrlərə aparır) */}
      {menuOpen && (
        <div className="cat-drawer-root" role="dialog" aria-modal="true" aria-label={t('all_categories')}>
          <div className="cat-drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="cat-drawer">
            <div className="cat-drawer-head">
              <h3 className="cat-drawer-title">{t('all_categories')}</h3>
              <button type="button" className="cat-drawer-close" aria-label={t('close')} onClick={() => setMenuOpen(false)}>
                <IconClose />
              </button>
            </div>
            <ul className="cat-drawer-list">
              {quickCategories.map((cat) => (
                <li key={cat.id}>
                  <Link className="cat-drawer-item" to={cat.link} onClick={() => setMenuOpen(false)}>
                    <span className="cat-drawer-item-icon" aria-hidden="true">
                      <CircleIcon icon={cat.icon} />
                    </span>
                    <span>{t(cat.label)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
