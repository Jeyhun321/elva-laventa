import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'

// Yenidən istifadə olunan reklam banneri.
//   variant="compact" — hero-dan sonra alçaq üfüqi zolaq
//   variant="wide"    — товарные секции arasında geniş banner
// eager — üstün ekrandakı banner üçün (varsa şəkli prioritetlə yükləyir).
// Şəkil verilmədikdə brend qradiyenti (tone) istifadə olunur — sıfır layout shift.
export default function PromoBanner({ promo, variant = 'wide', eager = false }) {
  const { t } = useI18n()
  if (!promo) return null

  const tone = promo.tone || 'plum'

  return (
    <Link
      to={promo.link || '/catalog'}
      className={`promo-banner promo-banner--${variant} tone-${tone}`}
    >
      {promo.image && (
        <img
          className="promo-banner-bg"
          src={promo.image}
          alt=""
          aria-hidden="true"
          loading={eager ? 'eager' : 'lazy'}
          fetchpriority={eager ? 'high' : undefined}
          decoding={eager ? 'sync' : 'async'}
        />
      )}
      <div className="promo-banner-body">
        {promo.badge && <span className="promo-banner-badge">{t(promo.badge)}</span>}
        <span className="promo-banner-title">{t(promo.title)}</span>
        {promo.subtitle && (
          <span className="promo-banner-sub">{t(promo.subtitle)}</span>
        )}
      </div>
      <span className="promo-banner-cta">
        {promo.cta ? t(promo.cta) : ''} <IconArrow />
      </span>
    </Link>
  )
}
