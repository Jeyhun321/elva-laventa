import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCatalog, discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
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
  const { isGoogleUser } = useAuth()

  const product = getProduct(id)
  const needsSize = product && product.sizes && product.sizes.length > 1
  const [size, setSize] = useState(needsSize ? null : product?.sizes?.[0] ?? null)
  const [warn, setWarn] = useState(false)
  const [authWarn, setAuthWarn] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

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
  const gallery = savedImages.length > 1
    ? savedImages
    : (REAL_PRODUCT_GALLERIES[product.code] || savedImages)
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

  const handleAdd = () => {
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    if (!isGoogleUser || !addToCart(product.id, size, 1)) {
      setAuthWarn(true)
      return
    }
    setAuthWarn(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleBuy = () => {
    if (needsSize && !size) {
      setWarn(true)
      return
    }
    if (!isGoogleUser || !addToCart(product.id, size, 1)) {
      setAuthWarn(true)
      return
    }
    setAuthWarn(false)
    navigate('/cart')
  }

  return (
    <div className="container product-page">
      <Link to="/catalog" className="back-link">{t('back_to_catalog')}</Link>

      <div className="product-detail">
        <div className="product-gallery">
          <div className="gallery-main">
            <ProductImage product={{ ...product, image: mainImage, name: t(product.name) }} />
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

          {product.colors && (
            <div className="detail-field">
              <span className="field-label">{t('color')}</span>
              <div className="color-swatches">
                {product.colors.map((c, i) => (
                  <span key={i} className="swatch" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          )}

          <div className="detail-field">
            <span className="field-label">
              {t('size')}{needsSize && <em className="req"> *</em>}
            </span>
            <div className="size-options">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  className={`size-btn${size === s ? ' active' : ''}`}
                  onClick={() => { setSize(s); setWarn(false); setAuthWarn(false) }}
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
              onClick={() => toggleFavorite(product.id)}
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
          {authWarn && (
            <p className="action-notice" role="alert">
              {t('google_auth_required')} <Link to={`/auth?next=${encodeURIComponent(`/product/${product.id}`)}`}>{t('google_auth_action')}</Link>
            </p>
          )}
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
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
