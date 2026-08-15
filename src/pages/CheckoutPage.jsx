import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useShop } from '../context/ShopContext.jsx'
import { createOrder } from '../lib/orders.js'
import { validatePromo, previewDiscount, promoErrorKey } from '../lib/promo.js'
import { CURRENCY } from '../config.js'
import ProductImage from '../components/ProductImage.jsx'

const BUYER_KEY = 'elva_buyer'
// Wheel reward: код кладётся сюда после выигрыша, checkout его подхватывает.
const WHEEL_REWARD_KEY = 'elva_wheel_reward'
const ORDER_REDIRECT_SECONDS = 10
// Çatdırılma üsulları (TASK 6). Ekspress üçün əlavə haqq.
const EXPRESS_FEE = 5

const ORDER_ERROR_KEY_BY_CODE = {
  ORDER_FIELDS_REQUIRED: 'order_fields_required',
  CART_EMPTY: 'order_cart_empty',
  INVALID_ITEM: 'order_invalid_item',
  PRODUCT_UNAVAILABLE: 'order_product_unavailable',
  SIZE_INVALID: 'order_size_invalid',
  // Промокод мог стать невалидным между Apply и отправкой заказа (Realtime/лимит/гонка)
  PROMO_NOT_FOUND: 'promo_err_PROMO_NOT_FOUND',
  PROMO_INACTIVE: 'promo_err_PROMO_INACTIVE',
  PROMO_EXPIRED: 'promo_err_PROMO_EXPIRED',
  PROMO_NOT_STARTED: 'promo_err_PROMO_NOT_STARTED',
  PROMO_ACCOUNT_MISMATCH: 'promo_err_PROMO_ACCOUNT_MISMATCH',
  PROMO_ALREADY_USED: 'promo_err_PROMO_ALREADY_USED',
  PROMO_LIMIT_REACHED: 'promo_err_PROMO_LIMIT_REACHED',
  PROMO_MIN_ORDER: 'promo_err_PROMO_MIN_ORDER',
  // Общие auth-ошибки (проверяются последними, т.к. это подстрока)
  GOOGLE_AUTH_REQUIRED: 'order_auth_required',
  AUTH_REQUIRED: 'order_auth_required',
}

const getOrderErrorKey = (error) => {
  const message = String(error?.message || '')
  return Object.entries(ORDER_ERROR_KEY_BY_CODE).find(([code]) => message.includes(code))?.[1]
    || 'order_service_unavailable'
}

const onlyDigits = (s) => String(s).replace(/\D/g, '')

export const isValidWhatsApp = (raw) => {
  const d = onlyDigits(raw)
  if (d.startsWith('994')) return d.length === 12
  if (d.startsWith('0')) return d.length === 10
  return d.length >= 9 && d.length <= 15
}

export const normalizeWhatsApp = (raw) => {
  let d = onlyDigits(raw)
  if (d.startsWith('0')) d = '994' + d.slice(1)
  else if (d.length === 9) d = '994' + d
  return '+' + d
}

