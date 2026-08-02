import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import useReveal from '../hooks/useReveal.js'
import Intro from '../components/Intro.jsx'
import Categories from '../components/Categories.jsx'
import Promo from '../components/Promo.jsx'
import BrandStatement from '../components/BrandStatement.jsx'
import BenefitsSection from '../components/BenefitsSection.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { IconArrow } from '../components/Icons.jsx'

export default function HomePage() {
  const { t } = useI18n()
  const { products } = useCatalog()
  const popular = [...products].sort((a, b) => b.rating - a.rating).slice(0, 8)

  // Məhsullar bazadan gec gələ bilər — siyahı dəyişəndə reveal yenidən qurulur
  useReveal([popular.length])

  return (
    <>
      <Intro />
      <Categories />

      <section className="section" id="catalog-preview">
        <div className="container">
          <div className="section-head-row reveal">
            <div>
              <span className="eyebrow">{t('collection')}</span>
              <h2 className="section-title">{t('sort_popular')}</h2>
            </div>
            <Link to="/catalog" className="btn-link section-link">
              {t('all_products')} <IconArrow />
            </Link>
          </div>

          <div className="product-grid">
            {popular.map((p, i) => (
              <div key={p.id} className="reveal" data-reveal-step={i}>
                <ProductCard product={p} showRating={false} />
              </div>
            ))}
          </div>

          <div className="section-foot">
            <Link to="/catalog" className="btn btn-primary">
              {t('all_products')} <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      <BrandStatement />
      <BenefitsSection />
      <Promo />
    </>
  )
}
