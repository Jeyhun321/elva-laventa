import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconHome } from './Icons.jsx'
import flowerLogo from '../assets/elva-laventa-logo.svg'

// Полноэкранная страница 404 в фирменном стиле Elva LaVenta.
// Через position:fixed;inset:0 перекрывает storefront-layout (header/footer/tabbar),
// поэтому выглядит как отдельный error-screen. Переиспользуемый компонент.
export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <main className="nf-page" role="main">
      <Link to="/" className="nf-brand" aria-label="Elva LaVenta">
        <img className="nf-brand-logo" src={flowerLogo} alt="Elva LaVenta" />
      </Link>

      {/* Мягкие декоративные лепестки справа-снизу — лёгкий inline-SVG, без тяжёлых изображений */}
      <svg className="nf-decor" viewBox="0 0 480 520" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
        <g fill="var(--rose)">
          <path opacity="0.10" transform="translate(430 520) rotate(-14)" d="M0,0 C 72,-125 72,-335 0,-478 C -72,-335 -72,-125 0,0 Z" />
          <path opacity="0.13" transform="translate(430 520) rotate(-42)" d="M0,0 C 64,-112 64,-300 0,-430 C -64,-300 -64,-112 0,0 Z" />
          <path opacity="0.10" transform="translate(430 520) rotate(-70)" d="M0,0 C 56,-100 56,-270 0,-382 C -56,-270 -56,-100 0,0 Z" />
          <path opacity="0.07" transform="translate(430 520) rotate(-98)" d="M0,0 C 48,-88 48,-238 0,-338 C -48,-238 -48,-88 0,0 Z" />
        </g>
      </svg>

      <div className="nf-content">
        <h1 className="nf-code">404</h1>
        <p className="nf-heading">{t('nf_heading')}</p>
        <p className="nf-text">{t('nf_text')}</p>
        <Link to="/" className="btn btn-primary nf-home">
          <IconHome aria-hidden="true" />
          {t('nf_home')}
        </Link>
      </div>
    </main>
  )
}
