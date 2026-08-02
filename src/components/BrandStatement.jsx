import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'

export default function BrandStatement() {
  const { t } = useI18n()

  return (
    <section className="brand-statement reveal" aria-labelledby="brand-statement-title">
      <div className="container brand-statement-inner">
        <p className="brand-statement-mark" aria-hidden="true">ELVA</p>
        <div>
          <h2 id="brand-statement-title">{t('brand_statement_title')}</h2>
          <p>{t('brand_statement_text')}</p>
          <Link to="/catalog" className="btn-link">
            {t('brand_statement_cta')} <IconArrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
