import { useMemo } from 'react'
import { useCatalog } from '../context/CatalogContext.jsx'
import useReveal from '../hooks/useReveal.js'
import Intro from '../components/Intro.jsx'
import Categories from '../components/Categories.jsx'
import Promo from '../components/Promo.jsx'
import BrandStatement from '../components/BrandStatement.jsx'
import BenefitsSection from '../components/BenefitsSection.jsx'
import PromoBanner from '../components/PromoBanner.jsx'
import PromoCardGrid from '../components/PromoCardGrid.jsx'
import HorizontalProductSection from '../components/HorizontalProductSection.jsx'
import { compactPromos, promoPair, wideBanners } from '../data/promos.js'

export default function HomePage() {
  const { products } = useCatalog()

  const popular = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating).slice(0, 8),
    [products]
  )
  // Yeni gələnlər: ən böyük id = ən yeni əlavə edilmiş məhsul
  const newArrivals = useMemo(
    () => [...products].sort((a, b) => b.id - a.id).slice(0, 8),
    [products]
  )

  // Məhsullar bazadan gec gələ bilər — siyahı dəyişəndə reveal yenidən qurulur
  useReveal([popular.length, newArrivals.length])

  return (
    <>
      <Intro />

      {/* Kompakt reklam zolağı — hero-dan dərhal sonra (üstün ekran) */}
      {compactPromos[0] && (
        <div className="container promo-strip">
          <PromoBanner promo={compactPromos[0]} variant="compact" eager />
        </div>
      )}

      {/* Sürətli dairəvi kateqoriyalar */}
      <Categories />

      {/* Populyar məhsullar — mobildə üfüqi sürüşmə */}
      <HorizontalProductSection
        id="catalog-preview"
        eyebrow="collection"
        title="sort_popular"
        products={popular}
        viewAllTo="/catalog"
      />

      {/* İki kiçik reklam kartı */}
      <div className="container promo-strip">
        <PromoCardGrid promos={promoPair} />
      </div>

      {/* Yeni gələnlər — üfüqi sürüşmə */}
      <HorizontalProductSection
        eyebrow="new_in_eyebrow"
        title="new_arrivals"
        products={newArrivals}
        viewAllTo="/catalog"
      />

      {/* Geniş sezon banneri */}
      {wideBanners[0] && (
        <div className="container promo-strip">
          <PromoBanner promo={wideBanners[0]} variant="wide" />
        </div>
      )}

      <BrandStatement />
      <BenefitsSection />
      <Promo />
    </>
  )
}
