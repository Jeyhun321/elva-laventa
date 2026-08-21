import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listSuppliers, saveSupplier, deactivateSupplier,
  listSupplierPoints, saveSupplierPoint, deleteSupplierPoint,
  listProcurements,
} from '../../admin/procurement.js'
import { fmtAzn, round2 } from '../../lib/money.js'
import { IconPlus, IconTrash, IconClose } from '../Icons.jsx'

const emptySupplier = () => ({ name: '', contact_name: '', phone: '', whatsapp: '', email: '', notes: '', active: true })
const emptyPoint = (supplier_id) => ({
  supplier_id, name: '', market_name: '', city: '', address: '', row_no: '', shop_number: '', phone: '', notes: '', active: true,
})

export default function SuppliersPanel({ onNotify }) {
  const [suppliers, setSuppliers] = useState([])
  const [points, setPoints] = useState([])
  const [procs, setProcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)          // supplier form
  const [pointForm, setPointForm] = useState(null) // point form
  const [openId, setOpenId] = useState(null)       // expanded supplier
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p, pr] = await Promise.all([listSuppliers(), listSupplierPoints(), listProcurements()])
      setSuppliers(s); setPoints(p); setProcs(pr)
    } catch (e) {
      onNotify('err', e.message || 'Не удалось загрузить поставщиков')
    } finally {
      setLoading(false)
    }
  }, [onNotify])

  useEffect(() => { load() }, [load])

  // Статистика по поставщику из реальных закупок (не фейк).
  const statsBySupplier = useMemo(() => {
    const m = new Map()
    for (const r of procs) {
      const s = m.get(r.supplier_id) || { batches: 0, qty: 0, spent: 0, expProfit: 0, last: null }
      s.batches += 1
      s.qty += Number(r.quantity) || 0
      s.spent = round2(s.spent + (Number(r.purchase_total) || 0))
      s.expProfit = round2(s.expProfit + (Number(r.expected_profit) || 0))
      if (!s.last || r.purchase_date > s.last) s.last = r.purchase_date
      m.set(r.supplier_id, s)
    }
    return m
  }, [procs])

  const pointsOf = (id) => points.filter((p) => p.supplier_id === id)

  const saveS = async () => {
    setBusy(true)
    try {
      await saveSupplier(form)
      onNotify('ok', 'Поставщик сохранён')
      setForm(null)
      await load()
    } catch (e) {
      onNotify('err', e.message === 'NAME_REQUIRED' ? 'Укажите название поставщика' : (e.message || 'Ошибка сохранения'))
    } finally { setBusy(false) }
  }

  const toggleActive = async (s) => {
    try { await deactivateSupplier(s.id, !s.active); await load() }
    catch (e) { onNotify('err', e.message || 'Не удалось изменить статус') }
  }

  const saveP = async () => {
    setBusy(true)
    try {
      await saveSupplierPoint(pointForm)
      onNotify('ok', 'Точка сохранена')
      setPointForm(null)
      await load()
    } catch (e) {
      onNotify('err', e.message === 'NAME_REQUIRED' ? 'Укажите название точки' : (e.message || 'Ошибка сохранения'))
    } finally { setBusy(false) }
  }

  const removeP = async (p) => {
    if (!window.confirm(`Удалить точку «${p.name}»?`)) return
    try { await deleteSupplierPoint(p.id); await load() }
    catch (e) { onNotify('err', e.message || 'Не удалось удалить') }
  }

  return (
    <div className="admin-suppliers">
      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={() => setForm(emptySupplier())}>
          <IconPlus /> Добавить поставщика
        </button>
      </div>

      {loading ? <p className="admin-sub">Загружаю…</p> : suppliers.length === 0 ? (
        <p className="admin-sub">Пока нет поставщиков.</p>
      ) : (
        <div className="supplier-list">
          {suppliers.map((s) => {
            const st = statsBySupplier.get(s.id)
            const list = pointsOf(s.id)
            const open = openId === s.id
            return (
              <div className={`supplier-card${s.active ? '' : ' inactive'}`} key={s.id}>
                <div className="supplier-card-head" onClick={() => setOpenId(open ? null : s.id)}>
                  <div className="supplier-card-id">
                    <b>{s.name}{!s.active && <span className="promo-badge" style={{ marginLeft: 8 }}>выкл.</span>}</b>
                    <span className="admin-row-meta">
                      {[s.contact_name, s.phone, s.email].filter(Boolean).join(' · ') || 'без контактов'}
                      {` · точек: ${list.length}`}
                    </span>
                  </div>
                  <div className="supplier-card-stats">
                    {st && (
                      <>
                        <span>Закупок: <b>{st.batches}</b></span>
                        <span>Сумма: <b>{fmtAzn(st.spent)}</b></span>
                        <span>Ожид. прибыль: <b>{fmtAzn(st.expProfit)}</b></span>
                        {st.last && <span>Последняя: <b>{new Date(st.last).toLocaleDateString('ru-RU')}</b></span>}
                      </>
                    )}
                  </div>
                  <div className="admin-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost btn-sm" onClick={() => setForm({ ...s })}>Изменить</button>
                    <button className="btn-ghost btn-sm" onClick={() => toggleActive(s)}>{s.active ? 'Выключить' : 'Включить'}</button>
                  </div>
                </div>

                {open && (
                  <div className="supplier-points">
                    <div className="supplier-points-head">
                      <b>Торговые точки</b>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPointForm(emptyPoint(s.id))}>
                        <IconPlus /> Добавить точку
                      </button>
                    </div>
                    {list.length === 0 ? (
                      <p className="admin-sub">Точек пока нет.</p>
                    ) : list.map((p) => (
                      <div className={`supplier-point${p.active ? '' : ' inactive'}`} key={p.id}>
                        <div>
                          <b>{[p.market_name, p.name].filter(Boolean).join(' — ')}</b>
                          <span className="admin-row-meta">
                            {[p.city, p.row_no, p.shop_number, p.phone].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </div>
                        <div className="admin-row-actions">
                          <button className="btn-ghost btn-sm" onClick={() => setPointForm({ ...p })}>Изменить</button>
                          <button className="cart-remove" onClick={() => removeP(p)} aria-label="Удалить"><IconTrash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* --- Supplier modal --- */}
      {form && (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={() => !busy && setForm(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{form.id ? 'Изменить поставщика' : 'Новый поставщик'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)} aria-label="Закрыть"><IconClose /></button>
            </div>
            <div className="admin-modal-body">
              <label className="fld"><span>Название *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ali Fashion" />
              </label>
              <div className="admin-form-grid2">
                <label className="fld"><span>Контактное лицо</span>
                  <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </label>
                <label className="fld"><span>Телефон</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
              </div>
              <div className="admin-form-grid2">
                <label className="fld"><span>WhatsApp</span>
                  <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </label>
                <label className="fld"><span>Email</span>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
              </div>
              <label className="fld"><span>Заметка</span>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <span>Активен</span>
              </label>
            </div>
            <div className="admin-form-foot">
              <button className="btn btn-ghost" onClick={() => setForm(null)} disabled={busy}>Отмена</button>
              <button className="btn btn-primary" onClick={saveS} disabled={busy}>{busy ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Point modal --- */}
      {pointForm && (
        <div className="admin-modal" role="dialog" aria-modal="true" onClick={() => !busy && setPointForm(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{pointForm.id ? 'Изменить точку' : 'Новая точка'}</h3>
              <button className="icon-btn" onClick={() => setPointForm(null)} aria-label="Закрыть"><IconClose /></button>
            </div>
            <div className="admin-modal-body">
              <label className="fld"><span>Название точки *</span>
                <input value={pointForm.name} onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })} placeholder="mağaza 42" />
              </label>
              <div className="admin-form-grid2">
                <label className="fld"><span>Рынок / ТЦ</span>
                  <input value={pointForm.market_name} onChange={(e) => setPointForm({ ...pointForm, market_name: e.target.value })} placeholder="Sədərək" />
                </label>
                <label className="fld"><span>Город</span>
                  <input value={pointForm.city} onChange={(e) => setPointForm({ ...pointForm, city: e.target.value })} placeholder="Bakı" />
                </label>
              </div>
              <div className="admin-form-grid2">
                <label className="fld"><span>Ряд</span>
                  <input value={pointForm.row_no} onChange={(e) => setPointForm({ ...pointForm, row_no: e.target.value })} placeholder="sıra 3" />
                </label>
                <label className="fld"><span>Магазин / бутик</span>
                  <input value={pointForm.shop_number} onChange={(e) => setPointForm({ ...pointForm, shop_number: e.target.value })} />
                </label>
              </div>
              <label className="fld"><span>Адрес / описание</span>
                <input value={pointForm.address} onChange={(e) => setPointForm({ ...pointForm, address: e.target.value })} />
              </label>
              <label className="fld"><span>Телефон точки</span>
                <input value={pointForm.phone} onChange={(e) => setPointForm({ ...pointForm, phone: e.target.value })} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={pointForm.active} onChange={(e) => setPointForm({ ...pointForm, active: e.target.checked })} />
                <span>Активна</span>
              </label>
            </div>
            <div className="admin-form-foot">
              <button className="btn btn-ghost" onClick={() => setPointForm(null)} disabled={busy}>Отмена</button>
              <button className="btn btn-primary" onClick={saveP} disabled={busy}>{busy ? '…' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
