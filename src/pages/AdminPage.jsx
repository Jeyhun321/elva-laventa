import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminSupabase, isConfigured } from '../lib/supabase.js'
import { loadAll, saveProduct, deleteProduct, uploadImage, signIn, signOutAdmin } from '../admin/db.js'
import { listOrders, setOrderStatus } from '../lib/orders.js'
import { useCatalog } from '../context/CatalogContext.jsx'
import { extractColors } from '../admin/colors.js'
import { IconTrash, IconPlus, IconClose, IconArrow } from '../components/Icons.jsx'
import SystemLogsPanel from '../components/SystemLogsPanel.jsx'

const ORDER_STATUSES = [
  { value: 'new', label: 'Новый' },
  { value: 'contacted', label: 'Связались' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'shipped', label: 'Отправлен' },
  { value: 'done', label: 'Выполнен' },
  { value: 'cancelled', label: 'Отменён' },
]

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size']
const TAGS = [
  { value: '', label: 'Без метки' },
  { value: 'new', label: 'Новинка' },
  { value: 'bestseller', label: 'Хит' },
  { value: 'sale', label: 'Скидка' },
]

const ADMIN_OTP_TTL = 15 * 60 * 1000
const ADMIN_OTP_EMAIL = 'alekberov.ceyhun2002@gmail.com'
const adminOtpStorageKey = (userId) => `elva-admin-otp-verified:${userId}`
const isOwnerEmail = (email = '') => email.trim().toLowerCase() === ADMIN_OTP_EMAIL

function hasAdminOtpVerification(userId) {
  try { return Number(sessionStorage.getItem(adminOtpStorageKey(userId))) > Date.now() } catch { return false }
}

function saveAdminOtpVerification(userId) {
  try { sessionStorage.setItem(adminOtpStorageKey(userId), String(Date.now() + ADMIN_OTP_TTL)) } catch { /* storage unavailable */ }
}

function clearAdminOtpVerification(userId) {
  try { sessionStorage.removeItem(adminOtpStorageKey(userId)) } catch { /* storage unavailable */ }
}

const emptyProduct = (catId) => ({
  id: null,
  code: '',
  brand: 'Elva LaVenta',
  name: { az: '', ru: '', en: '' },
  description: { az: '', ru: '', en: '' },
  category: catId || 'donlar',
  price: '',
  oldPrice: '',
  image: '',
  images: [],
  colors: ['#e5399a'],
  sizes: ['S', 'M', 'L'],
  rating: 5,
  reviews: 0,
  tag: '',
  isActive: true,
})

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  useEffect(() => {
    if (!isConfigured || !adminSupabase) { setChecking(false); return }
    adminSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    const { data: sub } = adminSupabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user || !adminSupabase) {
      setIsAdmin(false)
      setOtpVerified(false)
      setChecking(false)
      return
    }
    if (!isOwnerEmail(session.user.email || '')) {
      setIsAdmin(false)
      setOtpVerified(false)
      setChecking(false)
      return
    }

    let active = true
    setChecking(true)
    adminSupabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        const allowed = !error && data?.role === 'admin'
        setIsAdmin(allowed)
        setOtpVerified(allowed && hasAdminOtpVerification(session.user.id))
        setChecking(false)
      })
    return () => { active = false }
  }, [session])

  const leaveAdmin = async () => {
    if (session?.user?.id) clearAdminOtpVerification(session.user.id)
    setOtpVerified(false)
    await signOutAdmin()
  }

  if (!isConfigured) {
    return (
      <div className="container admin">
        <h1 className="page-title">Панель управления</h1>
        <div className="admin-msg err">База данных не подключена.</div>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="container admin">
        <p className="admin-sub">Проверяю вход…</p>
      </div>
    )
  }

  if (!session) return <LoginScreen />
  if (!isOwnerEmail(session.user.email || '')) return <NotFoundScreen onExit={leaveAdmin} />
  if (!isAdmin) return <AdminSetupRequired onExit={leaveAdmin} />
  if (!otpVerified) return <EmailOtpScreen session={session} onVerified={() => setOtpVerified(true)} onExit={leaveAdmin} />

  return <Dashboard session={session} onExit={leaveAdmin} />
}

