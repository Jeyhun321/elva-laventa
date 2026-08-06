import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { quickCategories } from '../data/homeNav.js'
import {
  IconDress,
  IconBlouse,
  IconSkirt,
  IconPercent,
  IconSparkle,
  IconPerfume,
  IconAccessory,
} from './Icons.jsx'

// icon açarı → komponent
const ICONS = {
  dress: IconDress,
  blouse: IconBlouse,
  skirt: IconSkirt,
  percent: IconPercent,
  sparkle: IconSparkle,
  perfume: IconPerfume,
}

// Kiçik künc nişanı (Endirimlər → %, Yenilər → YENİ)
const BADGE = { sale: '%', new: 'YENİ' }

function CircleIcon({ icon }) {
  const Icon = ICONS[icon] || IconAccessory
  return <Icon />
}

export default function Categories() {
  const { t } = useI18n()

  return (
    <section className="section cats-section" aria-labelledby="cats-title">
      <div className="container">
        {/* Başlıq — yalnız desktopda (mobildə market görünüşü, kompakt) */}
        <div className="section-head cats-head reveal">
          <span className="eyebrow">{t('cats_eyebrow')}</span>
          <h2 className="section-title" id="cats-title">{t('cats_title')}</h2>
        </div>

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
    </section>
  )
}
