import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'

// D: yan-yana iki (və ya daha çox) kiçik reklam kartı.
// Mobil və desktop-da eyni komponent — CSS grid ilə uyğunlaşır.
export default function PromoCardGrid({ promos = [] }) {
  if (!promos.length) return null
  return (
    <div className="promo-card-grid">
      {promos.map((promo) => (
        <PromoMiniCard key={promo.id} promo={promo} />
      ))}
    </div>
  )
}

function PromoMiniCard({ promo }) {
  const { t } = useI18n()
  const tone = promo.tone || 'plum'
  return (
    <Link to={promo.link || '/catalog'} className={`promo-mini tone-${tone}`}>
      {promo.badge && <span className="promo-mini-badge">{t(promo.badge)}</span>}
      <span className="promo-mini-title">{t(promo.title)}</span>
      {promo.subtitle && <span className="promo-mini-sub">{t(promo.subtitle)}</span>}
      <span className="promo-mini-cta" aria-hidden="true">
        <IconArrow />
      </span>
    </Link>
  )
}
