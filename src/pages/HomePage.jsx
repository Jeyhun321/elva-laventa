import { Link } from 'react-router-dom'
import { products } from '../data/products.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import Intro from '../components/Intro.jsx'
import Marquee from '../components/Marquee.jsx'
import Promo from '../components/Promo.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { IconArrow } from '../components/Icons.jsx'

export default function HomePage() {
  const { t } = useI18n()
  const popular = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8)

  return (
    <>
      <Intro />
      <Marquee />

      <section className="section" id="catalog-preview">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">{t('collection')}</span>
            <h2 className="section-title">{t('sort_popular')}</h2>
          </div>

          <div className="product-grid">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} showRating={false} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link to="/catalog" className="btn btn-primary">
              {t('all_products')} <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <Promo />
    </>
  )
}
