import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'
import ProductImage from './ProductImage.jsx'
import useTilt from '../hooks/useTilt.js'

// Hero fonunda üzən ləçəklər — sırf bəzək, oxunuşa mane olmasın deyə
// yalnız sağ tərəfdə, şəffaf və pointer-events: none.
const PETALS = [0, 1, 2, 3, 4, 5]

const AUTOPLAY_MS = 2500

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
  const [paused, setPaused] = useState(false)

  const step = (dir) =>
    setActive((a) => (SHOW.length ? (a + dir + SHOW.length) % SHOW.length : 0))

  // Məhsullar bazadan gec gələ bilər — indeks siyahıdan kənara çıxmasın
  useEffect(() => {
    if (SHOW.length && active >= SHOW.length) setActive(0)
  }, [SHOW.length, active])

  // Avtomatik dəyişmə
  useEffect(() => {
    if (paused || SHOW.length < 2) return
    const tm = setInterval(() => step(-1), AUTOPLAY_MS)
    return () => clearInterval(tm)
  }, [paused, SHOW.length])

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

          {/* Sosial sübut: üst-üstə düşən avatarlar. Uydurma foto yoxdur — sadə qradient dairələr. */}
          <div className="intro-proof">
            <span className="proof-avatars" aria-hidden="true">
              <i className="proof-av av-1" />
              <i className="proof-av av-2" />
              <i className="proof-av av-3" />
              <i className="proof-av av-4" />
            </span>
            <span className="proof-text">{t('hero_proof')}</span>
          </div>

          <div className="intro-stats">
            <div className="intro-stat">
              <b>{products.length || 0}+</b>
              <span>{t('stat_products')}</span>
            </div>
            <div className="intro-stat">
              <b>500+</b>
              <span>{t('stat_customers')}</span>
            </div>
            <div className="intro-stat">
              <b>4.9</b>
              <span>{t('stat_rating')}</span>
            </div>
          </div>
        </div>

        <div className="showcase">
          <div className="showcase-tilt" ref={tiltRef}>
            <div
              className="showcase-stage"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {SHOW.map((product, i) => (
                <ShowcaseCard
                  key={product.id}
                  product={product}
                  slot={slotName(i)}
                />
              ))}
            </div>

            {/* Üzən dairəvi endirim nişanı */}
            <span className="hero-badge-round" aria-hidden="true">
              <em>{t('hero_off_label')}</em>
              <b>40%</b>
            </span>

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
        <ProductImage product={{ ...product, name: t(product.name) }} />
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
