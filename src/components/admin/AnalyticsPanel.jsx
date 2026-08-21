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
        ? 'Аналитика закупок не подключена — выполните supabase/procurement-module.sql.'
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
            <Metric label="Закуплено (партий)" value={sum.batches || 0} />
            <Metric label="Единиц куплено" value={`${sum.quantity_purchased || 0} шт.`} />
            <Metric label="Расходы на закупки" value={fmtAzn(sum.purchase_total || 0)} />
            <Metric label="Ожидаемая выручка" value={fmtAzn(sum.expected_revenue || 0)} />
            <Metric label="Ожидаемая прибыль" value={fmtAzn(sum.expected_profit || 0)} accent />
            <Metric label="Средняя маржа" value={`${round2(sum.avg_margin_percent || 0)}%`} />
            <Metric label="Продано (единиц)" value={`${sum.quantity_sold || 0} шт.`} />
            <Metric label="Остаток (единиц)" value={`${sum.quantity_remaining || 0} шт.`} />
            <Metric label="Фактическая прибыль" value={fmtAzn(sum.actual_profit || 0)} note="по отмеченным продажам" />
            <Metric label="Товаров в пути" value={`${sum.in_transit_qty || 0} шт.`} note={fmtAzn(sum.in_transit_amount || 0)} />
          </div>

          <p className="admin-sub analytics-note">
            «Ожидаемая» прибыль — по плановой цене продажи всех закупленных единиц. «Фактическая» —
            только по вручную отмеченным проданным единицам (поле «Продано» в закупке). Автосписание
            по заказам магазина (FIFO) в этом этапе не реализовано.
          </p>

          <div className="analytics-breakdowns">
            <BreakdownTable title="По поставщику" rows={bySupplier} firstCol="Поставщик" />
            <BreakdownTable title="По товару" rows={byProduct} firstCol="Товар" />
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
    const a = m.get(k) || { key: k, qty: 0, sold: 0, cost: 0, revenue: 0, expProfit: 0, actProfit: 0, remaining: 0 }
    a.qty += Number(r.quantity) || 0
    a.sold += Number(r.quantity_sold) || 0
    a.remaining += Number(r.quantity_remaining) || 0
    a.cost = round2(a.cost + (Number(r.purchase_total) || 0))
    a.revenue = round2(a.revenue + (Number(r.expected_revenue) || 0))
    a.expProfit = round2(a.expProfit + (Number(r.expected_profit) || 0))
    a.actProfit = round2(a.actProfit + (Number(r.actual_profit) || 0))
    m.set(k, a)
  }
  return [...m.values()].sort((x, y) => y.expProfit - x.expProfit)
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

function BreakdownTable({ title, rows, firstCol }) {
  return (
    <div className="analytics-breakdown">
      <h3 className="checkout-h3">{title}</h3>
      {rows.length === 0 ? <p className="admin-sub">Нет данных.</p> : (
        <div className="proc-table-wrap">
          <table className="proc-table">
            <thead>
              <tr>
                <th>{firstCol}</th><th className="num">Кол-во</th><th className="num">Расход</th>
                <th className="num">Ожид. приб.</th><th className="num">Продано</th><th className="num">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td data-l={firstCol}><b>{r.key}</b></td>
                  <td data-l="Кол-во" className="num">{r.qty}</td>
                  <td data-l="Расход" className="num">{fmtAzn(r.cost)}</td>
                  <td data-l="Ожид. приб." className="num">{fmtAzn(r.expProfit)}</td>
                  <td data-l="Продано" className="num">{r.sold}</td>
                  <td data-l="Остаток" className="num">{r.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
