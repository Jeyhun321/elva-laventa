import { Link } from 'react-router-dom'
import { discountPercent } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { tagLabels } from '../i18n/translations.js'
import { IconHeart, IconBag } from './Icons.jsx'
import ProductImage from './ProductImage.jsx'
import Rating from './Rating.jsx'

export default function ProductCard({ product, showRating = true }) {
  const { t } = useI18n()
  const { addToCart, toggleFavorite, isFavorite } = useShop()
  const onSale = Boolean(product.oldPrice)
  const fav = isFavorite(product.id)

  const quickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product.id, product.sizes?.[0] ?? null, 1)
  }

  const favClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product.id)
  }

  return (
    <article className="product-card">
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
        <span className="product-brand">
          {product.brand}
          {product.code && <em className="card-code">{t('field_code')}: {product.code}</em>}
        </span>
        <Link to={`/product/${product.id}`} className="product-name">
          {t(product.name)}
        </Link>

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
      </div>
    </article>
  )
}
