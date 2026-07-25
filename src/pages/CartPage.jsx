import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { IconPlus, IconMinus, IconTrash } from '../components/Icons.jsx'
import ProductImage from '../components/ProductImage.jsx'

export default function CartPage() {
  const { t } = useI18n()
  const { getProduct } = useCatalog()
  const { cart, setQty, removeFromCart } = useShop()
  const { isGoogleUser } = useAuth()

  const lines = cart
    .map((item) => ({ item, product: getProduct(item.id) }))
    .filter((l) => l.product)

  const subtotal = lines.reduce((s, l) => s + (l.product.oldPrice || l.product.price) * l.item.qty, 0)
  const total = lines.reduce((s, l) => s + l.product.price * l.item.qty, 0)
  const discount = subtotal - total

  if (lines.length === 0) {
    return (
      <div className="container empty-state" style={{ padding: '90px 0' }}>
        <h2 className="page-title">{t('cart_empty')}</h2>
        <p>{t('cart_empty_desc')}</p>
        <Link to="/catalog" className="btn btn-primary">{t('go_shopping')}</Link>
      </div>
    )
  }

  return (
    <div className="container cart-page">
      <h1 className="page-title">{t('cart_title')}</h1>

      <div className="cart-layout">
        <div className="cart-lines">
          {lines.map(({ item, product }) => (
            <div className="cart-line" key={`${item.id}-${item.size}`}>
              <Link to={`/product/${product.id}`} className="cart-thumb">
                <ProductImage product={{ ...product, name: t(product.name) }} />
              </Link>

              <div className="cart-line-info">
                <span className="product-brand">{product.brand}</span>
                <Link to={`/product/${product.id}`} className="cart-line-name">
                  {t(product.name)}
                </Link>
                {item.size && (
                  <span className="cart-size">{t('size')}: {item.size}</span>
                )}
                <div className="cart-line-price">
                  <span className="new">{product.price} ₼</span>
                  {product.oldPrice && <span className="old">{product.oldPrice} ₼</span>}
                </div>
              </div>

              <div className="cart-line-controls">
                <div className="qty-stepper">
                  <button
                    aria-label="-"
                    onClick={() => setQty(item.id, item.size, item.qty - 1)}
                  >
                    <IconMinus />
                  </button>
                  <span>{item.qty}</span>
                  <button
                    aria-label="+"
                    onClick={() => setQty(item.id, item.size, item.qty + 1)}
                  >
                    <IconPlus />
                  </button>
                </div>
                <span className="cart-line-sum">{product.price * item.qty} ₼</span>
                <button
                  className="cart-remove"
                  aria-label={t('remove')}
                  onClick={() => removeFromCart(item.id, item.size)}
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="cart-summary">
          <div className="summary-row">
            <span>{t('subtotal')}</span>
            <span>{subtotal} ₼</span>
          </div>
          {discount > 0 && (
            <div className="summary-row discount">
              <span>{t('discount_total')}</span>
              <span>-{discount} ₼</span>
            </div>
          )}
          <div className="summary-row total">
            <span>{t('total')}</span>
            <span>{total} ₼</span>
          </div>
          {isGoogleUser ? (
            <Link to="/checkout" className="btn btn-primary btn-lg full">
              {t('checkout')}
            </Link>
          ) : (
            <>
              <Link to="/auth?next=%2Fcheckout" className="btn btn-primary btn-lg full">
                {t('google_auth_action')}
              </Link>
              <p className="action-notice" role="alert">{t('google_auth_required')}</p>
            </>
          )}
          <Link to="/catalog" className="continue-link">{t('back_to_catalog')}</Link>
        </aside>
      </div>
    </div>
  )
}
