import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listProcurements, saveProcurement, archiveProcurement,
  listSuppliers, listSupplierPoints,
} from '../../admin/procurement.js'
import { procurementCalc, fmtAzn, round2 } from '../../lib/money.js'
import { IconPlus, IconClose, IconSearch, IconTruck, IconBox, IconPercent } from '../Icons.jsx'

const STATUSES = [
  { value: 'purchased', label: 'Куплено' },
  { value: 'in_transit', label: 'В пути' },
  { value: 'in_stock', label: 'В продаже' },
  { value: 'sold_out', label: 'Закончился' },
  { value: 'cancelled', label: 'Отменено' },
]
const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label || v

const PAGE_SIZE = 8
const todayStr = () => new Date().toISOString().slice(0, 10)
const monthStartStr = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }

const emptyProc = () => ({
  product_id: '', product_code: '', product_name: '', category: '', color: '', size: '',
  supplier_id: '', supplier_point_id: '', purchase_date: todayStr(), purchase_time: '',
  quantity: '1', quantity_sold: '0', purchase_unit_price: '', planned_sale_unit_price: '',
  payment_method: '', status: 'purchased', receipt_url: '', notes: '',
})

export default function ProcurementPanel({ onNotify, products = [], categories = [] }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  // Фильтры/поиск/сортировка/страница
  const [from, setFrom] = useState(monthStartStr())
  const [to, setTo] = useState(todayStr())
  const [fSupplier, setFSupplier] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [page, setPage] = useState(1)

  const catLabel = useCallback(
    (id) => categories.find((c) => c.id === id)?.label?.ru || id || '',
    [categories],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, s, p] = await Promise.all([
        listProcurements({ from, to, supplier_id: fSupplier || undefined, status: fStatus || undefined, category: fCategory || undefined }),
        listSuppliers(), listSupplierPoints(),
      ])
      setRows(pr); setSuppliers(s); setPoints(p)
    } catch (e) {
      onNotify('err', e.message === 'Supabase bağlantısı yoxdur'
        ? 'Модуль закупок ещё не подключён к БД (выполните supabase/procurement-module.sql).'
        : (e.message || 'Не удалось загрузить закупки'))
    } finally {
      setLoading(false)
    }
  }, [from, to, fSupplier, fStatus, fCategory, onNotify])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [from, to, fSupplier, fStatus, fCategory, search, sort])

  // Поиск (клиент) + сортировка
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = rows
    if (q) out = out.filter((r) => [r.product_name, r.product_code, r.supplier_name, r.point_name]
      .some((v) => String(v || '').toLowerCase().includes(q)))
    const by = {
      date_desc: (a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''),
      date_asc: (a, b) => (a.purchase_date || '').localeCompare(b.purchase_date || ''),
      sum_desc: (a, b) => (b.purchase_total || 0) - (a.purchase_total || 0),
      profit_desc: (a, b) => (b.expected_profit || 0) - (a.expected_profit || 0),
      qty_desc: (a, b) => (b.quantity || 0) - (a.quantity || 0),
      margin_desc: (a, b) => (b.margin_percent || 0) - (a.margin_percent || 0),
    }
    return [...out].sort(by[sort] || by.date_desc)
  }, [rows, search, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary cards — по текущему отфильтрованному периоду (реальные суммы).
  const cards = useMemo(() => {
    const today = todayStr()
    const todayBatches = rows.filter((r) => r.purchase_date === today).length
    const spent = round2(rows.reduce((s, r) => s + (Number(r.purchase_total) || 0), 0))
    const expProfit = round2(rows.reduce((s, r) => s + (Number(r.expected_profit) || 0), 0))
    const inTransit = rows.filter((r) => r.status === 'in_transit')
    const inTransitQty = inTransit.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    const inTransitAmt = round2(inTransit.reduce((s, r) => s + (Number(r.purchase_total) || 0), 0))
    return { todayBatches, spent, expProfit, inTransitQty, inTransitAmt }
  }, [rows])

  // Точки текущего выбранного поставщика в форме (dependent dropdown).
  const formPoints = useMemo(
    () => (form?.supplier_id ? points.filter((p) => p.supplier_id === form.supplier_id) : []),
    [form?.supplier_id, points],
  )

  const calc = form ? procurementCalc({
    purchase_unit_price: form.purchase_unit_price, planned_sale_unit_price: form.planned_sale_unit_price,
    quantity: form.quantity, quantity_sold: form.quantity_sold,
  }) : null

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onPickProduct = (id) => {
    const p = products.find((x) => String(x.id) === String(id))
    if (!p) { set({ product_id: '' }); return }
    set({
      product_id: p.id,
      product_code: p.code || '',
      product_name: p.name?.az || p.name?.ru || '',
      category: catLabel(p.category),
      color: p.colorName || '',
      planned_sale_unit_price: form.planned_sale_unit_price || String(p.price ?? ''),
    })
  }

  const save = async () => {
    setBusy(true)
    try {
      await saveProcurement(form)
      onNotify('ok', form.id ? 'Закупка обновлена' : 'Закупка добавлена')
      setForm(null)
      await load()
    } catch (e) {
      const m = {
        SUPPLIER_REQUIRED: 'Выберите поставщика',
        POINT_REQUIRED: 'Выберите магазин / точку',
        DATE_REQUIRED: 'Укажите дату закупки',
        QUANTITY_INVALID: 'Количество должно быть больше 0',
        PURCHASE_PRICE_INVALID: 'Некорректная закупочная цена',
        SALE_PRICE_INVALID: 'Некорректная цена продажи',
        SOLD_INVALID: 'Продано не может превышать количество',
        POINT_SUPPLIER_MISMATCH: 'Эта точка принадлежит другому поставщику',
      }[e.message] || (/relation .* does not exist|procurements/i.test(e.message || '')
        ? 'Таблицы закупок нет в БД — выполните supabase/procurement-module.sql.'
        : (e.message || 'Ошибка сохранения'))
      onNotify('err', m)
    } finally { setBusy(false) }
  }

  const archive = async (r) => {
    if (!window.confirm(`Архивировать закупку «${r.product_name || r.product_code || r.id}»? Запись скроется из списков и сумм, но не удалится безвозвратно.`)) return
    try { await archiveProcurement(r.id); onNotify('ok', 'Закупка в архиве'); await load() }
    catch (e) { onNotify('err', e.message || 'Не удалось архивировать') }
  }

  const usedCategories = useMemo(() => {
    const set2 = new Set(rows.map((r) => r.category).filter(Boolean))
    return [...set2]
  }, [rows])

  return (
    <div className="admin-procurement">
      {/* Summary cards */}
      <div className="proc-cards">
        <SummaryCard Icon={IconTruck} tone="pink" label="Сегодня закупок" value={cards.todayBatches} hint="партий за сегодня" />
        <SummaryCard Icon={IconBox} tone="cream" label="Сумма закупок" value={fmtAzn(cards.spent)} hint="за выбранный период" />
        <SummaryCard Icon={IconPercent} tone="mint" label="Ожидаемая прибыль" value={fmtAzn(cards.expProfit)} hint="по закупкам периода" />
        <SummaryCard Icon={IconTruck} tone="lilac" label="Товаров в пути" value={`${cards.inTransitQty} шт.`} hint={`на сумму ${fmtAzn(cards.inTransitAmt)}`} />
      </div>

      {/* Toolbar: поиск + фильтры + добавить */}
      <div className="proc-toolbar">
        <div className="proc-search">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по товару, коду, поставщику, точке…"
          />
        </div>
        <div className="proc-filters">
          <label>С <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>По <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <select value={fSupplier} onChange={(e) => setFSupplier(e.target.value)} aria-label="Поставщик">
            <option value="">Все поставщики</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Статус">
            <option value="">Все статусы</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Категория">
            <option value="">Все категории</option>
            {usedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка">
            <option value="date_desc">Сначала новые</option>
            <option value="date_asc">Сначала старые</option>
            <option value="sum_desc">Сумма закупки ↓</option>
            <option value="profit_desc">Прибыль ↓</option>
            <option value="qty_desc">Количество ↓</option>
            <option value="margin_desc">Маржа ↓</option>
          </select>
        </div>
        <button className="btn btn-primary proc-add" onClick={() => setForm(emptyProc())}>
          <IconPlus /> Добавить закупку
        </button>
      </div>

      {/* Table */}
      {loading ? <p className="admin-sub">Загружаю…</p> : filtered.length === 0 ? (
        <p className="admin-sub">Закупок за выбранный период нет.</p>
      ) : (
        <>
          <div className="proc-table-wrap">
            <table className="proc-table">
              <thead>
                <tr>
                  <th>Товар</th><th>Код / SKU</th><th>Поставщик</th><th>Точка</th>
                  <th>Дата</th><th className="num">Кол-во</th><th className="num">Закуп.</th>
                  <th className="num">Сумма</th><th className="num">Продажа</th><th className="num">Ожид. приб.</th>
                  <th className="num">Остаток</th><th>Статус</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td data-l="Товар"><b>{r.product_name || '—'}</b>{r.color ? <small> · {r.color}</small> : ''}{r.size ? <small> · {r.size}</small> : ''}</td>
                    <td data-l="Код">{r.product_code || '—'}</td>
                    <td data-l="Поставщик">{r.supplier_name || '—'}</td>
                    <td data-l="Точка">{r.point_name || '—'}</td>
                    <td data-l="Дата">{r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('ru-RU') : '—'}</td>
                    <td data-l="Кол-во" className="num">{r.quantity}</td>
                    <td data-l="Закуп." className="num">{fmtAzn(r.purchase_unit_price)}</td>
                    <td data-l="Сумма" className="num">{fmtAzn(r.purchase_total)}</td>
                    <td data-l="Продажа" className="num">{fmtAzn(r.planned_sale_unit_price)}</td>
                    <td data-l="Ожид. приб." className="num">{fmtAzn(r.expected_profit)}</td>
                    <td data-l="Остаток" className="num">{r.quantity_remaining}</td>
                    <td data-l="Статус"><span className={`proc-status s-${r.status}`}>{statusLabel(r.status)}</span></td>
                    <td className="proc-actions">
                      <button className="btn-ghost btn-sm" onClick={() => setForm({
                        ...r,
                        quantity: String(r.quantity), quantity_sold: String(r.quantity_sold),
                        purchase_unit_price: String(r.purchase_unit_price), planned_sale_unit_price: String(r.planned_sale_unit_price),
                        product_id: r.product_id || '', purchase_time: r.purchase_time || '',
                      })}>Изм.</button>
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

      {/* Form drawer */}
      {form && (
        <div className="proc-drawer-scrim" onClick={() => !busy && setForm(null)}>
          <div className="proc-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{form.id ? 'Изменить закупку' : 'Добавить закупку'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)} aria-label="Закрыть"><IconClose /></button>
            </div>
            <div className="proc-drawer-body">
              <label className="fld"><span>Поставщик *</span>
                <select value={form.supplier_id} onChange={(e) => set({ supplier_id: e.target.value, supplier_point_id: '' })}>
                  <option value="">Выберите поставщика</option>
                  {suppliers.filter((s) => s.active || s.id === form.supplier_id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="fld"><span>Магазин / точка *</span>
                <select value={form.supplier_point_id} onChange={(e) => set({ supplier_point_id: e.target.value })} disabled={!form.supplier_id}>
                  <option value="">{form.supplier_id ? 'Выберите точку' : 'Сначала поставщик'}</option>
                  {formPoints.map((p) => (
                    <option key={p.id} value={p.id}>{[p.market_name, p.name].filter(Boolean).join(' — ')}</option>
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

              <label className="fld"><span>Товар (из каталога)</span>
                <select value={form.product_id} onChange={(e) => onPickProduct(e.target.value)}>
                  <option value="">— не связывать / ввести вручную —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{(p.name?.az || p.name?.ru || '(без имени)')}{p.code ? ` · ${p.code}` : ''}</option>
                  ))}
                </select>
              </label>

              <div className="admin-form-grid2">
                <label className="fld"><span>Код / SKU</span>
                  <input value={form.product_code} onChange={(e) => set({ product_code: e.target.value })} placeholder="LV-D-1023" />
                </label>
                <label className="fld"><span>Название</span>
                  <input value={form.product_name} onChange={(e) => set({ product_name: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-grid2">
                <label className="fld"><span>Категория</span>
                  <input value={form.category} onChange={(e) => set({ category: e.target.value })} />
                </label>
                <label className="fld"><span>Цвет</span>
                  <input value={form.color} onChange={(e) => set({ color: e.target.value })} />
                </label>
              </div>
              <label className="fld"><span>Размер / вариант</span>
                <input value={form.size} onChange={(e) => set({ size: e.target.value })} placeholder="напр. M / 38" />
              </label>

              <div className="admin-form-grid2">
                <label className="fld"><span>Количество *</span>
                  <input type="number" min="1" step="1" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
                </label>
                <label className="fld"><span>Продано (шт.)</span>
                  <input type="number" min="0" step="1" value={form.quantity_sold} onChange={(e) => set({ quantity_sold: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-grid2">
                <label className="fld"><span>Закуп. цена / ед. *</span>
                  <input type="number" min="0" step="0.01" value={form.purchase_unit_price} onChange={(e) => set({ purchase_unit_price: e.target.value })} placeholder="0.00" />
                </label>
                <label className="fld"><span>Цена продажи / ед. *</span>
                  <input type="number" min="0" step="0.01" value={form.planned_sale_unit_price} onChange={(e) => set({ planned_sale_unit_price: e.target.value })} placeholder="0.00" />
                </label>
              </div>

              {/* Live calculations */}
              <div className="proc-calc">
                <div><span>Сумма закупки</span><b>{fmtAzn(calc.purchase_total)}</b></div>
                <div><span>Ожид. выручка</span><b>{fmtAzn(calc.expected_revenue)}</b></div>
                <div><span>Ожид. прибыль</span><b className={calc.expected_profit < 0 ? 'neg' : 'pos'}>{fmtAzn(calc.expected_profit)}</b></div>
                <div><span>Маржа</span><b>{calc.margin_percent}%</b></div>
                <div><span>Наценка</span><b>{calc.markup_percent}%</b></div>
                <div><span>Остаток</span><b>{calc.quantity_remaining} шт.</b></div>
              </div>

              <div className="admin-form-grid2">
                <label className="fld"><span>Способ оплаты</span>
                  <input value={form.payment_method} onChange={(e) => set({ payment_method: e.target.value })} placeholder="Наличные / карта" />
                </label>
                <label className="fld"><span>Статус</span>
                  <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              <label className="fld"><span>Ссылка на чек / фото (URL)</span>
                <input value={form.receipt_url} onChange={(e) => set({ receipt_url: e.target.value })} placeholder="https://…" />
                <em className="fld-note">Загрузка файлов чеков в защищённое хранилище — отдельный шаг (не в публичный бакет товаров).</em>
              </label>
              <label className="fld"><span>Примечание</span>
                <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Добавьте примечание (необязательно)" />
              </label>
            </div>

            <div className="admin-form-foot proc-drawer-foot">
              <button className="btn btn-ghost" onClick={() => setForm(emptyProc())} disabled={busy}>Очистить</button>
              <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? '…' : 'Сохранить закупку'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
