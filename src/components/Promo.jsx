import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'

export default function Promo() {
  const { t } = useI18n()
  return (
    <section className="section" id="about" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="promo">
          <div>
            <h3>{t('promo_title')}</h3>
            <p>{t('promo_desc')}</p>
          </div>
          <Link to="/catalog?sale=1" className="btn btn-primary">
            {t('promo_cta')} <IconArrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
