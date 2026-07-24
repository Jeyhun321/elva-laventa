import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import catalog from '../data/catalog.json'
import {
  getToken, setToken, clearToken,
  checkAccess, uploadImage, publishCatalog, latestRun,
} from '../admin/github.js'
import { IconTrash, IconPlus, IconClose } from '../components/Icons.jsx'

const DRAFT_KEY = 'elva_admin_draft'
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size']
const TAGS = [
  { value: '', label: 'Без метки' },
  { value: 'new', label: 'Новинка' },
  { value: 'bestseller', label: 'Хит' },
  { value: 'sale', label: 'Скидка' },
]

const emptyProduct = () => ({
  id: null,
  brand: 'Elva LaVenta',
  name: { az: '', ru: '', en: '' },
  description: { az: '', ru: '', en: '' },
  category: 'donlar',
  price: '',
  oldPrice: '',
  image: '',
  colors: ['#e5399a'],
  sizes: ['S', 'M', 'L'],
  rating: 5,
  reviews: 0,
  tag: '',
})

export default function AdminPage() {
  const [data, setData] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try { return JSON.parse(draft) } catch { /* pozulub */ }
    }
    return structuredClone(catalog)
  })
  const [form, setForm] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [authed, setAuthed] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!getToken()) return
    checkAccess()
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false))
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(catalog),
    [data]
  )

  const say = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const connect = async () => {
    setBusy('auth')
    try {
      setToken(tokenInput)
      const r = await checkAccess()
      if (!r.ok) throw new Error('Нет прав на запись в репозиторий')
      setAuthed(true)
      setTokenInput('')
      say('ok', 'Подключено к GitHub ✓')
    } catch (e) {
      clearToken()
      setAuthed(false)
      say('err', `Не вышло: ${e.message}`)
    } finally {
      setBusy('')
    }
  }

  const saveProduct = (p) => {
    const norm = normalize(p, data.products)
    setData((d) => {
      const exists = d.products.some((x) => x.id === norm.id)
      return {
        ...d,
        products: exists
          ? d.products.map((x) => (x.id === norm.id ? norm : x))
          : [...d.products, norm],
      }
    })
    setForm(null)
    say('ok', 'Сохранено локально. Не забудь «Опубликовать».')
  }

  const removeProduct = (id) => {
    const p = data.products.find((x) => x.id === id)
    if (!confirm(`Удалить «${p?.name?.az || id}»?`)) return
    setData((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) }))
  }

  const publish = async () => {
    setBusy('publish')
    try {
      await publishCatalog(data)
      say('ok', 'Опубликовано! Сайт обновится через 1–2 минуты.')
      setTimeout(async () => {
        try {
          const run = await latestRun()
          if (run) say('ok', `Сборка: ${run.status} ${run.conclusion || ''}`)
        } catch { /* vacib deyil */ }
      }, 8000)
    } catch (e) {
      say('err', e.message === 'NO_TOKEN'
        ? 'Сначала подключи GitHub (ключ доступа).'
        : `Ошибка публикации: ${e.message}`)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="container admin">
      <div className="admin-head">
        <div>
          <h1 className="page-title">Панель управления</h1>
          <p className="admin-sub">
            {data.products.length} товаров
            {dirty && <em className="dirty"> · есть неопубликованные изменения</em>}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/" className="btn btn-ghost btn-sm">На сайт</Link>
          <button
            className="btn btn-primary"
            onClick={publish}
            disabled={busy === 'publish' || !authed || !dirty}
          >
            {busy === 'publish' ? 'Публикую…' : 'Опубликовать на сайт'}
          </button>
        </div>
      </div>

      {msg && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}

      {!authed && (
        <div className="admin-card auth-card">
          <h3>Подключение к GitHub</h3>
          <p>
            Чтобы публиковать товары одним кликом, нужен ключ доступа.
            Он сохранится только в этом браузере.
          </p>
          <ol className="auth-steps">
            <li>Открой <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">эту страницу GitHub</a></li>
            <li>Repository access → Only select repositories → <b>elva-laventa</b></li>
            <li>Permissions → Repository permissions → <b>Contents</b> → <b>Read and write</b></li>
            <li>Generate token → скопируй и вставь сюда</li>
          </ol>
          <div className="auth-row">
            <input
              type="password"
              placeholder="github_pat_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={connect}
              disabled={!tokenInput.trim() || busy === 'auth'}
            >
              {busy === 'auth' ? 'Проверяю…' : 'Подключить'}
            </button>
          </div>
        </div>
      )}

      {authed && (
        <div className="admin-connected">
          Подключено к GitHub ✓
          <button className="link-btn" onClick={() => { clearToken(); setAuthed(false) }}>
            отключить
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={() => setForm(emptyProduct())}>
          <IconPlus /> Добавить товар
        </button>
        {dirty && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (confirm('Отменить все неопубликованные правки?')) setData(structuredClone(catalog)) }}
          >
            Сбросить правки
          </button>
        )}
      </div>

      <div className="admin-list">
        {data.products.map((p) => (
          <div className="admin-row" key={p.id}>
            <div className="admin-thumb">
              {p.image
                ? <img src={p.image} alt="" />
                : <span className="no-photo">нет фото</span>}
            </div>
            <div className="admin-row-main">
              <b>{p.name.az || '(без названия)'}</b>
              <span className="admin-row-meta">
                {p.brand} · {catLabel(data.categories, p.category)}
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
              <button className="cart-remove" onClick={() => removeProduct(p.id)} aria-label="Удалить">
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <ProductForm
          value={form}
          categories={data.categories}
          onCancel={() => setForm(null)}
          onSave={saveProduct}
          onNotify={say}
        />
      )}
    </div>
  )
}

const catLabel = (cats, id) =>
  cats.find((c) => c.id === id)?.label?.ru || id

// Boş sahələri doldurur, tipləri düzəldir
function normalize(p, existing) {
  const az = p.name.az.trim()
  const id = p.id ?? (existing.reduce((m, x) => Math.max(m, x.id), 0) + 1)
  return {
    id,
    brand: p.brand.trim() || 'Elva LaVenta',
    name: {
      az,
      ru: p.name.ru.trim() || az,
      en: p.name.en.trim() || az,
    },
    description: {
      az: p.description.az.trim(),
      ru: p.description.ru.trim() || p.description.az.trim(),
      en: p.description.en.trim() || p.description.az.trim(),
    },
    category: p.category,
    price: Number(p.price) || 0,
    oldPrice: p.oldPrice === '' || p.oldPrice == null ? null : Number(p.oldPrice),
    image: p.image.trim(),
    colors: p.colors.filter(Boolean),
    sizes: p.sizes.length ? p.sizes : ['One size'],
    rating: Number(p.rating) || 5,
    reviews: Number(p.reviews) || 0,
    tag: p.tag || null,
  }
}

function ProductForm({ value, categories, onCancel, onSave, onNotify }) {
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
      const url = await uploadImage(file)
      set({ image: url })
      onNotify('ok', 'Фото загружено в репозиторий ✓')
    } catch (e) {
      onNotify('err', e.message === 'NO_TOKEN'
        ? 'Сначала подключи GitHub.'
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
                {categories.filter((c) => c.id !== 'all').map((c) => (
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
              <input type="number" min="0" value={p.oldPrice ?? ''}
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
        </div>

        <div className="admin-modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>Отмена</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(p)}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