export default function CheckoutPage() {
  const { t } = useI18n()
  const { getProduct, loading: catalogLoading } = useCatalog()
  const { user, profile, isSignedIn, loading } = useAuth()
  const { cart, clearCart, markOrderCompleted } = useShop()
  const navigate = useNavigate()
  const formRef = useRef(null)

  const [buyer, setBuyer] = useState(() => {
    // Bütün sahələr həmişə mövcud olsun — köhnə yaddaşda phoneCall olmaya bilər
    const empty = { name: '', phone: '', phoneCall: '', address: '', note: '' }
    try {
      const saved = JSON.parse(localStorage.getItem(BUYER_KEY))
      return { ...empty, ...(saved && typeof saved === 'object' ? saved : {}) }
    } catch {
      return empty
    }
  })
  const [remember, setRemember] = useState(true)
  const [sameNumber, setSameNumber] = useState(true) // zəng nömrəsi = WhatsApp
  const [delivery, setDelivery] = useState('standard') // 'standard' | 'express' (default: standart)
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // {order_no}
  const [redirectSeconds, setRedirectSeconds] = useState(ORDER_REDIRECT_SECONDS)
  const [err, setErr] = useState('')

  // --- Promokod (единый discount-движок) ---
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null) // {code, discountType, discountValue}
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoErr, setPromoErr] = useState('') // i18n-ключ
  const promoAutoTried = useRef(false)

  const lines = cart
    .map((item) => ({ item, product: getProduct(item.id) }))
    .filter((l) => l.product)

  // Stok statusu kataloqdan (canlı). Stokda olmayan məhsul varsa — sifariş
  // göndərilmir (bazadakı place_order da onu PRODUCT_UNAVAILABLE ilə rədd edir).
  const hasUnavailable = lines.some((l) => l.product.inStock === false)

  const total = lines.reduce((s, l) => s + l.product.price * l.item.qty, 0)
  // Скидка — на merchandise subtotal (не на доставку). Показ = preview; сервер
  // при заказе пересчитывает авторитетно. Не ниже 0.
  const discount = appliedPromo ? Math.min(total, previewDiscount(appliedPromo, total)) : 0
  // Çatdırılma haqqı və yekun (avtomatik yenilənir)
  const deliveryFee = delivery === 'express' ? EXPRESS_FEE : 0
  const grandTotal = Math.max(0, total - discount) + deliveryFee

  const applyPromo = async (rawCode) => {
    const code = String(rawCode ?? promoInput).trim()
    if (!code || promoBusy) return
    setPromoBusy(true)
    setPromoErr('')
    try {
      const promo = await validatePromo(code, total)
      setAppliedPromo(promo)
      setPromoInput(promo.code)
      setPromoErr('')
    } catch (e) {
      setAppliedPromo(null)
      setPromoErr(promoErrorKey(e?.message))
    } finally {
      setPromoBusy(false)
    }
  }

  const removePromo = () => {
    setAppliedPromo(null)
    setPromoErr('')
    setPromoInput('')
    try { sessionStorage.removeItem(WHEEL_REWARD_KEY) } catch { /* ignore */ }
  }

  // Выигрыш колеса: код лежит в sessionStorage — подхватываем и авто-применяем один раз.
  useEffect(() => {
    if (promoAutoTried.current || loading || catalogLoading || lines.length === 0) return
    let code = ''
    try { code = sessionStorage.getItem(WHEEL_REWARD_KEY) || '' } catch { /* ignore */ }
    promoAutoTried.current = true
    if (code) applyPromo(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, catalogLoading, lines.length])

  useEffect(() => {
    // Səbət boşdursa, həm qonaq, həm girişli alıcı səbətə qaytarılır.
    // DİQQƏT: kataloq bazadan gec gəlir və o vaxta qədər getProduct boş qaytarır —
    // gözləməsək, dolu səbətlə gələn alıcı səhvən səbətə atılır.
    if (loading || catalogLoading) return
    if (lines.length === 0 && !done) navigate('/cart', { replace: true })
  }, [lines.length, done, navigate, loading, catalogLoading])

  // Yalnız UĞURLU sifarişdən sonra (done set olanda) təsdiq blokunu görünən sahəyə qaldırırıq.
  // Problem: mobil-də istifadəçi uzun formanın sonunda (footer/tabbar yanında) qalırdı və
  // yuxarıdakı təsdiq kartını görmürdü. Səhifənin başına qaldırırıq — sticky şapka təbii
  // olaraq kartın üstündə qalır, kart tam görünür, footer-ə düşmürük. Blok artıq başdadırsa
  // (scrollY === 0, adətən desktop) — heç nə etmirik, lazımsız sıçrayış olmasın (tələb 8).
  useEffect(() => {
    if (!done) return
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [done])

  // Təsdiq ekranı yalnız uğurlu sifarişdən sonra görünür. İstifadəçi özü CTA-ya
  // basarsa və ya səhifədən çıxarsa cleanup taymeri ləğv edir.
  useEffect(() => {
    if (!done) return
    setRedirectSeconds(ORDER_REDIRECT_SECONDS)
    const intervalId = window.setInterval(() => {
      setRedirectSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    const timeoutId = window.setTimeout(() => navigate('/', { replace: true }), ORDER_REDIRECT_SECONDS * 1000)
    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [done, navigate])

  // Hesaba girmişsə, adı avtomatik dolsun
  useEffect(() => {
    if (profile?.name) {
      setBuyer((b) => (b.name.trim() ? b : { ...b, name: profile.name }))
    }
  }, [profile?.name])

  const set = (k, v) => {
    setBuyer((b) => ({ ...b, [k]: v }))
    setErr('')
  }

  // Hər sahəni təhlükəsiz oxuyuruq (undefined ola bilməz)
  const g = (k) => (buyer[k] || '').trim()

  const errors = {
    name: g('name') ? '' : t('required_field'),
    phone: !g('phone')
      ? t('required_field')
      : isValidWhatsApp(g('phone')) ? '' : t('whatsapp_invalid'),
    // Zəng nömrəsi yalnız ayrıca olduqda yoxlanılır
    phoneCall: sameNumber
      ? ''
      : !g('phoneCall')
        ? t('required_field')
        : isValidWhatsApp(g('phoneCall')) ? '' : t('whatsapp_invalid'),
    address: g('address') ? '' : t('required_field'),
  }
  const valid = !errors.name && !errors.phone && !errors.phoneCall && !errors.address

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ name: true, phone: true, phoneCall: true, address: true })
    setErr('')
    // Stokda olmayan məhsul varsa — serverə heç getmirik, aydın mesaj veririk.
    if (hasUnavailable) {
      setErr(t('cart_unavailable_notice'))
      return
    }
    if (!valid) {
      setErr(t('checkout_form_incomplete'))
      window.requestAnimationFrame(() => formRef.current?.querySelector('input.invalid')?.focus())
      return
    }

    // Sifarişin TƏSDİQİ üçün giriş tələb olunur (place_order auth.uid() yazır).
    // Doldurulmuş məlumatları saxlayırıq ki, girişdən qayıdanda forma boş qalmasın.
    if (!isSignedIn) {
      try {
        localStorage.setItem(BUYER_KEY, JSON.stringify(buyer))
      } catch {
        // Yaddaş bağlıdırsa, sadəcə girişə keçirik.
      }
      navigate('/auth?next=%2Fcheckout')
      return
    }

    setBusy(true)
    try {
      // Seçilmiş çatdırılma üsulu sifariş qeydinə (note) yazılır — beləliklə həm
      // bazadakı sifarişdə saxlanılır, həm də Telegram bildirişində görünür
      // (place_order note-u "Qeyd:" kimi mesaja əlavə edir). DB sxemi dəyişmir.
      const deliveryNote = delivery === 'express'
        ? `Çatdırılma: Ekspress (+${EXPRESS_FEE} ₼)`
        : 'Çatdırılma: Standart'
      const composedNote = [g('note'), deliveryNote].filter(Boolean).join('\n')

      const order = await createOrder({
        buyer: {
          ...buyer,
          name: g('name'),
          address: g('address'),
          note: composedNote,
          phone: normalizeWhatsApp(g('phone')),
          // Eynidirsə — WhatsApp nömrəsini zəng nömrəsi kimi yazırıq
          phoneCall: sameNumber
            ? normalizeWhatsApp(g('phone'))
            : g('phoneCall') ? normalizeWhatsApp(g('phoneCall')) : '',
        },
        lines,
        email: user?.email ?? null,
        promoCode: appliedPromo?.code || null,
      })

      if (remember) localStorage.setItem(BUYER_KEY, JSON.stringify(buyer))
      else localStorage.removeItem(BUYER_KEY)

      // Успех: выигрыш колеса больше не нужен в сессии.
      try { sessionStorage.removeItem(WHEEL_REWARD_KEY) } catch { /* ignore */ }

      setDone(order)
      await clearCart()
      // Səbət UĞURLU sifarişdən sonra boşaldı — boş səbət səhifəsi bunu bilməlidir,
      // ki "Alış-verişə davam et" göstərsin (əl ilə silmədən fərqli). Yalnız uğurdan
      // sonra çağırılır: xəta olsa, bu sətrə çatmırıq (tələb 3, 6).
      markOrderCompleted()
    } catch (error) {
      setErr(t(getOrderErrorKey(error)))
    } finally {
      setBusy(false)
    }
  }

  // --- Sifariş qəbul edildi ---
  if (done) {
    return (
      <div className="container checkout-page">
        <div className="order-success">
          <div className="order-check">✓</div>
          <h1>{t('order_ok_title')}</h1>
          <p className="order-ok-text">{t('order_ok_text')}</p>
          <p className="order-ok-text">
            {t('order_redirect_notice').replace('{seconds}', redirectSeconds)}
          </p>
          {done.order_no && (
            <div className="order-no">
              {t('order_number')}: <b>{done.order_no}</b>
            </div>
          )}
          <Link to="/catalog" className="btn btn-primary">{t('continue_shopping')}</Link>
        </div>
      </div>
    )
  }

  // Qonaq forması sərbəst doldura bilər — giriş yalnız təsdiq düyməsindədir.

  return (
    <div className="container checkout-page">
      <Link to="/cart" className="back-link">{t('back_to_cart')}</Link>
      <h1 className="page-title">{t('checkout_title')}</h1>

      <div className="checkout-layout">
        <form ref={formRef} className="checkout-form" onSubmit={submit} noValidate>
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
              type="tel" inputMode="tel"
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

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={sameNumber}
              onChange={(e) => setSameNumber(e.target.checked)}
            />
            <span>{t('same_as_whatsapp')}</span>
          </label>

          {!sameNumber && (
            <label className="fld">
              <span>{t('field_phone_call')} *</span>
              <input
                type="tel" inputMode="tel"
                value={buyer.phoneCall}
                onChange={(e) => set('phoneCall', e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, phoneCall: true }))}
                placeholder={t('phone_hint')}
                className={touched.phoneCall && errors.phoneCall ? 'invalid' : ''}
              />
              {touched.phoneCall && errors.phoneCall && <em className="fld-err">{errors.phoneCall}</em>}
            </label>
          )}

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

          {/* TASK 6 — çatdırılma üsulu seçimi (radio kartlar, LaVenta üslubu) */}
          <div className="delivery-methods" role="radiogroup" aria-label={t('delivery_method')}>
            <span className="checkout-h3 delivery-methods-title">{t('delivery_method')}</span>

            <label className={`delivery-card${delivery === 'standard' ? ' active' : ''}`}>
              <input
                type="radio"
                name="delivery"
                value="standard"
                checked={delivery === 'standard'}
                onChange={() => setDelivery('standard')}
              />
              <span className="delivery-card-radio" aria-hidden="true" />
              <span className="delivery-card-main">
                <b>{t('delivery_standard')}</b>
                <small>{t('delivery_standard_time')}</small>
              </span>
              <span className="delivery-card-price">{t('delivery_free')}</span>
            </label>

            <label className={`delivery-card${delivery === 'express' ? ' active' : ''}`}>
              <input
                type="radio"
                name="delivery"
                value="express"
                checked={delivery === 'express'}
                onChange={() => setDelivery('express')}
              />
              <span className="delivery-card-radio" aria-hidden="true" />
              <span className="delivery-card-main">
                <b>{t('delivery_express')}</b>
                <small>{t('delivery_express_time')}</small>
              </span>
              <span className="delivery-card-price">+{EXPRESS_FEE} ₼</span>
            </label>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={remember}
              onChange={(e) => setRemember(e.target.checked)} />
            <span>{t('remember_me')}</span>
          </label>

          {/* Promokod — единый discount-движок. Скидку считает сервер; здесь preview. */}
          <div className="promo-box">
            <span className="checkout-h3 promo-box-title">{t('promo_title')}</span>
            {appliedPromo ? (
              <div className="promo-applied">
                <span className="promo-applied-code">✓ {appliedPromo.code}</span>
                <span className="promo-applied-amount">−{discount} {CURRENCY}</span>
                <button type="button" className="promo-remove-btn" onClick={removePromo}>
                  {t('promo_remove')}
                </button>
              </div>
            ) : (
              <div className="promo-row">
                <input
                  className="promo-input"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value); setPromoErr('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo() } }}
                  placeholder={t('promo_placeholder')}
                  autoCapitalize="characters"
                  autoComplete="off"
                  aria-label={t('promo_title')}
                />
                <button
                  type="button"
                  className="btn btn-ghost promo-apply-btn"
                  onClick={() => applyPromo()}
                  disabled={promoBusy || !promoInput.trim()}
                >
                  {promoBusy ? '…' : t('promo_apply')}
                </button>
              </div>
            )}
            {promoErr && <em className="fld-err">{t(promoErr)}</em>}
            {appliedPromo && <em className="fld-note">{t('promo_only_one')}</em>}
          </div>

          {err && <div className="admin-msg err" role="alert">{err}</div>}

          {/* Yekun məbləğ düymənin ÜSTÜNDƏ — alıcı nə ödədiyini görmədən təsdiqləməsin.
              Ekspress seçiləndə əlavə haqq daxildir (avtomatik yenilənir). */}
          <div className="checkout-total-inline">
            <span>{t('total')}</span>
            <b>{grandTotal} ₼</b>
          </div>

          {hasUnavailable && (
            <p className="cart-unavailable-notice" role="alert">{t('cart_unavailable_notice')}</p>
          )}
          <button type="submit" className="btn btn-primary btn-lg full" disabled={busy || hasUnavailable}>
            {busy ? t('order_sending') : t('place_order')}
          </button>
          {!loading && !isSignedIn && (
            <p className="wa-explain">{t('checkout_auth_required')}</p>
          )}
          <p className="wa-explain">{t('order_explain')}</p>
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
                  <span>
                    {product.code && `${t('field_code')}: ${product.code}`}
                    {item.size && ` · ${t('size')}: ${item.size}`}
                  </span>
                </div>
                <span className="checkout-line-sum">
                  {product.price * item.qty} {CURRENCY}
                </span>
              </div>
            ))}
          </div>
          <div className="summary-row">
            <span>{t('products_subtotal')}</span>
            <span>{total} {CURRENCY}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row summary-discount">
              <span>{t('promo_discount')}{appliedPromo ? ` (${appliedPromo.code})` : ''}</span>
              <span>−{discount} {CURRENCY}</span>
            </div>
          )}
          <div className="summary-row">
            <span>{delivery === 'express' ? t('delivery_express') : t('delivery_standard')}</span>
            <span>{deliveryFee ? `${deliveryFee} ${CURRENCY}` : t('delivery_free')}</span>
          </div>
          <div className="summary-row total">
            <span>{t('total')}</span>
            <span>{grandTotal} {CURRENCY}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
