import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconArrow } from './Icons.jsx'
import ProductImage from './ProductImage.jsx'

const AUTOPLAY_MS = 3600
const HOVER_STEP_MS = 1500

export default function Intro() {
  const { t } = useI18n()
  const { saleProducts, products } = useCatalog()
  // Витрина не должна исчезать, если у товаров пока нет старой цены (скидки).
  // Сначала показываем товары со скидкой, затем заполняем обычными товарами.
  const SHOW = useMemo(() => {
    const saleIds = new Set(saleProducts.map((product) => product.id))
    return [...saleProducts, ...products.filter((product) => !saleIds.has(product.id))].slice(0, 7)
  }, [saleProducts, products])
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hoverSide, setHoverSide] = useState(null) // 'left' | 'right' | null

  const step = (dir) =>
    setActive((a) => (SHOW.length ? (a + dir + SHOW.length) % SHOW.length : 0))

  // Məhsullar bazadan gec gələ bilər — indeks siyahıdan kənara çıxmasın
  useEffect(() => {
    if (SHOW.length && active >= SHOW.length) setActive(0)
  }, [SHOW.length, active])

  // Avtomatik dəyişmə
  useEffect(() => {
    if (paused || SHOW.length < 2) return
    const tm = setInterval(() => step(1), AUTOPLAY_MS)
    return () => clearInterval(tm)
  }, [paused, SHOW.length])

  // Yan zona: geri sayım HƏR addımdan sonra sıfırdan başlayır.
  // Klik etsən — dərhal bir addım atılır və saniyə yenidən başlayır.
  // Taymer öz-özünə işləmir: kliklə addım arasında həmişə tam 1 saniyə olur.
  const timerRef = useRef(null)
  const lastStepRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const scheduleNext = (dir) => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      lastStepRef.current = Date.now()
      step(dir)
      scheduleNext(dir)
    }, HOVER_STEP_MS)
  }

  // Bir addım at və geri sayımı sıfırla.
  // keepRunning: yalnız kursor zonada qalırsa avtomatik zəncir davam edir.
  // Zonadan kənar klik (toxunma cihazları) → sadəcə bir addım, zəncir yoxdur.
  const stepAndRestart = (dir, keepRunning = true) => {
    const now = Date.now()
    // hover + klik eyni anda gələndə ikiqat sürüşməni əngəllə
    if (now - lastStepRef.current >= 150) {
      lastStepRef.current = now
      step(dir)
    }
    if (keepRunning) scheduleNext(dir)
    else clearTimer()
  }

  useEffect(() => {
    if (!hoverSide) {
      clearTimer()
      return
    }
    stepAndRestart(hoverSide === 'right' ? 1 : -1)
    return clearTimer
  }, [hoverSide])

  // unmount zamanı təmizlik
  useEffect(() => clearTimer, [])

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
      <div className="container intro-grid">
        <div className="intro-copy">
          <span className="intro-badge">{t('hero_badge')}</span>
          <h1 className="intro-title">{t('hero_title')}</h1>
          <p className="intro-desc">{t('hero_desc')}</p>
          <div className="intro-cta">
            <Link to="/catalog" className="btn btn-primary">
              {t('hero_cta_primary')} <IconArrow />
            </Link>
            <Link to="/catalog?sale=1" className="btn btn-ghost">
              {t('hero_cta_secondary')}
            </Link>
          </div>
        </div>

        <div
          className="showcase"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => {
            setPaused(false)
            setHoverSide(null)
          }}
        >
          <div className="showcase-stage">
            {SHOW.map((product, i) => (
              <ShowcaseCard
                key={product.id}
                product={product}
                slot={slotName(i)}
                onSelect={() => setActive(i)}
              />
            ))}

            {/* Sabit hover zonaları — kartlar hərəkət etsə də, bunlar yerində qalır */}
            <button
              type="button"
              className="hover-zone zone-left"
              aria-hidden="true"
              tabIndex={-1}
              onMouseEnter={() => setHoverSide('left')}
              onMouseLeave={() => setHoverSide(null)}
              onClick={() => stepAndRestart(-1, hoverSide === 'left')}
            />
            <button
              type="button"
              className="hover-zone zone-right"
              aria-hidden="true"
              tabIndex={-1}
              onMouseEnter={() => setHoverSide('right')}
              onMouseLeave={() => setHoverSide(null)}
              onClick={() => stepAndRestart(1, hoverSide === 'right')}
            />
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

function ShowcaseCard({ product, slot, onSelect }) {
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
  if (slot === 'main') {
    return (
      <Link to={`/product/${product.id}`} className={cls}>
        {inner}
      </Link>
    )
  }

  // Yan kartlar: klaviatura ilə seçilə bilər (siçan üçün hover zonaları var)
  if (slot === 'left' || slot === 'right') {
    return (
      <button
        type="button"
        className={cls}
        onFocus={onSelect}
        onClick={onSelect}
        aria-label={t(product.name)}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={cls} aria-hidden="true">
      {inner}
    </div>
  )
}
