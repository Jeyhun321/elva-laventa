import { useState } from 'react'
import { Link } from 'react-router-dom'
import { discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { tagLabels } from '../i18n/translations.js'
import { IconHeart, IconBag } from './Icons.jsx'
import ProductImage from './ProductImage.jsx'
import Rating from './Rating.jsx'
import useTilt from '../hooks/useTilt.js'

export default function ProductCard({ product, showRating = true }) {
  const { t } = useI18n()
  const { addToCart, toggleFavorite, isFavorite } = useShop()
  const [notice, setNotice] = useState('')
  const onSale = Boolean(product.oldPrice)
  const fav = isFavorite(product.id)
  const tiltRef = useTilt({ max: 3, lift: -6 })

  // Qonaq da səbətə əlavə edə bilər — giriş yalnız sifarişin təsdiqindədir.
  const quickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.sizes?.length > 1) {
      setNotice(t('choose_size_on_product'))
      return
    }
    addToCart(product.id, product.sizes?.[0] ?? null, 1)
    setNotice('')
  }

  const favClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product.id)
    setNotice('')
  }

  return (
    <article className="product-card" ref={tiltRef}>
      <Link to={`/product/${product.id}`} className="product-media">
        <ProductImage product={{ ...product, name: t(product.name) }} />
        {product.tag && (
          <span className="product-tag">{t(tagLabels[product.tag])}</span>
        )}
        {onSale && (
          <span className="product-discount">-{discountPercent(product)}%</span>
        )}
        <button
          className={`product-fav${fav ? ' active' : ''}`}
          aria-label={t('favorites')}
          aria-pressed={fav}
          onClick={favClick}
        >
          <IconHeart />
        </button>
      </Link>

      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <Link to={`/product/${product.id}`} className="product-name">
          {t(product.name)}
        </Link>
        {product.code && (
          <span className="card-code">{t('field_code')}: {product.code}</span>
        )}

        {showRating && (
          <Rating value={product.rating} reviews={product.reviews} reviewsLabel={t('reviews')} />
        )}

        <div className="product-bottom">
          <div className={`price-block${onSale ? ' on-sale' : ''}`}>
            {onSale && <span className="old">{product.oldPrice} ₼</span>}
            <span className="new">{product.price} ₼</span>
          </div>
          <button className="add-btn" aria-label={t('add_to_cart')} onClick={quickAdd}>
            <IconBag />
          </button>
        </div>
        {notice && <p className="action-notice" role="alert">{notice}</p>}
      </div>
    </article>
  )
}