/* ---------------- Вход ---------------- */
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!isOwnerEmail(email)) {
      setErr('404 — страница не найдена.')
      return
    }
    setBusy(true); setErr(''); setMsg('')
    try {
      await signIn(email.trim(), password)
    } catch (e2) {
      setErr(
        /invalid/i.test(e2.message)
          ? 'Неверная почта или пароль'
          : e2.message
      )
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    setErr(''); setMsg('')
    if (!email.trim()) { setErr('Сначала впиши почту выше'); return }
    if (!isOwnerEmail(email)) { setErr('404 — страница не найдена.'); return }
    setBusy(true)
    try {
      const redirectTo = window.location.origin + import.meta.env.BASE_URL + 'reset'
      const { error } = await adminSupabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setMsg('Ссылка для сброса отправлена на почту. Проверь «Спам».')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  const loginWithGoogle = async () => {
    setBusy(true); setErr(''); setMsg('')
    try {
      const redirectTo = window.location.origin + import.meta.env.BASE_URL + 'admin'
      const { error } = await adminSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account', login_hint: ADMIN_OTP_EMAIL } },
      })
      if (error) throw error
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }

  return (
    <div className="container admin">
      <div className="login-box">
        <h1 className="page-title" style={{ fontSize: '1.9rem' }}>Вход в панель</h1>
        <p className="admin-sub" style={{ marginBottom: 18 }}>
          Панель управления товарами Elva LaVenta
        </p>

        <button type="button" className="btn btn-ghost full admin-google-btn" onClick={loginWithGoogle} disabled={busy}>
          Продолжить с Google
        </button>
        <div className="login-divider"><span>или с паролем</span></div>

        <form onSubmit={submit} className="login-form">
          <label className="fld">
            <span>Почта</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="fld">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="button" className="link-btn forgot-link" onClick={forgot}>
            Забыли пароль?
          </button>

          {err && <div className="admin-msg err">{err}</div>}
          {msg && <div className="admin-msg ok">{msg}</div>}

          <button className="btn btn-primary full" disabled={busy}>
            {busy ? 'Проверяю…' : 'Войти'}
          </button>
        </form>

        <Link to="/" className="continue-link">← На сайт</Link>
      </div>
    </div>
  )
}

/* ---------------- Панель ---------------- */
function NotFoundScreen({ onExit }) {
  return (
    <div className="container admin">
      <div className="login-box admin-gate-box">
        <h1 className="page-title" style={{ fontSize: '2.5rem' }}>404</h1>
        <p className="admin-sub">Страница не найдена.</p>
        <button className="btn btn-primary full" onClick={onExit}>Выйти из другого аккаунта</button>
        <Link to="/" className="continue-link">← На сайт</Link>
      </div>
    </div>
  )
}

function AdminSetupRequired({ onExit }) {
  return (
    <div className="container admin">
      <div className="login-box admin-gate-box">
        <h1 className="page-title" style={{ fontSize: '1.9rem' }}>Доступ ещё не настроен</h1>
        <p className="admin-sub">Для этого аккаунта нужно один раз выдать роль администратора в Supabase.</p>
        <button className="btn btn-primary full" onClick={onExit}>Выйти</button>
        <Link to="/" className="continue-link">← На сайт</Link>
      </div>
    </div>
  )
}

