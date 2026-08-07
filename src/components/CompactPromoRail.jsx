import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow, IconTruck, IconTag, IconSparkle } from './Icons.jsx'

// promo.icon açarı → komponent
const PROMO_ICONS = { truck: IconTruck, tag: IconTag, sparkle: IconSparkle }

// Kompakt promo lenti — alçaq, yan sürüşən kiçik reklam kartları.
// Az yer tutur, товарları aşağı itələmir. Şəkilsiz (brend qradiyenti) →
// sıfır əlavə sorğu, sıfır layout shift.
export default function CompactPromoRail({ promos = [] }) {
  if (!promos.length) return null
  return (
    <div className="container promo-strip">
      <ul className="promo-rail">
        {promos.map((promo) => (
          <li key={promo.id} className="promo-rail-item">
            <CompactPromoCard promo={promo} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CompactPromoCard({ promo }) {
  const { t } = useI18n()
  const tone = promo.tone || 'plum'
  const Icon = PROMO_ICONS[promo.icon]
  return (
    <Link to={promo.link || '/catalog'} className={`promo-card tone-${tone}`}>
      {/* Yüngül dekorativ fon elementi (çox zəif) — brend hissi, layout shift yoxdur */}
      <span className="promo-card-deco" aria-hidden="true" />
      {Icon && (
        <span className="promo-card-icon" aria-hidden="true">
          <Icon />
        </span>
      )}
      <span className="promo-card-text">
        {promo.badge && <span className="promo-card-badge">{t(promo.badge)}</span>}
        <span className="promo-card-title">{t(promo.title)}</span>
        {promo.subtitle && <span className="promo-card-sub">{t(promo.subtitle)}</span>}
      </span>
      <span className="promo-card-cta" aria-hidden="true">
        <IconArrow />
      </span>
    </Link>
  )
}
