import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { IconSliders, IconClose } from '../components/Icons.jsx'

export default function CatalogPage() {
  const { t } = useI18n()
  const { products, categories, priceBounds, loading } = useCatalog()
  const bounds = useMemo(() => priceBounds(), [products])
  const [params, setParams] = useSearchParams()

  const cat = params.get('cat') || 'all'
  const q = params.get('q') || ''
  const saleParam = params.get('sale')

  const [sort, setSort] = useState('price_asc') // default: ucuzdan bahaya
  const [minPrice, setMinPrice] = useState(bounds.min)
  const [maxPrice, setMaxPrice] = useState(bounds.max)
  // Yazı üçün ayrıca mətn state-i — istifadəçi sərbəst yaza bilsin
  const [minText, setMinText] = useState(String(bounds.min))
  const [maxText, setMaxText] = useState(String(bounds.max))
  const [onlySale, setOnlySale] = useState(saleParam === '1')
  // Mobil filtr pərdəsi (bottom sheet)
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef(null)
  const filterBtnRef = useRef(null)

  const applyMin = (n) => { setMinPrice(n); setMinText(String(n)) }
  const applyMax = (n) => { setMaxPrice(n); setMaxText(String(n)) }

  // URL dəyişəndə (və məhsullar bazadan gələndə) filtrləri uyğunlaşdır
  useEffect(() => {
    setMinPrice(bounds.min); setMinText(String(bounds.min))
    setMaxPrice(bounds.max); setMaxText(String(bounds.max))
    setOnlySale(saleParam === '1')
  }, [cat, q, saleParam, bounds.min, bounds.max])

  // Yazarkən: mətni sərbəst qəbul et, amma filtri YALNIZ interval düzgün
  // olduqda tətbiq et (min ≤ maks). Yanlış interval qəbul edilmir.
  const onMinText = (raw) => {
    setMinText(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n >= bounds.min && n <= maxPrice) {
      setMinPrice(n)
    }
  }
  const onMaxText = (raw) => {
    setMaxText(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n <= bounds.max && n >= minPrice) {
      setMaxPrice(n)
    }
  }

  // Yanlış interval göstəriciləri
  const minInvalid =
    minText !== '' && Number.isFinite(Number(minText)) && Number(minText) > maxPrice
  const maxInvalid =
    maxText !== '' && Number.isFinite(Number(maxText)) && Number(maxText) < minPrice

  // Fokusdan çıxanda / Enter: dəyəri normallaşdır
  const commitMin = () => {
    const n = Number(minText)
    const v = minText === '' || !Number.isFinite(n)
      ? bounds.min
      : Math.max(bounds.min, Math.min(n, maxPrice))
    applyMin(v)
  }
  const commitMax = () => {
    const n = Number(maxText)
    const v = maxText === '' || !Number.isFinite(n)
      ? bounds.max
      : Math.min(bounds.max, Math.max(n, minPrice))
    applyMax(v)
  }

  const pct = (v) =>
    Math.min(100, Math.max(0, ((v - bounds.min) / (bounds.max - bounds.min)) * 100))
  const clampToBounds = (v) => Math.min(bounds.max, Math.max(bounds.min, v))

  const setCat = (id) => {
    const next = new URLSearchParams(params)
    if (id === 'all') next.delete('cat')
    else next.set('cat', id)
    next.delete('q')
    setParams(next)
  }

  const visible = useMemo(() => {
    let list = products
    if (cat !== 'all') list = list.filter((p) => p.category === cat)
    if (q) {
      const needle = q.toLowerCase().trim()
      list = list.filter((p) =>
        String(p.code || '').toLowerCase().trim() === needle ||
        Object.values(p.name).some((n) => n.toLowerCase().includes(needle)) ||
        p.brand.toLowerCase().includes(needle)
      )
    }
    if (onlySale) list = list.filter((p) => p.oldPrice)
    list = list.filter((p) => p.price >= minPrice && p.price <= maxPrice)

    const sorted = [...list]
    switch (sort) {
      case 'price_asc': sorted.sort((a, b) => a.price - b.price); break
      case 'price_desc': sorted.sort((a, b) => b.price - a.price); break
      case 'rating': sorted.sort((a, b) => b.rating - a.rating); break
      case 'discount': sorted.sort((a, b) => discountPercent(b) - discountPercent(a)); break
      default: break
    }
    return sorted
  }, [cat, q, sort, minPrice, maxPrice, onlySale])

  // Pərdə açıqkən: Esc bağlayır, fokus içəri keçir, arxa fon sürüşmür,
  // bağlananda fokus düyməyə qayıdır.
  useEffect(() => {
    if (!sheetOpen) return undefined

    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false) }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      filterBtnRef.current?.focus()
    }
  }, [sheetOpen])

  const title = q
    ? `${t('search_results')}: “${q}”`
    : t(categories.find((c) => c.id === cat)?.label || categories[0].label)

  return (
    <div className="container catalog-page">
      <div className="catalog-head">
        <h1 className="page-title">{title}</h1>
      </div>

      {/* Mobil panel: kateqoriya çipləri + filtr düyməsi. Masaüstündə gizlidir. */}
      <div className="catalog-mobile-bar">
        <div className="cat-chips" role="tablist" aria-label={t('catalog')}>
          {categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={cat === c.id && !q}
              className={`cat-chip${cat === c.id && !q ? ' active' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {t(c.label)}
            </button>
          ))}
        </div>
        {/* Yalnız ikon: uzun söz çiplərin sürüşməsinə mane olurdu.
            Mətn ekran oxuyucular üçün aria-label-də qalır. */}
        <button
          ref={filterBtnRef}
          className="filters-open-btn"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-label={t('filters')}
          title={t('filters')}
        >
          <IconSliders />
          <span className="filters-open-text">{t('filters')}</span>
        </button>
      </div>

      {sheetOpen && (
        <div className="filter-backdrop" onClick={() => setSheetOpen(false)} />
      )}

      <div className="catalog-layout">
        <aside
          className={`sidebar${sheetOpen ? ' sheet-open' : ''}`}
          ref={sheetRef}
          tabIndex={-1}
          role={sheetOpen ? 'dialog' : undefined}
          aria-modal={sheetOpen ? 'true' : undefined}
          aria-label={t('filters_and_sort')}
        >
          <div className="sheet-head">
            <h2>{t('filters_and_sort')}</h2>
            <button className="sheet-close" onClick={() => setSheetOpen(false)} aria-label={t('close')}>
              <IconClose />
            </button>
          </div>

          {/* Sıralama pərdənin içində — mobil paneli yükləməmək üçün */}
          <div className="sidebar-block sheet-only">
            <h3>{t('sort_by')}</h3>
            <label className="sort-select full">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">{t('sort_popular')}</option>
                <option value="price_asc">{t('sort_price_asc')}</option>
                <option value="price_desc">{t('sort_price_desc')}</option>
                <option value="rating">{t('sort_rating')}</option>
                <option value="discount">{t('sort_discount')}</option>
              </select>
            </label>
          </div>

          <div className="sidebar-block">
            <h3>{t('catalog')}</h3>
            <ul className="cat-list">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    className={`cat-link${cat === c.id && !q ? ' active' : ''}`}
                    onClick={() => setCat(c.id)}
                  >
                    {t(c.label)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-block">
            <h3>{t('filters')}</h3>

            <div className="filter-group">
              <span className="filter-title">{t('price_range')}, ₼</span>

              <div className="price-inputs">
                <input
                  type="number"
                  inputMode="numeric"
                  className={`price-input${minInvalid ? ' invalid' : ''}`}
                  aria-label={t('price_min')}
                  aria-invalid={minInvalid}
                  placeholder={t('price_min')}
                  min={bounds.min}
                  max={maxPrice}
                  value={minText}
                  onChange={(e) => onMinText(e.target.value)}
                  onBlur={commitMin}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMin() } }}
                />
                <span className="price-dash">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`price-input${maxInvalid ? ' invalid' : ''}`}
                  aria-label={t('price_max')}
                  aria-invalid={maxInvalid}
                  placeholder={t('price_max')}
                  min={minPrice}
                  max={bounds.max}
                  value={maxText}
                  onChange={(e) => onMaxText(e.target.value)}
                  onBlur={commitMax}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitMax() } }}
                />
              </div>

              {(minInvalid || maxInvalid) && (
                <p className="price-hint" role="alert">{t('price_invalid')}</p>
              )}

              <div className="range-slider">
                <div className="range-track">
                  <div
                    className="range-fill"
                    style={{ left: `${pct(minPrice)}%`, right: `${100 - pct(maxPrice)}%` }}
                  />
                </div>
                <input
                  type="range"
                  className="range-min"
                  min={bounds.min}
                  max={bounds.max}
                  value={clampToBounds(minPrice)}
                  aria-label={t('price_min')}
                  onChange={(e) => applyMin(Math.min(Number(e.target.value), maxPrice))}
                />
                <input
                  type="range"
                  className="range-max"
                  min={bounds.min}
                  max={bounds.max}
                  value={clampToBounds(maxPrice)}
                  aria-label={t('price_max')}
                  onChange={(e) => applyMax(Math.max(Number(e.target.value), minPrice))}
                />
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={onlySale}
                onChange={(e) => setOnlySale(e.target.checked)}
              />
              <span>{t('only_sale')}</span>
            </label>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                applyMin(bounds.min)
                applyMax(bounds.max)
                setOnlySale(false)
                setSort('price_asc')
              }}
            >
              {t('reset')}
            </button>
          </div>

          {/* Yalnız mobil pərdədə görünür — filtrlər onsuz da dərhal işləyir,
              bu düymə sadəcə pərdəni bağlayır və nəticəni göstərir. */}
          <div className="sheet-foot">
            <button className="btn btn-primary full" onClick={() => setSheetOpen(false)}>
              {t('apply')} · {visible.length} {t('items')}
            </button>
          </div>
        </aside>

        <div className="catalog-main">
          <div className="catalog-toolbar">
            <label className="sort-select">
              <span>{t('sort_by')}:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">{t('sort_popular')}</option>
                <option value="price_asc">{t('sort_price_asc')}</option>
                <option value="price_desc">{t('sort_price_desc')}</option>
                <option value="rating">{t('sort_rating')}</option>
                <option value="discount">{t('sort_discount')}</option>
              </select>
            </label>
          </div>

          {visible.length > 0 ? (
            <div className="product-grid">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{t('nothing_found')}</h3>
              <p>{t('nothing_found_desc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