function EmailOtpScreen({ session, onVerified, onExit }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const email = ADMIN_OTP_EMAIL

  const sendCode = useCallback(async () => {
    setBusy(true); setErr('')
    try {
      const { error } = await adminSupabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL + 'admin' },
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }, [email])

  useEffect(() => { sendCode() }, [sendCode])

  const verify = async (e) => {
    e.preventDefault()
    const token = code.replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(token)) {
      setErr('Введите код из письма.')
      return
    }
    setBusy(true); setErr('')
    try {
      const { error } = await adminSupabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
      saveAdminOtpVerification(session.user.id)
      onVerified()
    } catch {
      setErr('Код не подошёл или уже истёк. Запросите новый код.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container admin">
      <div className="login-box admin-gate-box">
        <h1 className="page-title" style={{ fontSize: '1.9rem' }}>Подтвердите вход</h1>
        <p className="admin-sub">Мы отправили одноразовый код на <strong>{email}</strong>. Код действует 15 минут.</p>
        <form onSubmit={verify} className="login-form">
          <label className="fld">
            <span>Код из письма</span>
            <input className="otp-code" inputMode="numeric" autoComplete="one-time-code" maxLength="8" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus />
          </label>
          {err && <div className="admin-msg err">{err}</div>}
          {sent && <div className="admin-msg ok">Письмо отправлено. Проверьте также папку «Спам».</div>}
          <button className="btn btn-primary full" disabled={busy}>{busy ? 'Проверяю…' : 'Подтвердить код'}</button>
          <button type="button" className="link-btn forgot-link" onClick={sendCode} disabled={busy}>Отправить код ещё раз</button>
        </form>
        <button type="button" className="continue-link link-btn" onClick={onExit}>Выйти из учётной записи</button>
      </div>
    </div>
  )
}

function Dashboard({ session, onExit }) {
  const { reload: reloadSite } = useCatalog()
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  const say = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const refresh = async () => {
    setBusy('load')
    try {
      const data = await loadAll()
      setProducts(data.products)
      setCategories(data.categories)
    } catch (e) {
      say('err', `Не удалось загрузить: ${e.message}`)
    } finally {
      setBusy('')
    }
  }

  useEffect(() => { refresh() }, [])

  const onSave = async (p) => {
    setBusy('save')
    try {
      await saveProduct(p)
      setForm(null)
      await refresh()
      reloadSite()
      say('ok', 'Сохранено. Товар уже на сайте.')
    } catch (e) {
      say('err', `Ошибка сохранения: ${e.message}`)
    } finally {
      setBusy('')
    }
  }

  const onDelete = async (p) => {
    if (!confirm(`Удалить «${p.name.az || p.id}»?`)) return
    try {
      await deleteProduct(p.id)
      await refresh()
      reloadSite()
      say('ok', 'Товар удалён.')
    } catch (e) {
      say('err', `Ошибка удаления: ${e.message}`)
    }
  }

  const catLabel = (id) => categories.find((c) => c.id === id)?.label?.ru || id

  return (
    <div className="container admin">
      <div className="admin-head">
        <div>
          <h1 className="page-title">Панель управления</h1>
          <p className="admin-sub">
            {products.length} товаров · вошли как {session.user.email}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/" className="btn btn-ghost btn-sm">На сайт</Link>
          <button className="btn btn-ghost btn-sm" onClick={onExit}>Выйти</button>
          {tab === 'products' && (
            <button className="btn btn-primary" onClick={() => setForm(emptyProduct(categories[0]?.id))}>
              <IconPlus /> Добавить товар
            </button>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'products' ? ' active' : ''}`} onClick={() => setTab('products')}>
          Товары
        </button>
  <button className={`admin-tab${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>
    Заказы
  </button>
  <button className={`admin-tab${tab === 'logs' ? ' active' : ''}`} onClick={() => setTab('logs')}>
    Системные логи
  </button>
      </div>

      {msg && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}

{tab === 'orders' ? (
  <OrdersPanel onNotify={say} />
) : tab === 'logs' ? (
  <SystemLogsPanel />
) : (
      <>
      {busy === 'load' && <p className="admin-sub">Загружаю…</p>}

      <div className="admin-list">
        {products.map((p) => (
          <div className={`admin-row${p.isActive ? '' : ' inactive'}`} key={p.id}>
            <div className="admin-thumb">
              {p.image ? <img src={p.image} alt="" /> : <span className="no-photo">нет фото</span>}
            </div>
            <div className="admin-row-main">
              <b>{p.name.az || '(без названия)'}</b>
              <span className="admin-row-meta">
                код {p.code || '—'} · {p.brand} · {catLabel(p.category)}
                {!p.isActive && ' · скрыт'}
              </span>
            </div>
            <div className="admin-row-price">
              {p.oldPrice ? <s>{p.oldPrice} ₼</s> : null}
              <b>{p.price} ₼</b>
            </div>
            <div className="admin-row-actions">
              <button className="btn-ghost btn-sm" onClick={() => setForm(structuredClone(p))}>
                Изменить
              </button>
              <button className="cart-remove" onClick={() => onDelete(p)} aria-label="Удалить">
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <ProductForm
          value={form}
          categories={categories}
          saving={busy === 'save'}
          onCancel={() => setForm(null)}
          onSave={onSave}
          onNotify={say}
        />
      )}
      </>
      )}
    </div>
  )
}

/* ---------------- Заказы ---------------- */
const STATUS_LABEL = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label]))

function OrdersPanel({ onNotify }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const refresh = async () => {
    setLoading(true)
    try {
      setOrders(await listOrders(adminSupabase))
    } catch (e) {
      onNotify('err', `Не удалось загрузить заказы: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { refresh() }, [])

  const changeStatus = async (id, status) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)))
    try {
      await setOrderStatus(id, status, adminSupabase)
    } catch (e) {
      onNotify('err', `Не удалось изменить статус: ${e.message}`)
      refresh()
    }
  }

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  if (loading) return <p className="admin-sub">Загружаю заказы…</p>
  if (orders.length === 0) return <p className="admin-sub">Заказов пока нет.</p>

  return (
    <>
      <div className="order-filters">
        <button className={`filter-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          Все ({orders.length})
        </button>
        {ORDER_STATUSES.map((s) => {
          const n = orders.filter((o) => o.status === s.value).length
          if (!n) return null
          return (
            <button key={s.value} className={`filter-chip${filter === s.value ? ' active' : ''}`}
              onClick={() => setFilter(s.value)}>
              {s.label} ({n})
            </button>
          )
        })}
      </div>

      <div className="orders-list">
        {shown.map((o) => (
          <div className={`order-card status-${o.status}`} key={o.id}>
            <div className="order-card-head">
              <div>
                <b className="order-no-lbl">{o.order_no}</b>
                <span className="order-date">
                  {new Date(o.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
              <select className="status-select" value={o.status}
                onChange={(e) => changeStatus(o.id, e.target.value)}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="order-items">
              {(o.order_items || []).map((it) => (
                <div key={it.id} className="order-item-line">
                  <span>{it.product_name} <em>(код {it.product_code})</em></span>
                  <span>{it.size ? `${it.size} · ` : ''}×{it.qty} · {it.price * it.qty} ₼</span>
                </div>
              ))}
            </div>

            <div className="order-customer">
              <div><b>{o.customer_name}</b> · итого {o.total} ₼</div>
              <div className="order-contacts">
                <a href={`https://wa.me/${(o.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  WhatsApp: {o.phone}
                </a>
                {o.phone_call && <a href={`tel:${o.phone_call}`}>Звонок: {o.phone_call}</a>}
                {o.email && <a href={`mailto:${o.email}`}>{o.email}</a>}
              </div>
              <div className="order-address">{o.address}</div>
              {o.note && <div className="order-note">📝 {o.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------------- Форма товара ---------------- */
function ProductForm({ value, categories, saving, onCancel, onSave, onNotify }) {
  const [p, setP] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [suggestions, setSuggestions] = useState([]) // fotodan tapılan tonlar

  const toggleColor = (c) =>
    set({ colors: p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c] })

  const set = (patch) => setP((v) => ({ ...v, ...patch }))
  const setLang = (field, lang, val) =>
    setP((v) => ({ ...v, [field]: { ...v[field], [lang]: val } }))

  const toggleSize = (s) =>
    set({ sizes: p.sizes.includes(s) ? p.sizes.filter((x) => x !== s) : [...p.sizes, s] })

  const pickFiles = async (files) => {
    const selectedFiles = Array.from(files || [])
    if (!selectedFiles.length) return
    const oversized = selectedFiles.find((file) => file.size > 5 * 1024 * 1024)
    if (oversized) {
      onNotify('err', `«${oversized.name}» больше 5 МБ — сожми его перед загрузкой.`)
      return
    }
    setUploading(true)
    try {
      // Цвета находим только по первому фото: пользователь сам выбирает нужный тон.
      try {
        const cols = await extractColors(selectedFiles[0], 8)
        if (cols.length) { setSuggestions(cols); onNotify('ok', 'Тона найдены — выбери нужные ниже') }
      } catch { /* rəng təyini kritik deyil */ }

      const uploaded = []
      for (const file of selectedFiles) uploaded.push(await uploadImage(file))
      setP((current) => {
        const images = [...new Set([...(current.images || []), ...uploaded])]
        return { ...current, images, image: images[0] || '' }
      })
      onNotify('ok', selectedFiles.length > 1 ? `Добавлено фото: ${selectedFiles.length}` : 'Фото добавлено')
    } catch (e) {
      onNotify('err', e.message === 'BUCKET_MISSING'
        ? 'Хранилище фото ещё не создано — запусти supabase/storage.sql'
        : `Не удалось загрузить фото: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (image) => {
    setP((current) => {
      const images = (current.images || []).filter((item) => item !== image)
      return { ...current, images, image: images[0] || '' }
    })
  }

  const moveImage = (index, direction) => {
    setP((current) => {
      const images = [...(current.images || [])]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= images.length) return current
      ;[images[index], images[targetIndex]] = [images[targetIndex], images[index]]
      return { ...current, images, image: images[0] || '' }
    })
  }

  // Şəkil linkindən (URL) rəngləri təyin et
  const detectFromUrl = async () => {
    if (!p.image.trim()) return
    setDetecting(true)
    try {
      const cols = await extractColors(p.image.trim(), 8)
      if (cols.length) { setSuggestions(cols); onNotify('ok', 'Тона найдены — выбери нужные ниже') }
      else onNotify('err', 'Не удалось прочитать цвета из этой ссылки')
    } catch {
      onNotify('err', 'Не удалось прочитать цвета из этой ссылки')
    } finally {
      setDetecting(false)
    }
  }

  const validation = {
    name: !p.name.az.trim(),
    category: !p.category,
    price: !Number.isFinite(Number(p.price)) || Number(p.price) <= 0,
    images: !(p.images || []).length && !p.image?.trim(),
    sizes: !(p.sizes || []).length,
    oldPrice: p.oldPrice !== '' && p.oldPrice !== null &&
      (!Number.isFinite(Number(p.oldPrice)) || Number(p.oldPrice) <= Number(p.price)),
  }
  const validationMessages = [
    validation.name && 'название на азербайджанском',
    validation.category && 'категорию',
    validation.price && 'цену больше 0',
    validation.images && 'минимум одну фотографию',
    validation.sizes && 'минимум один размер',
    validation.oldPrice && 'старую цену больше текущей',
  ].filter(Boolean)
  const submit = () => {
    setAttemptedSave(true)
    if (validationMessages.length) {
      onNotify('err', `Товар не сохранён. Заполните: ${validationMessages.join(', ')}.`)
      return
    }
    onSave(p)
  }

  return (
    <div className="admin-modal" role="dialog" aria-modal="true">
      <div className="admin-modal-box">
        <div className="admin-modal-head">
          <h3>{p.id ? 'Изменить товар' : 'Новый товар'}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="admin-modal-body">
          {attemptedSave && validationMessages.length > 0 && (
            <div className="form-errors" role="alert">
              <strong>Товар не сохранён.</strong> Заполните: {validationMessages.join(', ')}.
            </div>
          )}
          <label className={`fld${attemptedSave && validation.name ? ' has-error' : ''}`}>
            <span>Название (азербайджанский) *</span>
            <input aria-invalid={attemptedSave && validation.name} value={p.name.az} onChange={(e) => setLang('name', 'az', e.target.value)} />
          </label>
          <div className="fld-2">
            <label className="fld">
              <span>Название (русский)</span>
              <input value={p.name.ru} onChange={(e) => setLang('name', 'ru', e.target.value)}
                placeholder="пусто = как на аз." />
            </label>
            <label className="fld">
              <span>Название (английский)</span>
              <input value={p.name.en} onChange={(e) => setLang('name', 'en', e.target.value)}
                placeholder="пусто = как на аз." />
            </label>
          </div>

          <label className="fld">
            <span>Описание (азербайджанский)</span>
            <textarea rows={3} value={p.description.az}
              onChange={(e) => setLang('description', 'az', e.target.value)} />
          </label>
          <div className="fld-2">
            <label className="fld">
              <span>Описание (русский)</span>
              <textarea rows={3} value={p.description.ru}
                onChange={(e) => setLang('description', 'ru', e.target.value)} />
            </label>
            <label className="fld">
              <span>Описание (английский)</span>
              <textarea rows={3} value={p.description.en}
                onChange={(e) => setLang('description', 'en', e.target.value)} />
            </label>
          </div>

          <div className="fld-2">
            <label className="fld">
              <span>Код товара</span>
              <input value={p.code} onChange={(e) => set({ code: e.target.value })}
                placeholder="пусто = создастся сам" />
            </label>
            <label className="fld">
              <span>Бренд</span>
              <input value={p.brand} onChange={(e) => set({ brand: e.target.value })} />
            </label>
          </div>

          <div className="fld-2">
            <label className="fld">
              <span>Категория</span>
              <select className={attemptedSave && validation.category ? 'field-error' : ''} aria-invalid={attemptedSave && validation.category} value={p.category} onChange={(e) => set({ category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label.ru}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="fld-2">
            <label className={`fld${attemptedSave && validation.price ? ' has-error' : ''}`}>
              <span>Цена, ₼ *</span>
              <input aria-invalid={attemptedSave && validation.price} type="number" min="0" value={p.price}
                onChange={(e) => set({ price: e.target.value })} />
            </label>
            <label className={`fld${attemptedSave && validation.oldPrice ? ' has-error' : ''}`}>
              <span>Старая цена, ₼ (для скидки)</span>
              <input aria-invalid={attemptedSave && validation.oldPrice} type="number" min="0" value={p.oldPrice}
                onChange={(e) => set({ oldPrice: e.target.value })}
                placeholder="пусто = без скидки" />
            </label>
          </div>

          <div className="fld">
            <span>Фото товара <em className="fld-note" style={{ fontWeight: 400 }}>— первое будет главным</em></span>
            <div className={`photo-row${attemptedSave && validation.images ? ' field-error' : ''}`}>
              <div className="photo-previews">
                {(p.images || []).length ? p.images.map((image, index) => (
                  <div className="photo-preview" key={image}>
                    <img src={image} alt="" />
                    <span className="photo-number">{index === 0 ? 'Главное' : index + 1}</span>
                    {(p.images || []).length > 1 && (
                      <div className="photo-move-controls" aria-label={`Порядок фото ${index + 1}`}>
                        <button
                          type="button"
                          className="photo-move"
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0}
                          aria-label="Передвинуть фото влево"
                        >
                          <IconArrow />
                        </button>
                        <button
                          type="button"
                          className="photo-move photo-move-right"
                          onClick={() => moveImage(index, 1)}
                          disabled={index === p.images.length - 1}
                          aria-label="Передвинуть фото вправо"
                        >
                          <IconArrow />
                        </button>
                      </div>
                    )}
                    <button type="button" className="photo-remove" onClick={() => removeImage(image)} aria-label="Удалить фото">×</button>
                  </div>
                )) : (
                  <div className="photo-preview"><span className="no-photo">нет фото</span></div>
                )}
              </div>
              <div className="photo-controls">
                <input type="file" accept="image/*" multiple disabled={uploading}
                  onChange={(e) => { pickFiles(e.target.files); e.target.value = '' }} />
                {uploading && <span className="hint">Загружаю фото…</span>}
              </div>
            </div>
          </div>

          <div className="fld">
            <span>Размеры</span>
            <div className={`size-picks${attemptedSave && validation.sizes ? ' field-error' : ''}`}>
              {SIZE_PRESETS.map((s) => (
                <button key={s} type="button"
                  className={`size-btn${p.sizes.includes(s) ? ' active' : ''}`}
                  onClick={() => toggleSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* Fotodan tapılan tonlar — istifadəçi nəyi seçir */}
          {suggestions.length > 0 && (
            <div className="fld">
              <span>Тона на фото <em className="fld-note" style={{ fontWeight: 400 }}>— нажми на нужный оттенок одежды</em></span>
              <div className="suggest-swatches">
                {suggestions.map((c, i) => (
                  <button key={i} type="button" title={c}
                    className={`suggest-swatch${p.colors.includes(c) ? ' picked' : ''}`}
                    style={{ background: c }}
                    onClick={() => toggleColor(c)}>
                    {p.colors.includes(c) && <span className="tick">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="fld">
            <span>Цвета товара <em className="fld-note" style={{ fontWeight: 400 }}>— выбранные оттенки (можно поправить вручную)</em></span>
            <div className="color-picks">
              {p.colors.map((c, i) => (
                <span className="color-pick" key={i}>
                  <input type="color" value={c}
                    onChange={(e) => set({ colors: p.colors.map((x, j) => j === i ? e.target.value : x) })} />
                  <button type="button" onClick={() => set({ colors: p.colors.filter((_, j) => j !== i) })}
                    aria-label="Убрать цвет">×</button>
                </span>
              ))}
              <button type="button" className="btn-ghost btn-sm"
                onClick={() => set({ colors: [...p.colors, '#e5399a'] })}>+ цвет вручную</button>
              {p.image && (
                <button type="button" className="btn-ghost btn-sm" disabled={detecting}
                  onClick={detectFromUrl}>
                  {detecting ? '…' : '🎨 найти по фото'}
                </button>
              )}
            </div>
          </div>

          <div className="fld-2">
            <label className="fld">
              <span>Метка</span>
              <select value={p.tag || ''} onChange={(e) => set({ tag: e.target.value })}>
                {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Рейтинг (1–5)</span>
              <input type="number" min="1" max="5" step="0.1" value={p.rating}
                onChange={(e) => set({ rating: e.target.value })} />
            </label>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={p.isActive}
              onChange={(e) => set({ isActive: e.target.checked })} />
            <span>Показывать на сайте</span>
          </label>
        </div>

        <div className="admin-modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>Отмена</button>
          <button className="btn btn-primary" disabled={saving || uploading} onClick={submit}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
