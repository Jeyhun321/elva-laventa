import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useImpersonation } from '../context/ImpersonationContext.jsx'
import { adminSupabase, isConfigured } from '../lib/supabase.js'
import {
  loadAll, saveProduct, deleteProduct, uploadImage, signIn, signOutAdmin,
  listPromos, savePromo, deletePromo, generatePromoCode, listOrderCustomers, promoUsageCounts,
  getWheelConfig, saveWheelConfig, listUsers, sendUserPasswordReset,
} from '../admin/db.js'
import { listOrders, setOrderStatus } from '../lib/orders.js'
import { logDiag, idHint } from '../lib/lifecycleDiag.js'
import { useCatalog } from '../context/CatalogContext.jsx'
import { extractColors } from '../admin/colors.js'
import { IconTrash, IconPlus, IconClose, IconArrow, IconLock } from '../components/Icons.jsx'
import SystemLogsPanel from '../components/SystemLogsPanel.jsx'
import NotFoundPage from '../components/NotFoundPage.jsx'

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

// Основная авторизация — ТОЛЬКО сервер: текущая Supabase-сессия + серверная
// is_admin() (RLS/RPC, пинит immutable owner UUID + role + email). OTP ниже —
// дополнительный слой, который видит ТОЛЬКО подтверждённый сервером owner
// (не-owner получает 404 ещё ДО OTP и никогда не может инициировать OTP).
const ADMIN_OTP_TTL = 15 * 60 * 1000
const ADMIN_OTP_EMAIL = 'alekberov.ceyhun2002@gmail.com'
const adminOtpStorageKey = (userId) => `elva-admin-otp-verified:${userId}`

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
  isFeatured: false,
  // Rəng variantı: boş ad = adi məhsul, variant deyil
  colorName: '',
  colorHex: '',
  isDefaultColor: false,
  inStock: true,
})

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  useEffect(() => {
    if (!isConfigured || !adminSupabase) { setChecking(false); return undefined }
    adminSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    // Смена аккаунта (в т.ч. на другой Google-аккаунт) меняет session → эффект
    // ниже пересчитывает is_admin() заново и мгновенно закрывает панель.
    const { data: sub } = adminSupabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // ГЛАВНАЯ проверка — серверная is_admin() для ТЕКУЩЕЙ сессии (owner identity:
  // immutable auth.uid() + role + email). Фронт не решает сам — спрашивает сервер.
  // OTP-статус выводится ТОЛЬКО для подтверждённого owner (не-owner до OTP не доходит).
  useEffect(() => {
    if (!session?.user || !adminSupabase) { setIsAdmin(false); setOtpVerified(false); setChecking(false); return undefined }
    let active = true
    setChecking(true)
    adminSupabase.rpc('is_admin')
      .then(({ data, error }) => {
        if (!active) return
        const allowed = !error && data === true
        // Диагностика: какой аккаунт (uid-хинт) видит admin-гейт и его результат.
        // Единая identity с витриной — устаревшей admin-сессии больше нет.
        logDiag('admin-gate', { uid: idHint(session.user.id), isAdmin: allowed })
        setIsAdmin(allowed)
        // OTP-разблокировка учитывается только если сервер подтвердил owner.
        setOtpVerified(allowed && hasAdminOtpVerification(session.user.id))
        setChecking(false)
      })
    return () => { active = false }
  }, [session])

  const leaveAdmin = async () => {
    if (session?.user?.id) clearAdminOtpVerification(session.user.id)
    setIsAdmin(false)
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

  // Anon → обычный вход (Google / почта+пароль). После входа сервер решает admin/404.
  if (!session) return <LoginScreen />
  // СНАЧАЛА серверная owner-проверка. Любой authenticated не-owner → полноэкранная
  // 404 (без OTP, без email владельца, без admin-формы, без загрузки admin-данных,
  // без storefront header/footer). Не раскрывает существование админки.
  if (!isAdmin) return <NotFoundPage />
  // Только подтверждённый сервером owner доходит до OTP-слоя.
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
    setBusy(true); setErr(''); setMsg('')
    try {
      // Обычный вход. Права решает сервер (is_admin) уже после установления сессии:
      // не-админ увидит 404, а не админку.
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
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
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
const OTP_RESEND_COOLDOWN = 30 // секунд между отправками кода

// OTP-слой доступен ТОЛЬКО подтверждённому сервером owner (проверка is_admin()
// в AdminPage выполняется ДО этого экрана). Дополнительный фактор поверх сессии;
// не-owner сюда не попадает и не может инициировать отправку кода.
function EmailOtpScreen({ session, onVerified, onExit }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const email = ADMIN_OTP_EMAIL

  // Обратный отсчёт до возможности повторной отправки.
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Server-guard: перед ЛЮБЫМ OTP-действием сервер подтверждает, что текущая
  // сессия — owner (is_admin). Даже прямой вызов из DevTools не-owner'ом
  // отклоняется: код не отправится и не подтвердится.
  const assertOwner = async () => {
    const { data, error } = await adminSupabase.rpc('is_admin')
    if (error || data !== true) throw new Error('NOT_OWNER')
  }

  // Отправка кода — ТОЛЬКО по явному действию пользователя (клик по кнопке).
  const sendCode = useCallback(async () => {
    if (busy || cooldown > 0) return // защита от повторных писем (быстрые клики / до истечения 30 с)
    setBusy(true); setErr('')
    try {
      await assertOwner() // не-owner не может инициировать отправку кода
      const { error } = await adminSupabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL + 'admin' },
      })
      if (error) throw error
      setSent(true)
      setCooldown(OTP_RESEND_COOLDOWN)
    } catch (e) {
      setErr(e.message === 'NOT_OWNER' ? '404 — страница не найдена.' : e.message)
    } finally {
      setBusy(false)
    }
  }, [email, busy, cooldown])

  const verify = async (e) => {
    e.preventDefault()
    const token = code.replace(/\s/g, '')
    if (!/^\d{6}$/.test(token)) {
      setErr('Введите 6-значный код из письма.')
      return
    }
    setBusy(true); setErr('')
    try {
      await assertOwner() // не-owner не может подтвердить OTP / получить unlock
      const { error } = await adminSupabase.auth.verifyOtp({ email, token, type: 'email' })
      if (error) throw error
      saveAdminOtpVerification(session.user.id)
      onVerified()
    } catch (e2) {
      setErr(e2.message === 'NOT_OWNER'
        ? '404 — страница не найдена.'
        : 'Код неверный, устарел или уже использован. Запросите новый код.')
    } finally {
      setBusy(false)
    }
  }

  const resendLabel = cooldown > 0
    ? `Отправить код ещё раз через ${cooldown} с`
    : (sent ? 'Отправить код ещё раз' : 'Отправить код на почту')

  return (
    <div className="container admin">
      <div className="login-box admin-gate-box">
        <h1 className="page-title" style={{ fontSize: '1.9rem' }}>Подтвердите вход</h1>
        <p className="admin-sub">
          {sent
            ? <>Одноразовый код отправлен на <strong>{email}</strong>. Действителен только последний код — введите его.</>
            : <>Чтобы войти в панель, запросите одноразовый код на <strong>{email}</strong>.</>}
        </p>

        {!sent && (
          <button type="button" className="btn btn-primary full" onClick={sendCode} disabled={busy || cooldown > 0}>
            {busy ? 'Отправляю…' : resendLabel}
          </button>
        )}

        {sent && (
          <form onSubmit={verify} className="login-form">
            <label className="fld">
              <span>Код из письма</span>
              <input className="otp-code" inputMode="numeric" autoComplete="one-time-code" maxLength="6" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus />
            </label>
            {err && <div className="admin-msg err">{err}</div>}
            <div className="admin-msg ok">Письмо отправлено. Проверьте также папку «Спам».</div>
            <button className="btn btn-primary full" disabled={busy}>{busy ? 'Проверяю…' : 'Подтвердить код'}</button>
            <button type="button" className="link-btn forgot-link" onClick={sendCode} disabled={busy || cooldown > 0}>
              {resendLabel}
            </button>
          </form>
        )}

        {!sent && err && <div className="admin-msg err">{err}</div>}

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
      // Bazanın texniki mətnini insan dilinə çeviririk
      const dup = e?.code === '23505' || /duplicate key|unique constraint/i.test(e?.message || '')
      say('err', dup
        ? `Не сохранено: у кода ${(p.code || '').trim()} уже есть цвет с таким названием. Впишите другое название цвета.`
        : `Ошибка сохранения: ${e.message}`)
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

  // Eyni kodlu rənglər siyahıda yan-yana dursun: əvvəl əsas rəng,
  // sonra qalanları (onlar sola girinti ilə göstərilir).
  const groupedProducts = useMemo(() => {
    const groups = new Map()
    products.forEach((p) => {
      const key = (p.code || '').trim().toUpperCase() || `id:${p.id}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(p)
    })

    const out = []
    groups.forEach((list) => {
      const sorted = [...list].sort(
        (a, b) => (b.isDefaultColor === true) - (a.isDefaultColor === true) || a.id - b.id,
      )
      sorted.forEach((p, i) => out.push({ ...p, isVariantChild: list.length > 1 && i > 0 }))
    })
    return out
  }, [products])

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
  <button className={`admin-tab${tab === 'promo' ? ' active' : ''}`} onClick={() => setTab('promo')}>
    Промокоды
  </button>
  <button className={`admin-tab${tab === 'wheel' ? ' active' : ''}`} onClick={() => setTab('wheel')}>
    Колесо фортуны
  </button>
  <button className={`admin-tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
    Пользователи
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
) : tab === 'promo' ? (
  <PromoPanel onNotify={say} />
) : tab === 'wheel' ? (
  <WheelPanel onNotify={say} />
) : tab === 'users' ? (
  <UsersPanel onNotify={say} />
) : (
      <>
      {busy === 'load' && <p className="admin-sub">Загружаю…</p>}

      <div className="admin-list">
        {groupedProducts.map((p) => (
          <div className={`admin-row${p.isActive ? '' : ' inactive'}${p.isVariantChild ? ' variant-child' : ''}`} key={p.id}>
            <div className="admin-thumb">
              {p.image ? <img src={p.image} alt="" /> : <span className="no-photo">нет фото</span>}
            </div>
            <div className="admin-row-main">
              <b>{p.name.az || '(без названия)'}</b>
              <span className="admin-row-meta">
                код {p.code || '—'} · {p.brand} · {catLabel(p.category)}
                {!p.isActive && ' · скрыт'}
                {!p.inStock && ' · нет в наличии'}
              </span>
              {p.colorName && (
                <span className="admin-row-variant">
                  <i className="variant-dot" style={{ background: p.colorHex || p.colors?.[0] || '#ccc' }} />
                  {p.colorName}
                  {p.isDefaultColor && <em className="variant-main">основной</em>}
                </span>
              )}
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
          allProducts={products}
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

/* ---------------- Промокоды / купоны ---------------- */
const emptyPromo = () => ({
  code: '', type: 'campaign', discount_type: 'percent', discount_value: '10',
  active: true, starts_at: '', expires_at: '',
  max_total_uses: '', max_uses_per_account: '1', minimum_order_amount: '',
  assigned_account_id: '', source: 'manual',
})

const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function PromoPanel({ onNotify }) {
  const [promos, setPromos] = useState([])
  const [usage, setUsage] = useState({})
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, counts, custs] = await Promise.all([
        listPromos(), promoUsageCounts(), listOrderCustomers(),
      ])
      setPromos(list); setUsage(counts); setCustomers(custs)
    } catch (e) {
      onNotify('err', e.message || 'Не удалось загрузить промокоды')
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => { load() }, [load])

  const startEdit = (p) => setForm({
    ...p,
    starts_at: toLocalInput(p.starts_at),
    expires_at: toLocalInput(p.expires_at),
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const generate = async () => {
    try {
      const prefix = form.type === 'individual' ? 'VIP' : 'PROMO'
      const code = await generatePromoCode(prefix)
      set({ code })
    } catch (e) {
      onNotify('err', e.message || 'Не удалось сгенерировать код')
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      await savePromo(form)
      onNotify('ok', 'Промокод сохранён')
      setForm(null)
      await load()
    } catch (e) {
      const msg = e.message === 'CODE_REQUIRED' ? 'Введите или сгенерируйте код'
        : e.message === 'ACCOUNT_REQUIRED' ? 'Для индивидуального кода выберите клиента'
        : /duplicate|unique/i.test(e.message || '') ? 'Такой код уже существует'
        : (e.message || 'Ошибка сохранения')
      onNotify('err', msg)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (p) => {
    if (!window.confirm(`Удалить промокод ${p.code}?`)) return
    try {
      await deletePromo(p.id)
      onNotify('ok', 'Промокод удалён')
      await load()
    } catch (e) {
      onNotify('err', e.message || 'Не удалось удалить')
    }
  }

  const fmtDiscount = (p) => p.discount_type === 'percent' ? `${Number(p.discount_value)}%` : `${Number(p.discount_value)} ₼`
  const custLabel = (id) => {
    const c = customers.find((x) => x.id === id)
    return c ? (c.name || c.email || id.slice(0, 8)) : id.slice(0, 8) + '…'
  }

  return (
    <div className="admin-promo">
      <div className="admin-head-actions" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setForm(emptyPromo())}>
          <IconPlus /> Новый промокод
        </button>
      </div>

      {loading ? <p className="admin-sub">Загружаю…</p> : (
        <div className="admin-list">
          {promos.length === 0 && <p className="admin-sub">Пока нет промокодов.</p>}
          {promos.map((p) => (
            <div className={`admin-row${p.active ? '' : ' inactive'}`} key={p.id}>
              <div className="admin-row-main">
                <b>{p.code} <span className="promo-badge">{p.type === 'individual' ? 'персональный' : 'кампания'}</span>
                  {p.source === 'wheel' && <span className="promo-badge wheel">колесо</span>}
                </b>
                <span className="admin-row-meta">
                  {fmtDiscount(p)}
                  {' · использовано '}{usage[p.id] || 0}{p.max_total_uses ? `/${p.max_total_uses}` : ''}
                  {p.max_uses_per_account ? ` · ${p.max_uses_per_account}/аккаунт` : ''}
                  {p.minimum_order_amount ? ` · от ${p.minimum_order_amount} ₼` : ''}
                  {p.expires_at ? ` · до ${new Date(p.expires_at).toLocaleDateString()}` : ''}
                  {!p.active && ' · выключен'}
                  {p.type === 'individual' && p.assigned_account_id ? ` · ${custLabel(p.assigned_account_id)}` : ''}
                </span>
              </div>
              <div className="admin-row-actions">
                <button className="btn-ghost btn-sm" onClick={() => startEdit(p)}>Изменить</button>
                <button className="cart-remove" onClick={() => remove(p)} aria-label="Удалить"><IconTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={() => !busy && setForm(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{form.id ? 'Изменить промокод' : 'Новый промокод'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)} aria-label="Закрыть"><IconClose /></button>
            </div>

            <div className="admin-modal-body">
            <label className="fld"><span>Код</span>
              <div className="promo-row">
                <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2026" style={{ textTransform: 'uppercase' }} />
                <button type="button" className="btn btn-ghost" onClick={generate}>Сгенерировать</button>
              </div>
            </label>

            <label className="fld"><span>Тип</span>
              <select value={form.type} onChange={(e) => set({ type: e.target.value })}>
                <option value="campaign">Кампания (много аккаунтов)</option>
                <option value="individual">Персональный (один клиент)</option>
              </select>
            </label>

            <div className="admin-form-grid2">
              <label className="fld"><span>Тип скидки</span>
                <select value={form.discount_type} onChange={(e) => set({ discount_type: e.target.value })}>
                  <option value="percent">Процент %</option>
                  <option value="fixed">Фикс. сумма ₼</option>
                </select>
              </label>
              <label className="fld"><span>Значение</span>
                <input type="number" min="0" step="0.01" value={form.discount_value}
                  onChange={(e) => set({ discount_value: e.target.value })} />
              </label>
            </div>

            {form.type === 'individual' && (
              <label className="fld"><span>Клиент</span>
                <select value={form.assigned_account_id} onChange={(e) => set({ assigned_account_id: e.target.value })}>
                  <option value="">— выберите клиента —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || '(без имени)'} · {c.email || c.id.slice(0, 8)}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="admin-form-grid2">
              <label className="fld"><span>Начало (необяз.)</span>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
              </label>
              <label className="fld"><span>Окончание (необяз.)</span>
                <input type="datetime-local" value={form.expires_at} onChange={(e) => set({ expires_at: e.target.value })} />
              </label>
            </div>

            <div className="admin-form-grid2">
              <label className="fld"><span>Всего использований</span>
                <input type="number" min="1" value={form.max_total_uses}
                  onChange={(e) => set({ max_total_uses: e.target.value })} placeholder="без лимита" />
              </label>
              <label className="fld"><span>На один аккаунт</span>
                <input type="number" min="1" value={form.max_uses_per_account}
                  onChange={(e) => set({ max_uses_per_account: e.target.value })} placeholder="без лимита" />
              </label>
            </div>

            <label className="fld"><span>Мин. сумма заказа ₼ (необяз.)</span>
              <input type="number" min="0" step="0.01" value={form.minimum_order_amount}
                onChange={(e) => set({ minimum_order_amount: e.target.value })} placeholder="нет" />
            </label>

            <label className="checkbox-row">
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
              <span>Активен</span>
            </label>
            </div>

            <div className="admin-modal-foot">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>Отмена</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Колесо фортуны — настройки ---------------- */
function WheelPanel({ onNotify }) {
  const [cfg, setCfg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getWheelConfig()
      .then((c) => { if (alive) setCfg(c) })
      .catch((e) => onNotify('err', e.message || 'Не удалось загрузить конфиг'))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [onNotify])

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))
  const setReward = (i, patch) => setCfg((c) => ({
    ...c, rewards: c.rewards.map((r, j) => j === i ? { ...r, ...patch } : r),
  }))
  // Смена статуса: DISPLAY ONLY обнуляет вес (в розыгрыше не участвует),
  // ACTIVE — если веса нет, ставит разумный дефолт; замок для ACTIVE снимается.
  const setStatus = (i, status) => setCfg((c) => ({
    ...c,
    rewards: c.rewards.map((r, j) => {
      if (j !== i) return r
      if (status === 'active') {
        return { ...r, status: 'active', weight: Number(r.weight) > 0 ? Number(r.weight) : 10, show_lock: false }
      }
      return { ...r, status: 'display_only', weight: 0 }
    }),
  }))
  // Ввод веса сам управляет статусом (удобное поведение, без «Save не проходит»):
  //  вес = 0  → сектор автоматически DISPLAY ONLY (виден, но сервер его не выбирает);
  //  вес > 0  → сектор автоматически ACTIVE (участвует), замок снимается;
  //  пусто / «-» / отрицательный ввод — сохраняем как есть, статус не трогаем;
  //  отрицательный вес отклонит валидация при сохранении.
  const setWeight = (i, raw) => setCfg((c) => ({
    ...c,
    rewards: c.rewards.map((r, j) => {
      if (j !== i) return r
      const s = String(raw)
      if (s === '' || s === '-') return { ...r, weight: s }
      const n = Number(s)
      if (!Number.isFinite(n)) return { ...r, weight: s }
      if (n === 0) return { ...r, weight: 0, status: 'display_only' }
      if (n > 0) return { ...r, weight: s, status: 'active', show_lock: false }
      return { ...r, weight: s }
    }),
  }))
  const addReward = () => setCfg((c) => ({
    ...c, rewards: [...(c.rewards || []), { percent: 10, weight: 0, status: 'display_only', show_lock: false }],
  }))
  const removeReward = (i) => setCfg((c) => ({ ...c, rewards: c.rewards.filter((_, j) => j !== i) }))

  const save = async () => {
    // ---- Валидация конфигурации наград ----
    const rewards = (cfg.rewards || []).map((r) => ({
      percent: Number(r.percent),
      weight: Number(r.weight) || 0,
      status: r.status === 'active' ? 'active' : 'display_only',
      show_lock: Boolean(r.show_lock),
    }))
    if (rewards.length === 0) {
      onNotify('err', 'Добавьте хотя бы один сектор')
      return
    }
    const seen = new Set()
    for (const r of rewards) {
      if (!Number.isFinite(r.percent) || r.percent <= 0) {
        onNotify('err', 'Скидка % должна быть больше 0'); return
      }
      if (r.percent > 100) {
        onNotify('err', `Скидка ${r.percent}% недопустима (максимум 100%)`); return
      }
      if (r.weight < 0) {
        onNotify('err', 'Вес не может быть отрицательным'); return
      }
      if (seen.has(r.percent)) {
        onNotify('err', `Повторяющаяся скидка: ${r.percent}%. Проценты должны быть уникальны.`); return
      }
      seen.add(r.percent)
      if (r.status === 'active' && r.weight <= 0) {
        onNotify('err', `ACTIVE-сектор ${r.percent}% должен иметь вес больше 0`); return
      }
    }
    if (!rewards.some((r) => r.status === 'active' && r.weight > 0)) {
      onNotify('err', 'Нужен хотя бы один ACTIVE-сектор с весом > 0 (иначе колесо не сможет выдать награду)')
      return
    }

    setBusy(true)
    try {
      const clean = {
        ...cfg,
        windows: (Array.isArray(cfg.windows) ? cfg.windows : String(cfg.windows || '').split(','))
          .map((w) => String(w).trim()).filter(Boolean),
        rewards,
      }
      const saved = await saveWheelConfig(clean)
      setCfg(saved)
      onNotify('ok', 'Настройки колеса сохранены')
    } catch (e) {
      onNotify('err', e.message || 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="admin-sub">Загружаю…</p>
  if (!cfg) return <p className="admin-sub">Конфигурация колеса не найдена. Выполните supabase/promo-and-wheel.sql.</p>

  const windowsText = Array.isArray(cfg.windows) ? cfg.windows.join(', ') : (cfg.windows || '')

  return (
    <div className="admin-wheel">
      <label className="checkbox-row">
        <input type="checkbox" checked={cfg.enabled !== false} onChange={(e) => set({ enabled: e.target.checked })} />
        <span>Колесо включено</span>
      </label>

      <div className="admin-form-grid2">
        <label className="fld"><span>Часовой пояс</span>
          <input value={cfg.timezone || 'Asia/Baku'} onChange={(e) => set({ timezone: e.target.value })} />
        </label>
        <label className="fld"><span>Допуск, мин (±)</span>
          <input type="number" min="0" max="60" value={cfg.tolerance_minutes ?? 5}
            onChange={(e) => set({ tolerance_minutes: e.target.value })} />
        </label>
      </div>

      <label className="fld"><span>Окна (через запятую, HH:MM)</span>
        <input value={windowsText} onChange={(e) => set({ windows: e.target.value.split(',') })}
          placeholder="10:00, 13:00, 18:00, 21:00" />
      </label>

      <div className="admin-form-grid2">
        <label className="fld"><span>Срок награды, ч</span>
          <input type="number" min="1" value={cfg.reward_expiry_hours ?? 24}
            onChange={(e) => set({ reward_expiry_hours: e.target.value })} />
        </label>
        <label className="fld"><span>Спинов на окно</span>
          <input type="number" min="1" value={cfg.max_spins_per_window ?? 1}
            onChange={(e) => set({ max_spins_per_window: e.target.value })} />
        </label>
      </div>

      <div className="wheel-rewards">
        <div className="wheel-rewards-head">
          <span>Сектора колеса</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addReward}><IconPlus /> Добавить скидку</button>
        </div>
        <p className="admin-sub">
          <b>ACTIVE</b> — сектор виден и участвует в розыгрыше (нужен вес &gt; 0). Вероятность = вес / сумма активных весов.<br />
          <b>DISPLAY ONLY</b> — сектор виден на колесе, но сервер его НИКОГДА не выбирает.<br />
          Вес <b>0</b> автоматически делает сектор DISPLAY ONLY; вес <b>&gt; 0</b> — ACTIVE. Статус можно переключить и вручную.<br />
          <b>Показывать замок</b> — управляет иконкой замка у сектора (только для DISPLAY ONLY).
        </p>
        {(cfg.rewards || []).map((r, i) => {
          const status = r.status === 'active' ? 'active' : 'display_only'
          const isActive = status === 'active'
          return (
            <div className="wheel-reward-row" key={i}>
              <label className="fld"><span>Скидка %</span>
                <input type="number" min="1" max="100" value={r.percent}
                  onChange={(e) => setReward(i, { percent: e.target.value })} />
              </label>
              <label className="fld"><span>Вес</span>
                <input type="number" min="0" value={r.weight}
                  onChange={(e) => setWeight(i, e.target.value)} />
              </label>
              <label className="fld"><span>Статус</span>
                <select value={status} onChange={(e) => setStatus(i, e.target.value)}>
                  <option value="active">ACTIVE</option>
                  <option value="display_only">DISPLAY ONLY</option>
                </select>
              </label>
              <label className="fld wheel-lock-fld">
                <span>Замок</span>
                <label className="checkbox-row wheel-lock-toggle">
                  <input type="checkbox" checked={Boolean(r.show_lock)} disabled={isActive}
                    onChange={(e) => setReward(i, { show_lock: e.target.checked })} />
                  <IconLock aria-hidden="true" />
                </label>
              </label>
              <button type="button" className="cart-remove" onClick={() => removeReward(i)} aria-label="Убрать"><IconTrash /></button>
            </div>
          )
        })}
      </div>

      <div className="admin-form-foot">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Сохраняю…' : 'Сохранить'}</button>
      </div>
    </div>
  )
}

/* ---------------- Пользователи ---------------- */
function UsersPanel({ onNotify }) {
  const navigate = useNavigate()
  const { startImpersonation } = useImpersonation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState(null) // id пользователя в режиме подтверждения сброса
  const [resetBusy, setResetBusy] = useState(null) // id пользователя, которому сейчас отправляем письмо
  const [resetSent, setResetSent] = useState(() => new Set())
  const [impBusy, setImpBusy] = useState(null) // id пользователя, в аккаунт которого входим

  // «Войти как пользователь»: сервер (is_admin) создаёт grant с TTL, затем
  // переходим в обычную витрину — она начинает работать с РЕАЛЬНЫМИ данными target.
  const enterAsUser = async (u) => {
    setImpBusy(u.id)
    try {
      await startImpersonation(u.id)
      navigate('/', { replace: true })
    } catch (e) {
      onNotify('err', `Не удалось войти как пользователь: ${e.message}`)
      setImpBusy(null)
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await listUsers())
    } catch (e) {
      // Не-админ (или прямой вызов) получает AUTH_REQUIRED — данные не раскрываются.
      onNotify('err', e?.message?.includes('AUTH_REQUIRED')
        ? 'Нет доступа к списку пользователей.'
        : `Не удалось загрузить пользователей: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => { refresh() }, [refresh])

  const fmt = (v) => (v ? new Date(v).toLocaleString('ru-RU') : '—')

  const doReset = async (u) => {
    setResetBusy(u.id)
    try {
      // Безопасно: отправляем recovery-письмо, пароль НЕ показываем и НЕ задаём.
      await sendUserPasswordReset(u.email)
      setResetSent((prev) => new Set(prev).add(u.id))
      onNotify('ok', `Ссылка для сброса пароля отправлена на ${u.email}`)
    } catch (e) {
      onNotify('err', `Не удалось отправить сброс: ${e.message}`)
    } finally {
      setResetBusy(null)
      setConfirmId(null)
    }
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    : users

  if (loading) return <p className="admin-sub">Загружаю пользователей…</p>

  return (
    <div className="admin-users">
      <div className="admin-users-head">
        <input
          className="promo-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по имени или email"
          aria-label="Поиск пользователей"
        />
        <span className="admin-sub">{shown.length} из {users.length}</span>
      </div>

      {users.length === 0 ? (
        <p className="admin-sub">Пользователей пока нет.</p>
      ) : (
        <div className="admin-users-list">
          {shown.map((u) => (
            <div className="admin-user-row" key={u.id}>
              <div className="admin-user-main">
                <b className="admin-user-name">
                  {u.name || '(без имени)'}
                  {u.role === 'admin' && <span className="promo-badge" style={{ marginLeft: 8 }}>ADMIN</span>}
                  {!u.emailVerified && <span className="promo-badge wheel" style={{ marginLeft: 8 }}>email не подтверждён</span>}
                </b>
                <span className="admin-user-email">{u.email}</span>
                <span className="admin-row-meta">
                  ID {String(u.id).slice(0, 8)}… · регистрация {fmt(u.createdAt)} · вход {fmt(u.lastSignInAt)}
                </span>
                <span className="admin-row-meta">
                  заказов: {u.ordersCount} · промо: {u.promoCount}
                </span>
              </div>
              <div className="admin-user-actions">
                {u.role === 'admin' ? (
                  <span className="admin-sub" style={{ alignSelf: 'center' }}>Текущий аккаунт</span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => enterAsUser(u)}
                    disabled={impBusy === u.id}
                    title="Войти в реальный аккаунт этого пользователя"
                  >
                    {impBusy === u.id ? 'Вхожу…' : 'Войти как пользователь'}
                  </button>
                )}
                {confirmId === u.id ? (
                  <div className="admin-user-confirm">
                    <span className="admin-sub">Отправить ссылку для сброса пароля на {u.email}?</span>
                    <div className="admin-user-confirm-btns">
                      <button className="btn btn-primary btn-sm" onClick={() => doReset(u)} disabled={resetBusy === u.id}>
                        {resetBusy === u.id ? 'Отправляю…' : 'Отправить'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)} disabled={resetBusy === u.id}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmId(u.id)}
                    disabled={!u.email}
                    title={u.email ? 'Отправить письмо для сброса пароля' : 'У пользователя нет email'}
                  >
                    {resetSent.has(u.id) ? 'Отправить снова' : 'Сбросить пароль'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="admin-sub" style={{ marginTop: 12 }}>
        Пароли не хранятся и не отображаются. Сброс отправляет пользователю ссылку — новый пароль он задаёт сам.
      </p>
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
function ProductForm({ value, categories, allProducts = [], saving, onCancel, onSave, onNotify }) {
  const [p, setP] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [attemptedSave, setAttemptedSave] = useState(false)
  const [suggestions, setSuggestions] = useState([]) // fotodan tapılan tonlar

  // Bu kodla artıq mövcud olan DİGƏR rənglər (özü siyahıya düşmür)
  const siblings = useMemo(() => {
    const code = (p.code || '').trim().toUpperCase()
    if (!code) return []
    return allProducts.filter(
      (x) => (x.code || '').trim().toUpperCase() === code && x.id !== p.id,
    )
  }, [allProducts, p.code, p.id])

  // Kod artıq mövcud olan koda dəyişdirilirsə, rəng adı BOŞ qalmamalıdır —
  // yoxsa "kod + rəng" təkrarlanır və baza yazmağa icazə vermir.
  // Ona görə adın ilk sözünü (adətən rəngdir) özümüz təklif edirik.
  useEffect(() => {
    if (!siblings.length) return
    if ((p.colorName || '').trim()) return
    const guess = (p.name?.az || '').trim().split(/\s+/)[0] || ''
    if (!guess) return
    if (takenColorNames.includes(guess.toLowerCase())) return
    set({ colorName: guess, colorHex: p.colorHex || p.colors?.[0] || '' })
    onNotify('ok', `Название цвета подставлено: «${guess}». Можно изменить.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblings.length, p.code])

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

  // Bu kodda hansı rəng adları artıq tutulub
  const takenColorNames = useMemo(
    () => siblings.map((s) => (s.colorName || '').trim().toLowerCase()),
    [siblings],
  )

  const validation = {
    name: !p.name.az.trim(),
    category: !p.category,
    // Eyni kodda eyni rəng adı ola bilməz (baza da buna icazə vermir)
    colorName: siblings.length > 0
      && takenColorNames.includes((p.colorName || '').trim().toLowerCase()),
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
    validation.colorName && `другое название цвета — «${(p.colorName || '').trim() || 'без названия'}» у кода ${p.code.trim()} уже занято`,
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

          {/* --- Rəng variantı: eyni kodlu məhsullar bir qrupdur --- */}
          <div className="variant-box">
            <div className="variant-head">
              <span>Цвет товара (вариант)</span>
              <em>Товары с одинаковым кодом = один товар с разными цветами</em>
            </div>

            {siblings.length > 0 && (
              <p className="variant-hint">
                У кода <b>{p.code.trim()}</b> уже есть:{' '}
                {siblings.map((s) => s.colorName || '(без названия цвета)').join(', ')}.
                {' '}Впишите этому товару своё название цвета — так они станут
                одним товаром с разными цветами.
                {siblings.some((s) => !(s.colorName || '').trim()) && (
                  <><br /><b>⚠ У одного варианта название цвета не задано</b> —
                  откройте его и впишите, иначе на витрине образец будет без подписи.</>
                )}
              </p>
            )}

            <div className="fld-2">
              <label className="fld">
                <span>Название цвета</span>
                <input
                  value={p.colorName}
                  onChange={(e) => set({ colorName: e.target.value })}
                  placeholder="пусто = обычный товар без вариантов"
                />
              </label>
              <label className="fld">
                <span>Оттенок для витрины</span>
                <input
                  type="color"
                  className="variant-hex"
                  value={p.colorHex || p.colors?.[0] || '#e5399a'}
                  onChange={(e) => set({ colorHex: e.target.value })}
                />
              </label>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={p.isDefaultColor}
                onChange={(e) => set({ isDefaultColor: e.target.checked })}
              />
              <span>Основной цвет — показывать этот в каталоге</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={p.inStock}
                onChange={(e) => set({ inStock: e.target.checked })}
              />
              <span>Есть в наличии</span>
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

          <label className="checkbox-row">
            <input type="checkbox" checked={!!p.isFeatured}
              onChange={(e) => set({ isFeatured: e.target.checked })} />
            <span>⭐ Приоритетный товар (выше в поиске)</span>
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
