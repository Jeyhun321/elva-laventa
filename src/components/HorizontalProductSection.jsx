import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import ProductCard from './ProductCard.jsx'
import { IconArrow } from './Icons.jsx'

// C: üfüqi товарная секция.
// Mobil: yan sürüşən (horizontal scroll) lent.
// Desktop: səliqəli şəbəkə (CSS ilə, aşağıya bax).
// eyebrow/title — mövcud i18n açarları; viewAllTo — "hamısı" keçidi.
export default function HorizontalProductSection({
  eyebrow,
  title,
  products = [],
  viewAllTo = '/catalog',
  id,
}) {
  const { t } = useI18n()
  if (!products.length) return null

  return (
    <section className="section hsection" id={id}>
      <div className="container">
        <div className="section-head-row reveal">
          <div>
            {eyebrow && <span className="eyebrow">{t(eyebrow)}</span>}
            <h2 className="section-title">{t(title)}</h2>
          </div>
          <Link to={viewAllTo} className="btn-link section-link">
            {t('all_products')} <IconArrow />
          </Link>
        </div>

        <ul className="hscroll">
          {products.map((product) => (
            <li key={product.id} className="hscroll-item">
              <ProductCard product={product} showRating={false} />
            </li>
          ))}
        </ul>

        <div className="section-foot hsection-foot">
          <Link to={viewAllTo} className="btn-link">
            {t('all_products')} <IconArrow />
          </Link>
        </div>
      </div>
    </section>
  )
}
