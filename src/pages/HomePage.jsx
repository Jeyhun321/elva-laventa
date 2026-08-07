import { useMemo } from 'react'
import { useCatalog } from '../context/CatalogContext.jsx'
import useReveal from '../hooks/useReveal.js'
import useMediaQuery from '../hooks/useMediaQuery.js'
import Intro from '../components/Intro.jsx'
import Categories from '../components/Categories.jsx'
import Promo from '../components/Promo.jsx'
import BrandStatement from '../components/BrandStatement.jsx'
import BenefitsSection from '../components/BenefitsSection.jsx'
import CompactPromoRail from '../components/CompactPromoRail.jsx'
import PromoBanner from '../components/PromoBanner.jsx'
import HorizontalProductSection from '../components/HorizontalProductSection.jsx'
import { railPromos, wideBanners } from '../data/promos.js'

export default function HomePage() {
  const { products, saleProducts, loading } = useCatalog()

  // Hero yalnız desktopda göstərilir — mobildə market-tipli kompakt görünüş.
  // display:none deyil, şərti render: mobildə hero şəkilləri ümumiyyətlə yüklənmir.
  const isDesktop = useMediaQuery('(min-width: 901px)')

  const popular = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating).slice(0, 10),
    [products]
  )
  const newArrivals = useMemo(
    () => [...products].sort((a, b) => b.id - a.id).slice(0, 10),
    [products]
  )
  const discounts = useMemo(() => saleProducts.slice(0, 10), [saleProducts])

  useReveal([popular.length, newArrivals.length, discounts.length])

  return (
    <>
      {/* Desktop: kompakt boutique hero. Mobil: hero yoxdur (market görünüşü) */}
      {isDesktop && <Intro />}

      {/* Sürətli dairəvi kateqoriyalar (menyu düyməsi + lent) */}
      <Categories />

      {/* Populyar məhsullar — товары çox erkən görünür */}
      <HorizontalProductSection
        id="catalog-preview"
        title="popular_products"
        products={popular}
        loading={loading}
        viewAllTo="/catalog?sort=rating"
      />

      {/* Kompakt promo lenti */}
      <CompactPromoRail promos={railPromos} />

      {/* Yeni gələnlər */}
      <HorizontalProductSection
        title="new_arrivals"
        products={newArrivals}
        loading={loading}
        viewAllTo="/catalog?sort=new"
      />

      {/* Endirimlər — məhsul yoxdursa tamamilə gizlənir */}
      <HorizontalProductSection
        title="discounts_title"
        products={discounts}
        viewAllTo="/catalog?sale=1"
        viewAllLabel="view_all"
      />

      {/* Geniş, alçaq sezon banneri */}
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
