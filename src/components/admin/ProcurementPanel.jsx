import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listProcurements, saveProcurement, archiveProcurement, promoteToProduct,
  listSuppliers, variantsTotalQty,
} from '../../admin/procurement.js'
import { uploadImage } from '../../admin/db.js'
import { procurementCalc, fmtAzn, round2 } from '../../lib/money.js'
import { IconPlus, IconClose, IconSearch, IconTruck, IconBox, IconPercent, IconArrow, IconTrash } from '../Icons.jsx'

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size']
const PAGE_SIZE = 8
const todayStr = () => new Date().toISOString().slice(0, 10)
const monthStartStr = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }

const emptyProc = () => ({
  product_id: '', product_code: '', product_name: '', category: '',
  supplier_id: '', purchase_date: todayStr(), purchase_time: '',
  quantity: '1', purchase_unit_price: '', planned_sale_unit_price: '',
  images: [], variants: [], notes: '',
})

export default function ProcurementPanel({ onNotify, products = [], categories = [], onOpenProduct, onRegisterAdd }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [promoting, setPromoting] = useState(null)

  const [from, setFrom] = useState(monthStartStr())
  const [to, setTo] = useState(todayStr())
  const [fSupplier, setFSupplier] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [page, setPage] = useState(1)

  // Заголовочная кнопка «Добавить закупку» (в section-head AdminPage) открывает модал.
  useEffect(() => { onRegisterAdd?.(() => setForm(emptyProc())) }, [onRegisterAdd])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, s] = await Promise.all([
        listProcurements({ from, to, supplier_id: fSupplier || undefined, category: fCategory || undefined }),
        listSuppliers(),
      ])
      setRows(pr); setSuppliers(s)
    } catch (e) {
      onNotify('err', /procurements|does not exist|Supabase/i.test(e.message || '')
        ? 'Модуль закупок ещё не подключён к БД (выполните supabase/procurement-module.sql и procurement-product-flow.sql).'
        : (e.message || 'Не удалось загрузить закупки'))
    } finally {
      setLoading(false)
    }
  }, [from, to, fSupplier, fCategory, onNotify])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [from, to, fSupplier, fCategory, search, sort])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = rows
    if (q) out = out.filter((r) => [r.product_name, r.product_code, r.supplier_name]
      .some((v) => String(v || '').toLowerCase().includes(q)))
    const by = {
      date_desc: (a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''),
      date_asc: (a, b) => (a.purchase_date || '').localeCompare(b.purchase_date || ''),
      sum_desc: (a, b) => (b.purchase_total || 0) - (a.purchase_total || 0),
      qty_desc: (a, b) => (b.quantity || 0) - (a.quantity || 0),
    }
    return [...out].sort(by[sort] || by.date_desc)
  }, [rows, search, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary cards — только закупочные метрики (без продаж).
  const cards = useMemo(() => {
    const today = todayStr()
    const todayBatches = rows.filter((r) => r.purchase_date === today).length
    const spent = round2(rows.reduce((s, r) => s + (Number(r.purchase_total) || 0), 0))
    const units = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    const expProfit = round2(rows.reduce((s, r) => s + (Number(r.expected_profit) || 0), 0))
    const hasSale = rows.some((r) => r.planned_sale_unit_price != null)
    return { todayBatches, spent, units, expProfit, hasSale }
  }, [rows])

  const usedCategories = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))], [rows])
  const catName = useCallback((id) => categories.find((c) => c.id === id)?.label?.ru || id, [categories])

  // ---------- Форма ----------
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const variantQty = form ? variantsTotalQty(form.variants) : 0
  const hasVariants = form ? (form.variants || []).length > 0 : false
  const effectiveQty = hasVariants ? variantQty : Number(form?.quantity || 0)
  const calc = form ? procurementCalc({
    purchase_unit_price: form.purchase_unit_price,
    planned_sale_unit_price: form.planned_sale_unit_price || 0,
    quantity: effectiveQty,
  }) : null
  const hasSalePrice = form && form.planned_sale_unit_price !== '' && form.planned_sale_unit_price != null

  const onPickProduct = (id) => {
    const p = products.find((x) => String(x.id) === String(id))
    if (!p) { set({ product_id: '' }); return }
    // Привязка к СУЩЕСТВУЮЩЕМУ товару (повторная закупка того же SKU) —
    // переносим известные поля, цену продажи НЕ трогаем (это админ-цена товара).
    set({
      product_id: p.id,
      product_code: p.code || form.product_code,
      product_name: p.name?.az || p.name?.ru || form.product_name,
      category: p.category || form.category,
    })
  }

  const pickFiles = async (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const big = list.find((f) => f.size > 5 * 1024 * 1024)
    if (big) { onNotify('err', `«${big.name}» больше 5 МБ — сожми перед загрузкой.`); return }
    setUploading(true)
    try {
      const uploaded = []
      for (const f of list) uploaded.push(await uploadImage(f))
      setForm((cur) => ({ ...cur, images: [...new Set([...(cur.images || []), ...uploaded])] }))
    } catch (e) {
      onNotify('err', e.message === 'BUCKET_MISSING'
        ? 'Хранилище фото не создано — запусти supabase/storage.sql'
        : `Не удалось загрузить фото: ${e.message}`)
    } finally { setUploading(false) }
  }
  const removeImage = (img) => setForm((c) => ({ ...c, images: (c.images || []).filter((x) => x !== img) }))
  const moveImage = (i, d) => setForm((c) => {
    const images = [...(c.images || [])]; const j = i + d
    if (j < 0 || j >= images.length) return c
    ;[images[i], images[j]] = [images[j], images[i]]
    return { ...c, images }
  })

  // Варианты (цвет → размеры с количеством)
  const addVariant = () => set({ variants: [...(form.variants || []), { color: '', colorHex: '', sizes: [] }] })
  const removeVariant = (i) => set({ variants: form.variants.filter((_, idx) => idx !== i) })
  const setVariant = (i, patch) => set({ variants: form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) })
  const toggleVariantSize = (i, size) => {
    const v = form.variants[i]
    const has = v.sizes.some((s) => s.size === size)
    const sizes = has ? v.sizes.filter((s) => s.size !== size) : [...v.sizes, { size, qty: 1 }]
    setVariant(i, { sizes })
  }
  const setVariantQty = (i, size, qty) => {
    const v = form.variants[i]
    setVariant(i, { sizes: v.sizes.map((s) => (s.size === size ? { ...s, qty: Math.max(0, Number(qty) || 0) } : s)) })
  }

  const save = async () => {
    setBusy(true)
    try {
      await saveProcurement({ ...form, quantity: hasVariants ? variantQty : form.quantity })
      onNotify('ok', form.id ? 'Закупка обновлена' : 'Закупка добавлена')
      setForm(null)
      await load()
    } catch (e) {
      const m = {
        SUPPLIER_REQUIRED: 'Выберите поставщика',
        SKU_REQUIRED: 'Укажите код / SKU товара',
        TITLE_REQUIRED: 'Укажите название товара',
        DATE_REQUIRED: 'Укажите дату закупки',
        QUANTITY_INVALID: 'Количество должно быть больше 0',
        PURCHASE_PRICE_INVALID: 'Некорректная закупочная цена',
        SALE_PRICE_INVALID: 'Некорректная плановая цена продажи',
      }[e.message] || (/procurements|does not exist/i.test(e.message || '')
        ? 'Таблиц закупок нет — выполните supabase/procurement-module.sql и procurement-product-flow.sql.'
        : (e.message || 'Ошибка сохранения'))
      onNotify('err', m)
    } finally { setBusy(false) }
  }

  const archive = async (r) => {
    if (!window.confirm(`Архивировать закупку «${r.product_name || r.product_code || r.id}»? Запись скроется из списков и сумм, но не удалится безвозвратно.`)) return
    try { await archiveProcurement(r.id); onNotify('ok', 'Закупка в архиве'); await load() }
    catch (e) { onNotify('err', e.message || 'Не удалось архивировать') }
  }

  const promote = async (r) => {
    setPromoting(r.id)
    try {
      const res = await promoteToProduct(r.id)
      onNotify('ok', res?.created ? 'Черновик товара создан в «Товары»' : 'Закупка связана с существующим товаром')
      await load()
    } catch (e) {
      onNotify('err', /promote_procurement_to_product|does not exist|function/i.test(e.message || '')
        ? 'Перенос не подключён — выполните supabase/procurement-product-flow.sql.'
        : (e.message || 'Не удалось перенести в товары'))
    } finally { setPromoting(null) }
  }

  return (
    <div className="admin-procurement">
      {/* Summary cards — только закупки */}
      <div className="proc-cards">
        <SummaryCard Icon={IconTruck} tone="pink" label="Сегодня закупок" value={cards.todayBatches} hint="партий за сегодня" />
        <SummaryCard Icon={IconBox} tone="cream" label="Сумма закупок" value={fmtAzn(cards.spent)} hint="за выбранный период" />
        <SummaryCard Icon={IconBox} tone="lilac" label="Закуплено единиц" value={`${cards.units} шт.`} hint="за выбранный период" />
        <SummaryCard Icon={IconPercent} tone="mint" label="Ожидаемая прибыль" value={cards.hasSale ? fmtAzn(cards.expProfit) : '—'} hint={cards.hasSale ? 'если задана цена продажи' : 'задайте цену продажи'} />
      </div>

      {/* Toolbar: поиск + фильтры (без статуса, без точки) */}
      <div className="proc-toolbar">
        <div className="proc-search">
          <IconSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по товару, коду, поставщику…" />
        </div>
        <div className="proc-filters">
          <label>С <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>По <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <select value={fSupplier} onChange={(e) => setFSupplier(e.target.value)} aria-label="Поставщик">
            <option value="">Все поставщики</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Категория">
            <option value="">Все категории</option>
            {usedCategories.map((c) => <option key={c} value={c}>{catName(c)}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка">
            <option value="date_desc">Сначала новые</option>
            <option value="date_asc">Сначала старые</option>
            <option value="sum_desc">Сумма закупки ↓</option>
            <option value="qty_desc">Количество ↓</option>
          </select>
        </div>
      </div>

      {loading ? <p className="admin-sub">Загружаю…</p> : filtered.length === 0 ? (
        <p className="admin-sub">Закупок за выбранный период нет. Нажмите «Добавить закупку».</p>
      ) : (
        <>
          <div className="proc-table-wrap">
            <table className="proc-table">
              <thead>
                <tr>
                  <th>Фото</th><th>Товар</th><th>SKU</th><th>Поставщик</th><th>Дата</th>
                  <th className="num">Кол-во</th><th className="num">Закуп.</th><th className="num">Сумма</th>
                  <th>Перенос</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td data-l="Фото">
                      {r.images?.[0]
                        ? <img className="proc-thumb" src={r.images[0]} alt="" />
                        : <span className="proc-thumb proc-thumb-empty">—</span>}
                    </td>
                    <td data-l="Товар"><b>{r.product_name || '—'}</b>{r.variants?.length ? <small> · {r.variants.map((v) => v.color).filter(Boolean).join(', ')}</small> : ''}</td>
                    <td data-l="SKU">{r.product_code || '—'}</td>
                    <td data-l="Поставщик">{r.supplier_name || '—'}</td>
                    <td data-l="Дата">{r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('ru-RU') : '—'}</td>
                    <td data-l="Кол-во" className="num">{r.quantity}</td>
                    <td data-l="Закуп." className="num">{fmtAzn(r.purchase_unit_price)}</td>
                    <td data-l="Сумма" className="num">{fmtAzn(r.purchase_total)}</td>
                    <td data-l="Перенос">
                      {r.product_id
                        ? <span className="proc-status s-in_stock">В Товарах</span>
                        : <span className="proc-status s-cancelled">Не добавлен</span>}
                    </td>
                    <td className="proc-actions">
                      <button className="btn-ghost btn-sm" onClick={() => setForm(toFormModel(r))}>Изм.</button>
                      {r.product_id ? (
                        <button className="btn-ghost btn-sm" onClick={() => onOpenProduct?.(r.product_id)}>Открыть товар</button>
                      ) : (
                        <button className="btn-ghost btn-sm" disabled={promoting === r.id} onClick={() => promote(r)}>
                          {promoting === r.id ? '…' : 'Добавить в Товары'}
                        </button>
                      )}
                      <button className="btn-ghost btn-sm" onClick={() => archive(r)}>Архив</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="proc-pager">
            <span className="admin-sub">Показано {pageRows.length} из {filtered.length} закупок</span>
            {pageCount > 1 && (
              <div className="proc-pages">
                <button className="btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`proc-page${n === page ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button className="btn-ghost btn-sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Centered modal (desktop по центру, mobile почти full-screen) */}
      {form && (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={() => !busy && setForm(null)}>
          <div className="admin-modal-box proc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{form.id ? 'Изменить закупку' : 'Добавить закупку'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)} aria-label="Закрыть"><IconClose /></button>
            </div>

            <div className="admin-modal-body">
              <label className="fld"><span>Поставщик *</span>
                <select value={form.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })}>
                  <option value="">Выберите поставщика</option>
                  {suppliers.filter((s) => s.active || s.id === form.supplier_id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <div className="admin-form-grid2">
                <label className="fld"><span>Дата закупки *</span>
                  <input type="date" value={form.purchase_date} onChange={(e) => set({ purchase_date: e.target.value })} />
                </label>
                <label className="fld"><span>Время</span>
                  <input type="time" value={form.purchase_time} onChange={(e) => set({ purchase_time: e.target.value })} />
                </label>
              </div>

              <div className="admin-form-grid2">
                <label className="fld"><span>Код / SKU *</span>
                  <input value={form.product_code} onChange={(e) => set({ product_code: e.target.value })} placeholder="LV-D-1023" />
                </label>
                <label className="fld"><span>Название товара *</span>
                  <input value={form.product_name} onChange={(e) => set({ product_name: e.target.value })} />
                </label>
              </div>

              <div className="admin-form-grid2">
                <label className="fld"><span>Категория (для витрины, необязательно)</span>
                  <select value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    <option value="">— выбрать позже в «Товары» —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label?.ru || c.id}</option>)}
                  </select>
                </label>
                <label className="fld"><span>Связать с товаром (повторная закупка)</span>
                  <select value={form.product_id} onChange={(e) => onPickProduct(e.target.value)}>
                    <option value="">— новый товар —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{(p.name?.az || p.name?.ru || '(без имени)')}{p.code ? ` · ${p.code}` : ''}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-form-grid2">
                <label className="fld"><span>Закуп. цена / ед. *</span>
                  <input type="number" min="0" step="0.01" value={form.purchase_unit_price} onChange={(e) => set({ purchase_unit_price: e.target.value })} placeholder="0.00" />
                </label>
                <label className="fld"><span>План. цена продажи / ед. (необязательно)</span>
                  <input type="number" min="0" step="0.01" value={form.planned_sale_unit_price} onChange={(e) => set({ planned_sale_unit_price: e.target.value })} placeholder="задаётся в «Товары»" />
                </label>
              </div>

              {/* Фото товара (не чек) — общий product image storage */}
              <div className="fld">
                <span>Фото товара <em className="fld-note" style={{ fontWeight: 400 }}>— первое будет главным</em></span>
                <div className="photo-row">
                  <div className="photo-previews">
                    {(form.images || []).length ? form.images.map((img, i) => (
                      <div className="photo-preview" key={img}>
                        <img src={img} alt="" />
                        <span className="photo-number">{i === 0 ? 'Главное' : i + 1}</span>
                        {form.images.length > 1 && (
                          <div className="photo-move-controls">
                            <button type="button" className="photo-move" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Влево"><IconArrow /></button>
                            <button type="button" className="photo-move photo-move-right" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label="Вправо"><IconArrow /></button>
                          </div>
                        )}
                        <button type="button" className="photo-remove" onClick={() => removeImage(img)} aria-label="Удалить">×</button>
                      </div>
                    )) : <div className="photo-preview"><span className="no-photo">нет фото</span></div>}
                  </div>
                  <div className="photo-controls">
                    <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => { pickFiles(e.target.files); e.target.value = '' }} />
                    {uploading && <span className="hint">Загружаю фото…</span>}
                  </div>
                </div>
              </div>

              {/* Варианты: цвет → размеры с количеством. Кол-во = сумма вариантов. */}
              <div className="fld">
                <span>Цвета и размеры <em className="fld-note" style={{ fontWeight: 400 }}>— количество считается из вариантов</em></span>
                <div className="proc-variants">
                  {(form.variants || []).map((v, i) => (
                    <div className="proc-variant" key={i}>
                      <div className="proc-variant-head">
                        <input className="proc-variant-color" value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} placeholder="Цвет (напр. Красный)" />
                        <input className="proc-variant-hex" type="color" value={v.colorHex || '#cccccc'} onChange={(e) => setVariant(i, { colorHex: e.target.value })} aria-label="Оттенок" />
                        <button type="button" className="cart-remove" onClick={() => removeVariant(i)} aria-label="Убрать цвет"><IconTrash /></button>
                      </div>
                      <div className="proc-variant-sizes">
                        {SIZE_PRESETS.map((sz) => {
                          const active = v.sizes.find((s) => s.size === sz)
                          return (
                            <span key={sz} className="proc-size-cell">
                              <button type="button" className={`size-btn${active ? ' active' : ''}`} onClick={() => toggleVariantSize(i, sz)}>{sz}</button>
                              {active && (
                                <input type="number" min="1" className="proc-size-qty" value={active.qty}
                                  onChange={(e) => setVariantQty(i, sz, e.target.value)} aria-label={`Кол-во ${sz}`} />
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}><IconPlus /> Добавить цвет</button>
                </div>
              </div>

              <label className="fld"><span>Количество *{hasVariants ? ' (из вариантов)' : ''}</span>
                <input type="number" min="1" step="1" value={hasVariants ? variantQty : form.quantity}
                  onChange={(e) => set({ quantity: e.target.value })} disabled={hasVariants} />
              </label>

              {/* Live-расчёт */}
              <div className="proc-calc">
                <div><span>Кол-во</span><b>{effectiveQty} шт.</b></div>
                <div><span>Сумма закупки</span><b>{fmtAzn(calc.purchase_total)}</b></div>
                {hasSalePrice ? (
                  <>
                    <div><span>Ожид. выручка</span><b>{fmtAzn(calc.expected_revenue)}</b></div>
                    <div><span>Ожид. прибыль</span><b className={calc.expected_profit < 0 ? 'neg' : 'pos'}>{fmtAzn(calc.expected_profit)}</b></div>
                    <div><span>Маржа</span><b>{calc.margin_percent}%</b></div>
                    <div><span>Наценка</span><b>{calc.markup_percent}%</b></div>
                  </>
                ) : (
                  <div><span>Ожид. прибыль</span><b>—</b></div>
                )}
              </div>

              <label className="fld"><span>Примечание</span>
                <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Добавьте примечание (необязательно)" />
              </label>
            </div>

            <div className="admin-modal-foot">
              <button className="btn btn-ghost" onClick={() => setForm(emptyProc())} disabled={busy}>Очистить</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || uploading}>{busy ? '…' : 'Сохранить закупку'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Строка БД → модель формы (числа как строки для инпутов).
function toFormModel(r) {
  return {
    ...r,
    quantity: String(r.quantity ?? ''),
    purchase_unit_price: String(r.purchase_unit_price ?? ''),
    planned_sale_unit_price: r.planned_sale_unit_price == null ? '' : String(r.planned_sale_unit_price),
    product_id: r.product_id || '',
    category: r.category || '',
    purchase_time: r.purchase_time || '',
    images: Array.isArray(r.images) ? r.images : [],
    variants: Array.isArray(r.variants) ? r.variants : [],
  }
}

function SummaryCard({ Icon, tone, label, value, hint }) {
  return (
    <div className={`proc-card tone-${tone}`}>
      <span className="proc-card-icon"><Icon /></span>
      <div className="proc-card-body">
        <span className="proc-card-label">{label}</span>
        <b className="proc-card-value">{value}</b>
        <span className="proc-card-hint">{hint}</span>
      </div>
    </div>
  )
}
