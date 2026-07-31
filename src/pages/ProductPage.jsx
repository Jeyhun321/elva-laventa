import { useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { tagLabels } from '../i18n/translations.js'
import { IconHeart, IconBag, IconStar, IconArrow } from '../components/Icons.jsx'
import ProductImage from '../components/ProductImage.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Rating from '../components/Rating.jsx'
import { REAL_PRODUCT_GALLERIES } from '../data/realProducts.js'

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { getProduct, products } = useCatalog()
  const { addToCart, toggleFavorite, isFavorite } = useShop()

  const product = getProduct(id)
  const needsSize = product && product.sizes && product.sizes.length > 1
  const [size, setSize] = useState(needsSize ? null : product?.sizes?.[0] ?? null)
  const [warn, setWarn] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const touch = useRef(null)

  if (!product) {
    return (
      <div className="container empty-state" style={{ padding: '80px 0' }}>
        <h3>{t('nothing_found')}</h3>
        <Link to="/catalog" className="btn btn-primary">{t('back_to_catalog')}</Link>
      </div>
    )
  }

  const onSale = Boolean(product.oldPrice)
  const savedImages = product.images?.length ? product.images : (product.image ? [product.image] : [])
  // Kod üzrə hazır qalereya (realProducts.js) YALNIZ variantı olmayan
  // məhsullar üçündür: eyni kodlu rənglərdə o, bütün rənglərə EYNİ şəkilləri
  // verərdi (narıncı don bej şəkilləri göstərirdi).
  const hasVariants = (product.variants?.length || 0) > 1
  const codeGallery = hasVariants ? [] : (REAL_PRODUCT_GALLERIES[product.code] || [])
  const gallery = savedImages.length > 1
    ? savedImages
    : (codeGallery.length ? codeGallery : savedImages)
  const mainImage = selectedImage || gallery[0] || product.image
  const switchGalleryImage = (direction) => {
    const currentIndex = Math.max(0, gallery.indexOf(mainImage))
    const nextIndex = (currentIndex + direction + gallery.length) % gallery.length
    setSelectedImage(gallery[nextIndex])
  }
  const fav = isFavorite(product.id)
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 9)

  // --- Şəkillər üzərində sürüşdürmə (swipe) ---
  // Yalnız ÜFÜQİ jest şəkli dəyişir; şaquli hərəkət səhifənin sürüşməsinə mane olmur.
  const SWIPE_MIN = 40

  const onTouchStart = (e) => {
    const p = e.touches[0]
    touch.current = { x: p.clientX, y: p.clientY, horizontal: null }
  }

  const onTouchMove = (e) => {
    if (!touch.current) return
    const p = e.touches[0]
    const dx = p.clientX - touch.current.x
    const dy = p.clientY - touch.current.y
    // İstiqamət bir dəfə təyin olunur ki, jest ortada "sıçramasın"
    if (touch.current.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touch.current.horizontal = Math.abs(dx) > Math.abs(dy)
    }
  }

  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    if (!start || !start.horizontal || gallery.length < 2) return
    const dx = e.changedTouches[0].clientX - start.x
    if (Math.abs(dx) < SWIPE_MIN) return
    switchGalleryImage(dx < 0 ? 1 : -1)
  }

  // Səbətə əlavə: giriş yoxlaması ShopContext-in içindədir (tək nöqtə).
  // Girişsiz alıcıda addToCart false qaytarır və "daxil olun" pəncərəsi açılır.
  const handleAdd = () => {
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    // Girişsizdirsə, false qayıdır — "səbətdədir ✓" yazmaq olmaz
    if (!addToCart(product.id, size, 1)) return
    setAdded(true)
    setTimeout(() => setAdded(false), 3000)
  }

  const handleBuy = () => {
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    // Əlavə olunmayıbsa, səbətə keçmirik
    if (!addToCart(product.id, size, 1)) return
    navigate('/cart')
  }

  const handleFavorite = () => {
    toggleFavorite(product.id)
  }

  return (
    <div className="container product-page">
      <Link to="/catalog" className="back-link">{t('back_to_catalog')}</Link>

      <div className="product-detail">
        <div className="product-gallery">
          <div
            className="gallery-main"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <ProductImage product={{ ...product, image: mainImage, name: t(product.name) }} eager />
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-prev"
                  onClick={() => switchGalleryImage(-1)}
                  aria-label="Əvvəlki şəkil"
                >
                  <IconArrow />
                </button>
                <button
                  type="button"
                  className="gallery-nav gallery-nav-next"
                  onClick={() => switchGalleryImage(1)}
                  aria-label="Növbəti şəkil"
                >
                  <IconArrow />
                </button>
              </>
            )}
            {product.tag && (
              <span className="product-tag">{t(tagLabels[product.tag])}</span>
            )}
            {onSale && (
              <span className="product-discount">-{discountPercent(product)}%</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="gallery-thumbs" aria-label="Məhsul şəkilləri">
              {gallery.map((image, index) => (
                <button key={image} className={`gallery-thumb${mainImage === image ? ' active' : ''}`} onClick={() => setSelectedImage(image)} aria-label={`Şəkil ${index + 1}`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <span className="product-brand">
            {product.brand}
            {product.code && <em className="product-code">{t('field_code')}: {product.code}</em>}
          </span>
          <h1 className="product-detail-name">{t(product.name)}</h1>

          <Rating value={product.rating} reviews={product.reviews} reviewsLabel={t('reviews')} />

          <div className={`detail-price${onSale ? ' on-sale' : ''}`}>
            <span className="new">{product.price} ₼</span>
            {onSale && <span className="old">{product.oldPrice} ₼</span>}
            {onSale && <span className="save">-{discountPercent(product)}%</span>}
          </div>

          {/* Rəng variantları: hər biri ayrıca məhsuldur (öz şəkilləri,
              öz qiyməti, öz ölçüləri). Seçəndə həmin məhsula keçirik. */}
          {product.variants?.length > 1 ? (
            <div className="detail-field">
              <span className="field-label">
                {t('color')}
                <em className="chosen-color">{product.colorName}</em>
              </span>
              <div className="color-variants">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`color-variant${v.id === product.id ? ' active' : ''}${v.inStock ? '' : ' out'}`}
                    onClick={() => navigate(`/product/${v.id}`)}
                    aria-pressed={v.id === product.id}
                    title={v.inStock ? v.colorName : `${v.colorName} — ${t('out_of_stock')}`}
                  >
                    <span className="color-variant-dot" style={{ background: v.colorHex || '#ccc' }} />
                    <span className="color-variant-name">{v.colorName}</span>
                  </button>
                ))}
              </div>
              {!product.inStock && (
                <span className="size-warn">{t('out_of_stock')}</span>
              )}
            </div>
          ) : product.colors?.length ? (
            <div className="detail-field">
              <span className="field-label">{t('color')}</span>
              {/* Variant yoxdursa — sadəcə məhsulun çalarları, seçilmir */}
              <div className="color-swatches">
                {product.colors.map((c, i) => (
                  <span key={i} className="swatch-wrap">
                    <span className="swatch" style={{ background: c }} title={c} />
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-field">
            <span className="field-label">
              {t('size')}{needsSize && <em className="req"> *</em>}
            </span>
            <div className="size-options">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  className={`size-btn${size === s ? ' active' : ''}`}
                  onClick={() => { setSize(s); setWarn(false) }}
                >
                  {s}
                </button>
              ))}
            </div>
            {warn && <span className="size-warn">{t('choose_size_first')}</span>}
          </div>

          <div className="detail-actions">
            <button className="btn btn-primary btn-lg" onClick={handleAdd}>
              <IconBag /> {added ? t('in_cart') + ' ✓' : t('add_to_cart')}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={handleBuy}>
              {t('buy_now')}
            </button>
            <button
              className={`icon-square${fav ? ' active' : ''}`}
              aria-label={t('favorites')}
              aria-pressed={fav}
              onClick={handleFavorite}
            >
              <IconHeart />
            </button>
          </div>

          <div className="delivery-note">
            <b>{t('delivery')}:</b> {t('delivery_info')}
          </div>

          <div className="detail-field">
            <span className="field-label">{t('description')}</span>
            <p className="detail-desc">{t('product_desc_generic')}</p>
          </div>
        </div>

        {related.length > 0 && (
          <aside className="product-aside" aria-label={t('related')}>
            <span className="product-aside-title">{t('related')}</span>
            <div className="product-aside-grid">
              {related.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="related-mini">
                  <span className="related-mini-image">
                    <ProductImage product={{ ...p, name: t(p.name) }} />
                  </span>
                  <span className="related-mini-price">{p.price} ₼</span>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>


      {related.length > 0 && (
        <section className="related">
          <h2 className="section-title" style={{ fontSize: '1.8rem' }}>{t('related')}</h2>
          {/* Mobildə bu şəbəkə üfüqi lentə çevrilir (CSS) — səhifə uzanmasın */}
          <div className="product-grid related-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
