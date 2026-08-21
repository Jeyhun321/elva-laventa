import { useCallback, useEffect, useMemo, useState } from 'react'
import { procurementAnalytics, listProcurements } from '../../admin/procurement.js'
import { fmtAzn, round2 } from '../../lib/money.js'

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const PRESETS = [
  { id: '7', label: 'Неделя', from: () => daysAgoStr(6) },
  { id: '30', label: 'Месяц', from: () => daysAgoStr(29) },
  { id: '90', label: 'Квартал', from: () => daysAgoStr(89) },
]

// ВАЖНО: это ТОЛЬКО аналитика ЗАКУПОК. Продажи/orders/revenue магазина сюда НЕ
// подмешиваются — Sales Analytics и Combined Profit Analytics будут отдельными
// модулями (см. docs/DECISIONS.md D-010 и docs/TODO.md).
export default function AnalyticsPanel({ onNotify }) {
  const [from, setFrom] = useState(daysAgoStr(29))
  const [to, setTo] = useState(todayStr())
  const [sum, setSum] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, pr] = await Promise.all([
        procurementAnalytics(from, to),
        listProcurements({ from, to }),
      ])
      setSum(s); setRows(pr)
    } catch (e) {
      onNotify('err', /procurement_analytics|does not exist|function/i.test(e.message || '')
        ? 'Аналитика закупок не подключена — выполните supabase/procurement-module.sql и procurement-product-flow.sql.'
        : (e.message || 'Не удалось загрузить аналитику'))
      setSum(null); setRows([])
    } finally {
      setLoading(false)
    }
  }, [from, to, onNotify])

  useEffect(() => { load() }, [load])

  const bySupplier = useMemo(() => aggregate(rows, (r) => r.supplier_name || '—'), [rows])
  const byProduct = useMemo(() => aggregate(rows, (r) => r.product_name || r.product_code || '—'), [rows])

  const preset = (p) => { setFrom(p.from()); setTo(todayStr()) }
  const hasSale = sum?.has_sale_price

  return (
    <div className="admin-analytics">
      <div className="proc-toolbar">
        <div className="proc-filters">
          <label>С <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>По <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {PRESETS.map((p) => (
            <button key={p.id} className="btn btn-ghost btn-sm" onClick={() => preset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="admin-sub">Загружаю…</p> : !sum ? (
        <p className="admin-sub">Нет данных за период.</p>
      ) : (
        <>
          <div className="proc-cards analytics-cards">
            <Metric label="Закуплено партий" value={sum.batches || 0} />
            <Metric label="Единиц закуплено" value={`${sum.quantity_purchased || 0} шт.`} />
            <Metric label="Расходы на закупки" value={fmtAzn(sum.purchase_total || 0)} accent />
            <Metric label="Средняя закуп. цена" value={fmtAzn(sum.avg_purchase_price || 0)} />
            <Metric label="Ожидаемая выручка" value={hasSale ? fmtAzn(sum.expected_revenue || 0) : '—'} note={hasSale ? '' : 'задайте цену продажи'} />
            <Metric label="Ожидаемая прибыль" value={hasSale ? fmtAzn(sum.expected_profit || 0) : '—'} note="expected / planned" />
            <Metric label="Средняя маржа" value={hasSale ? `${round2(sum.avg_margin_percent || 0)}%` : '—'} />
          </div>

          <p className="admin-sub analytics-note">
            Это <b>аналитика закупок</b> (сколько закуплено и потрачено). «Ожидаемая» прибыль — по плановой
            цене продажи, только там, где она задана; это НЕ фактическая прибыль. Продажи магазина, выручка
            заказов и реальная прибыль здесь НЕ учитываются — Sales Analytics и объединённая Profit Analytics
            будут отдельными модулями.
          </p>

          <div className="analytics-breakdowns">
            <BreakdownTable title="Закупки по поставщику" rows={bySupplier} firstCol="Поставщик" hasSale={hasSale} />
            <BreakdownTable title="Закупки по товару" rows={byProduct} firstCol="Товар" hasSale={hasSale} />
          </div>
        </>
      )}
    </div>
  )
}

function aggregate(rows, keyFn) {
  const m = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    const a = m.get(k) || { key: k, qty: 0, cost: 0, expProfit: 0, hasSale: false }
    a.qty += Number(r.quantity) || 0
    a.cost = round2(a.cost + (Number(r.purchase_total) || 0))
    a.expProfit = round2(a.expProfit + (Number(r.expected_profit) || 0))
    if (r.planned_sale_unit_price != null) a.hasSale = true
    m.set(k, a)
  }
  return [...m.values()].sort((x, y) => y.cost - x.cost)
}

function Metric({ label, value, note, accent }) {
  return (
    <div className={`analytics-metric${accent ? ' accent' : ''}`}>
      <span className="analytics-metric-label">{label}</span>
      <b className="analytics-metric-value">{value}</b>
      {note && <span className="analytics-metric-note">{note}</span>}
    </div>
  )
}

function BreakdownTable({ title, rows, firstCol, hasSale }) {
  return (
    <div className="analytics-breakdown">
      <h3 className="checkout-h3">{title}</h3>
      {rows.length === 0 ? <p className="admin-sub">Нет данных.</p> : (
        <div className="proc-table-wrap">
          <table className="proc-table">
            <thead>
              <tr>
                <th>{firstCol}</th><th className="num">Кол-во</th><th className="num">Расход</th>
                <th className="num">Ожид. приб.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td data-l={firstCol}><b>{r.key}</b></td>
                  <td data-l="Кол-во" className="num">{r.qty}</td>
                  <td data-l="Расход" className="num">{fmtAzn(r.cost)}</td>
                  <td data-l="Ожид. приб." className="num">{r.hasSale ? fmtAzn(r.expProfit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
