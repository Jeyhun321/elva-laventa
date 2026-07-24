import { Link } from 'react-router-dom'
import { products } from '../data/products.js'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function FavoritesPage() {
  const { t } = useI18n()
  const { favorites } = useShop()

  const items = products.filter((p) => favorites.includes(p.id))

  return (
    <div className="container favorites-page">
      <h1 className="page-title">{t('fav_title')}</h1>

      {items.length > 0 ? (
        <div className="product-grid">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <h3>{t('fav_empty')}</h3>
          <p>{t('fav_empty_desc')}</p>
          <Link to="/catalog" className="btn btn-primary">{t('go_shopping')}</Link>
        </div>
      )}
    </div>
  )
}
