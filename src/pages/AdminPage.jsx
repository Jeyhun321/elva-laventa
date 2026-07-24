import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase.js'
import {
  loadAll, saveProduct, deleteProduct, uploadImage, signIn, signOutAdmin,
} from '../admin/db.js'
import { useCatalog } from '../context/CatalogContext.jsx'
import { IconTrash, IconPlus, IconClose } from '../components/Icons.jsx'

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size']
const TAGS = [
  { value: '', label: 'Без метки' },
  { value: 'new', label: 'Новинка' },
  { value: 'bestseller', label: 'Хит' },
  { value: 'sale', label: 'Скидка' },
]

const emptyProduct = (catId) => ({
  id: null,
  brand: 'Elva LaVenta',
  name: { az: '', ru: '', en: '' },
  description: { az: '', ru: '', en: '' },
  category: catId || 'donlar',
  price: '',
  oldPrice: '',
  image: '',
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

  useEffect(() => {
    if (!isConfigured || !supabase) { setChecking(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

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

  return <Dashboard session={session} />
}

/* ---------------- Вход ---------------- */
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
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

  return (
    <div className="container admin">
      <div className="login-box">
        <h1 className="page-title" style={{ fontSize: '1.9rem' }}>Вход в панель</h1>
        <p className="admin-sub" style={{ marginBottom: 18 }}>
          Панель управления товарами Elva LaVenta
        </p>

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

          {err && <div className="admin-msg err">{err}</div>}

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
function Dashboard({ session }) {
  const { reload: reloadSite } = useCatalog()
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
          <button className="btn btn-ghost btn-sm" onClick={signOutAdmin}>Выйти</button>
          <button className="btn btn-primary" onClick={() => setForm(emptyProduct(categories[0]?.id))}>
            <IconPlus /> Добавить товар
          </button>
        </div>
      </div>

      {msg && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}
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
                {p.brand} · {catLabel(p.category)}
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
    </div>
  )
}

/* ---------------- Форма товара ---------------- */
function ProductForm({ value, categories, saving, onCancel, onSave, onNotify }) {
  const [p, setP] = useState(value)
  const [uploading, setUploading] = useState(false)

  const set = (patch) => setP((v) => ({ ...v, ...patch }))
  const setLang = (field, lang, val) =>
    setP((v) => ({ ...v, [field]: { ...v[field], [lang]: val } }))

  const toggleSize = (s) =>
    set({ sizes: p.sizes.includes(s) ? p.sizes.filter((x) => x !== s) : [...p.sizes, s] })

  const pickFile = async (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      onNotify('err', 'Фото больше 5 МБ — сожми его перед загрузкой.')
      return
    }
    setUploading(true)
    try {
      set({ image: await uploadImage(file) })
      onNotify('ok', 'Фото загружено ✓')
    } catch (e) {
      onNotify('err', e.message === 'BUCKET_MISSING'
        ? 'Хранилище фото ещё не создано — запусти supabase/storage.sql'
        : `Не удалось загрузить фото: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  const valid = p.name.az.trim() && Number(p.price) > 0

  return (
    <div className="admin-modal" role="dialog" aria-modal="true">
      <div className="admin-modal-box">
        <div className="admin-modal-head">
          <h3>{p.id ? 'Изменить товар' : 'Новый товар'}</h3>
          <button className="icon-btn" onClick={onCancel} aria-label="Закрыть"><IconClose /></button>
        </div>

        <div className="admin-modal-body">
          <label className="fld">
            <span>Название (азербайджанский) *</span>
            <input value={p.name.az} onChange={(e) => setLang('name', 'az', e.target.value)} />
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
              <span>Бренд</span>
              <input value={p.brand} onChange={(e) => set({ brand: e.target.value })} />
            </label>
            <label className="fld">
              <span>Категория</span>
              <select value={p.category} onChange={(e) => set({ category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label.ru}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="fld-2">
            <label className="fld">
              <span>Цена, ₼ *</span>
              <input type="number" min="0" value={p.price}
                onChange={(e) => set({ price: e.target.value })} />
            </label>
            <label className="fld">
              <span>Старая цена, ₼ (для скидки)</span>
              <input type="number" min="0" value={p.oldPrice}
                onChange={(e) => set({ oldPrice: e.target.value })}
                placeholder="пусто = без скидки" />
            </label>
          </div>

          <div className="fld">
            <span>Фото</span>
            <div className="photo-row">
              <div className="photo-preview">
                {p.image ? <img src={p.image} alt="" /> : <span className="no-photo">нет фото</span>}
              </div>
              <div className="photo-controls">
                <input type="file" accept="image/*" disabled={uploading}
                  onChange={(e) => pickFile(e.target.files?.[0])} />
                {uploading && <span className="hint">Загружаю…</span>}
                <input type="text" value={p.image} placeholder="или вставь ссылку на фото"
                  onChange={(e) => set({ image: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="fld">
            <span>Размеры</span>
            <div className="size-picks">
              {SIZE_PRESETS.map((s) => (
                <button key={s} type="button"
                  className={`size-btn${p.sizes.includes(s) ? ' active' : ''}`}
                  onClick={() => toggleSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <span>Цвета</span>
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
                onClick={() => set({ colors: [...p.colors, '#e5399a'] })}>+ цвет</button>
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
          <button className="btn btn-primary" disabled={!valid || saving} onClick={() => onSave(p)}>
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
