import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import ProductCard from './ProductCard.jsx'
import { IconArrow } from './Icons.jsx'

const SKELETONS = [0, 1, 2, 3]

// Üfüqi товарная секция.
// Mobil: yan sürüşən (horizontal scroll) lent (~2.3 kart görünür).
// Desktop: səliqəli şəbəkə (CSS ilə).
// loading=true və məhsul yoxdursa — kompakt skeleton kartlar (boş başlıq deyil).
// loading=false və məhsul yoxdursa — bölmə tamamilə gizlənir (null).
export default function HorizontalProductSection({
  eyebrow,
  title,
  products = [],
  viewAllTo = '/catalog',
  viewAllLabel = 'view_all',
  loading = false,
  id,
}) {
  const { t } = useI18n()

  if (!products.length && !loading) return null
  const showSkeleton = !products.length && loading

  return (
    <section className="section hsection" id={id}>
      <div className="container">
        <div className="section-head-row hsection-head">
          <h2 className="section-title hsection-title">
            {eyebrow && <span className="eyebrow hsection-eyebrow">{t(eyebrow)}</span>}
            {t(title)}
          </h2>
          <Link to={viewAllTo} className="btn-link section-link">
            {t(viewAllLabel)} <IconArrow />
          </Link>
        </div>

        <ul className="hscroll" aria-busy={showSkeleton || undefined}>
          {showSkeleton
            ? SKELETONS.map((i) => (
                <li key={`sk-${i}`} className="hscroll-item" aria-hidden="true">
                  <div className="product-skeleton">
                    <div className="product-skeleton-media" />
                    <div className="product-skeleton-line" />
                    <div className="product-skeleton-line short" />
                  </div>
                </li>
              ))
            : products.map((product) => (
                <li key={product.id} className="hscroll-item">
                  <ProductCard product={product} showRating={false} />
                </li>
              ))}
        </ul>
      </div>
    </section>
  )
}
