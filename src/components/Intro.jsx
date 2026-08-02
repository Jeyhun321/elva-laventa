import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'
import ProductImage from './ProductImage.jsx'
import useTilt from '../hooks/useTilt.js'
import flowerLogo from '../assets/elva-laventa-logo.svg'

// Hero fonunda üzən ləçəklər — sırf bəzək, oxunuşa mane olmasın deyə
// yalnız sağ tərəfdə, şəffaf və pointer-events: none.
const PETALS = [0, 1, 2, 3, 4, 5]

// Заголовок с выделенным italic-словом (hero_title_em) — премиум-акцент.
function HeroTitle({ text, em }) {
  if (!em || !text.includes(em)) return <>{text}</>
  const [before, ...rest] = text.split(em)
  return (
    <>
      {before}
      <em>{em}</em>
      {rest.join(em)}
    </>
  )
}

export default function Intro() {
  const { t } = useI18n()
  const { saleProducts, products } = useCatalog()
  const tiltRef = useTilt({ max: 4 })
  // Витрина не должна исчезать, если у товаров пока нет старой цены (скидки).
  // Сначала показываем товары со скидкой, затем заполняем обычными товарами.
  const SHOW = useMemo(() => {
    const saleIds = new Set(saleProducts.map((product) => product.id))
    return [...saleProducts, ...products.filter((product) => !saleIds.has(product.id))].slice(0, 7)
  }, [saleProducts, products])
  const [active, setActive] = useState(0)

  const step = (dir) =>
    setActive((a) => (SHOW.length ? (a + dir + SHOW.length) % SHOW.length : 0))

  // Məhsullar bazadan gec gələ bilər — indeks siyahıdan kənara çıxmasın
  useEffect(() => {
    if (SHOW.length && active >= SHOW.length) setActive(0)
  }, [SHOW.length, active])

  const slotName = (i) => {
    const n = SHOW.length
    const d = (i - active + n) % n
    if (d === 0) return 'main'
    if (d === 1) return 'right'
    if (d === n - 1) return 'left'
    return 'hide'
  }

  return (
    <section className="intro" id="top">
      <div className="intro-petals" aria-hidden="true">
        {PETALS.map((i) => (
          <span key={i} className={`petal petal-${i + 1}`} />
        ))}
      </div>

      <div className="container intro-grid">
        <div className="intro-copy">
          <span className="intro-badge">{t('hero_badge')}</span>
          <h1 className="intro-title">
            <HeroTitle text={t('hero_title')} em={t('hero_title_em')} />
          </h1>
          <p className="intro-desc">{t('hero_desc')}</p>
          <div className="intro-cta">
            <Link to="/catalog" className="btn btn-primary">
              {t('hero_cta_primary')} <IconArrow />
            </Link>
            <Link to="/catalog?sale=1" className="btn-link">
              {t('hero_cta_secondary')} <IconArrow />
            </Link>
          </div>

        </div>

        <div className="showcase">
          {/* Mobildə bölmənin üstündə iri brend nişanı (CSS ilə yalnız ≤900px).
              alt boşdur + aria-hidden: başlıqdakı brend keçidi onsuz da
              "Elva LaVenta" deyir, ekran oxuyucu iki dəfə təkrar etməsin. */}
          <div className="hero-brand" aria-hidden="true">
            <img className="hero-brand-logo" src={flowerLogo} alt="" />
          </div>

          <div className="showcase-tilt" ref={tiltRef}>
            <div className="showcase-stage">
              {SHOW.map((product, i) => (
                <ShowcaseCard
                  key={product.id}
                  product={product}
                  slot={slotName(i)}
                />
              ))}
            </div>

            {/* Aşağıda kiçik "yeni kolleksiya" kartı */}
            <Link to="/catalog" className="hero-mini-card">
              <span className="hero-mini-title">{t('hero_card_title')}</span>
              <span className="hero-mini-cta">
                {t('hero_card_cta')} <IconArrow />
              </span>
            </Link>
          </div>

          <div className="showcase-dots" role="tablist" aria-label="Showcase">
            {SHOW.map((p, i) => (
              <button
                key={p.id}
                className={`sc-dot${i === active ? ' active' : ''}`}
                aria-label={`${i + 1}`}
                aria-selected={i === active}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ShowcaseCard({ product, slot }) {
  const { t } = useI18n()
  const cls = `sc-card slot-${slot}`
  const hasDiscount = Number(product.oldPrice) > Number(product.price)

  const inner = (
    <>
      {hasDiscount && <span className="discount-badge">-{discountPercent(product)}%</span>}
      <div className="sc-photo">
        {/* Mərkəzdəki şəkil ekranın ilk böyük şəklidir (LCP) — gecikmədən yüklənir */}
        <ProductImage product={{ ...product, name: t(product.name) }} eager={slot === 'main'} />
      </div>
      <div className="showcase-price">
        <span className="name">{t(product.name)}</span>
        <span className="prices">
          {hasDiscount && <span className="old">{product.oldPrice} ₼</span>}
          <span className="new">{product.price} ₼</span>
        </span>
      </div>
    </>
  )

  // Mərkəzdəki karta klik → məhsul səhifəsi
  if (slot === 'main' || slot === 'left' || slot === 'right') {
    return (
      <Link to={`/product/${product.id}`} className={cls}>
        {inner}
      </Link>
    )
  }

  // Yan kartlar: klaviatura ilə seçilə bilər (siçan üçün hover zonaları var)
  return (
    <div className={cls} aria-hidden="true">
      {inner}
    </div>
  )
}
