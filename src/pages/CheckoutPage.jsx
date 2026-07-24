import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { WHATSAPP_NUMBER, CURRENCY } from '../config.js'
import ProductImage from '../components/ProductImage.jsx'
import { IconArrow } from '../components/Icons.jsx'

const BUYER_KEY = 'elva_buyer'

// --- WhatsApp nömrəsinin yoxlanması ---
const onlyDigits = (s) => String(s).replace(/\D/g, '')

// Azərbaycan: 994 + 9 rəqəm, və ya 0 ilə yerli format. Xaricilər üçün 9–15 rəqəm.
export const isValidWhatsApp = (raw) => {
  const d = onlyDigits(raw)
  if (d.startsWith('994')) return d.length === 12
  if (d.startsWith('0')) return d.length === 10
  return d.length >= 9 && d.length <= 15
}

// Mesajda beynəlxalq formatda göstərilsin: 0501234567 -> +994 50 123 45 67
export const normalizeWhatsApp = (raw) => {
  let d = onlyDigits(raw)
  if (d.startsWith('0')) d = '994' + d.slice(1)
  else if (d.length === 9) d = '994' + d
  return '+' + d
}

export default function CheckoutPage() {
  const { t } = useI18n()
  const { getProduct } = useCatalog()
  const { cart, clearCart } = useShop()
  const navigate = useNavigate()

  const [buyer, setBuyer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BUYER_KEY)) || {
        name: '', phone: '', address: '', note: '',
      }
    } catch {
      return { name: '', phone: '', address: '', note: '' }
    }
  })
  const [remember, setRemember] = useState(true)
  const [touched, setTouched] = useState({})
  const [sent, setSent] = useState(false)

  const lines = cart
    .map((item) => ({ item, product: getProduct(item.id) }))
    .filter((l) => l.product)

  const total = lines.reduce((s, l) => s + l.product.price * l.item.qty, 0)

  // Səbət boşdursa, burada qalmağın mənası yoxdur
  useEffect(() => {
    if (lines.length === 0 && !sent) navigate('/cart', { replace: true })
  }, [lines.length, sent, navigate])

  const set = (k, v) => setBuyer((b) => ({ ...b, [k]: v }))

  const errors = {
    name: buyer.name.trim() ? '' : t('required_field'),
    phone: !buyer.phone.trim()
      ? t('required_field')
      : isValidWhatsApp(buyer.phone) ? '' : t('whatsapp_invalid'),
    address: buyer.address.trim() ? '' : t('required_field'),
  }
  const valid = !errors.name && !errors.phone && !errors.address

  const buildMessage = () => {
    // Qiymət yazılmır — mesajda dəyişdirilə bilər.
    // Məhsul kodu isə dəqiq göstərir hansı modeldir.
    const rows = lines.map(({ item, product }, i) => {
      const meta = []
      if (item.size) meta.push(`${t('size')}: ${item.size}`)
      meta.push(`${t('quantity')}: ${item.qty}`)
      return `${i + 1}. ${t(product.name)} (${t('wa_code')}: ${product.code})\n   ${meta.join(' · ')}`
    })

    // Mesaj müştərinin adından yazılır
    const intro = t('wa_intro').replace('{name}', buyer.name.trim())

    const customer = [
      `${t('wa_customer')}:`,
      `${t('wa_phone')}: ${normalizeWhatsApp(buyer.phone)}`,
      `${t('field_address')}: ${buyer.address.trim()}`,
    ]
    if (buyer.note.trim()) {
      customer.push(`${t('field_note')}: ${buyer.note.trim()}`)
    }

    // Boş sətirlər bloklar arasında qalmalıdır — mesaj daha oxunaqlı olur
    return [
      intro,
      '',
      rows.join('\n'),
      '',
      customer.join('\n'),
      '',
      t('wa_thanks'),
    ].join('\n')
  }

  const submit = (e) => {
    e.preventDefault()
    setTouched({ name: true, phone: true, address: true })
    if (!valid) return

    if (remember) localStorage.setItem(BUYER_KEY, JSON.stringify(buyer))
    else localStorage.removeItem(BUYER_KEY)

    const text = encodeURIComponent(buildMessage())

    // Mobil: wa.me birbaşa tətbiqi açır — bir toxunuş qalır.
    // Kompüter: web.whatsapp.com aralıq "Open app?" pəncərəsini atlayır.
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    const url = isMobile
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
      : `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`

    window.open(url, '_blank', 'noopener')
    setSent(true)
  }

  if (lines.length === 0 && sent) {
    return (
      <div className="container empty-state" style={{ padding: '90px 0' }}>
        <h2 className="page-title">{t('order_sent')}</h2>
        <Link to="/catalog" className="btn btn-primary">{t('go_shopping')}</Link>
      </div>
    )
  }

  return (
    <div className="container checkout-page">
      <Link to="/cart" className="back-link">{t('back_to_cart')}</Link>
      <h1 className="page-title">{t('checkout_title')}</h1>

      {sent && (
        <div className="checkout-sent">
          <p>{t('order_sent')}</p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { clearCart(); navigate('/catalog') }}
          >
            {t('go_shopping')}
          </button>
        </div>
      )}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit} noValidate>
          <h3 className="checkout-h3">{t('your_details')}</h3>

          <label className="fld">
            <span>{t('field_name')} *</span>
            <input
              value={buyer.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, name: true }))}
              autoComplete="name"
              className={touched.name && errors.name ? 'invalid' : ''}
            />
            {touched.name && errors.name && <em className="fld-err">{errors.name}</em>}
          </label>

          <label className="fld">
            <span>{t('field_phone')} *</span>
            <input
              type="tel"
              inputMode="tel"
              value={buyer.phone}
              onChange={(e) => set('phone', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
              autoComplete="tel"
              placeholder={t('phone_hint')}
              className={touched.phone && errors.phone ? 'invalid' : ''}
            />
            {touched.phone && errors.phone
              ? <em className="fld-err">{errors.phone}</em>
              : <em className="fld-note">{t('whatsapp_note')}</em>}
          </label>

          <label className="fld">
            <span>{t('field_address')} *</span>
            <input
              value={buyer.address}
              onChange={(e) => set('address', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, address: true }))}
              autoComplete="street-address"
              className={touched.address && errors.address ? 'invalid' : ''}
            />
            {touched.address && errors.address && <em className="fld-err">{errors.address}</em>}
          </label>

          <label className="fld">
            <span>{t('field_note')}</span>
            <textarea
              rows={3}
              value={buyer.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder={t('note_placeholder')}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>{t('remember_me')}</span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg full wa-btn">
            <WhatsAppIcon /> {t('order_via_whatsapp')}
          </button>
          <p className="wa-explain">{t('whatsapp_explain')}</p>
        </form>

        <aside className="checkout-summary">
          <h3 className="checkout-h3">{t('order_summary')}</h3>
          <div className="checkout-lines">
            {lines.map(({ item, product }) => (
              <div className="checkout-line" key={`${item.id}-${item.size}`}>
                <div className="checkout-thumb">
                  <ProductImage product={{ ...product, name: t(product.name) }} />
                  <span className="qty-bubble">{item.qty}</span>
                </div>
                <div className="checkout-line-info">
                  <b>{t(product.name)}</b>
                  {item.size && <span>{t('size')}: {item.size}</span>}
                </div>
                <span className="checkout-line-sum">
                  {product.price * item.qty} {CURRENCY}
                </span>
              </div>
            ))}
          </div>
          <div className="summary-row total">
            <span>{t('total')}</span>
            <span>{total} {CURRENCY}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.16 8.16 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7.58.26 1.04.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  )
}
