import { adminSupabase } from '../lib/supabase.js'
import { logSystemEvent } from '../lib/systemLogs.js'

// Закупки / поставщики — admin-only (RLS: public.is_admin()). Клиент работает с
// таблицами напрямую; авторитет доступа — RLS на сервере (скрытый sidebar не защита).
const supabase = adminSupabase
const need = () => {
  if (!supabase) throw new Error('Supabase bağlantısı yoxdur')
  return supabase
}

const audit = (event, message, details) =>
  void logSystemEvent({ level: 'info', source: 'admin', event, message, details })

// ============================================================
//  ПОСТАВЩИКИ
// ============================================================
export const listSuppliers = async ({ includeInactive = true } = {}) => {
  const sb = need()
  let q = sb.from('suppliers').select('*').order('name', { ascending: true })
  if (!includeInactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

const supplierToRow = (s) => ({
  name: (s.name || '').trim(),
  contact_name: s.contact_name?.trim() || null,
  phone: s.phone?.trim() || null,
  whatsapp: s.whatsapp?.trim() || null,
  email: s.email?.trim() || null,
  notes: s.notes?.trim() || null,
  active: s.active !== false,
})

export const saveSupplier = async (s) => {
  const sb = need()
  const row = supplierToRow(s)
  if (!row.name) throw new Error('NAME_REQUIRED')
  const q = s.id
    ? sb.from('suppliers').update(row).eq('id', s.id).select().single()
    : sb.from('suppliers').insert(row).select().single()
  const { data, error } = await q
  if (error) throw error
  audit(s.id ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
    `Поставщик ${s.id ? 'обновлён' : 'создан'}: ${row.name}`, { id: data.id })
  return data
}

// Деактивация вместо удаления (у поставщика могут быть закупки).
export const deactivateSupplier = async (id, active = false) => {
  const sb = need()
  const { error } = await sb.from('suppliers').update({ active }).eq('id', id)
  if (error) throw error
  audit('SUPPLIER_DEACTIVATED', `Поставщик ${active ? 'активирован' : 'деактивирован'}`, { id, active })
}

// ============================================================
//  ТОЧКИ ПОСТАВЩИКА
// ============================================================
export const listSupplierPoints = async (supplierId = null) => {
  const sb = need()
  let q = sb.from('supplier_points').select('*').order('created_at', { ascending: true })
  if (supplierId) q = q.eq('supplier_id', supplierId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

const pointToRow = (p) => ({
  supplier_id: p.supplier_id,
  name: (p.name || '').trim(),
  market_name: p.market_name?.trim() || null,
  city: p.city?.trim() || null,
  address: p.address?.trim() || null,
  row_no: p.row_no?.trim() || null,
  shop_number: p.shop_number?.trim() || null,
  phone: p.phone?.trim() || null,
  notes: p.notes?.trim() || null,
  active: p.active !== false,
})

export const saveSupplierPoint = async (p) => {
  const sb = need()
  const row = pointToRow(p)
  if (!row.supplier_id) throw new Error('SUPPLIER_REQUIRED')
  if (!row.name) throw new Error('NAME_REQUIRED')
  const q = p.id
    ? sb.from('supplier_points').update(row).eq('id', p.id).select().single()
    : sb.from('supplier_points').insert(row).select().single()
  const { data, error } = await q
  if (error) throw error
  return data
}

export const deleteSupplierPoint = async (id) => {
  const sb = need()
  const { error } = await sb.from('supplier_points').delete().eq('id', id)
  if (error) throw error
}

// ============================================================
//  ЗАКУПКИ
// ============================================================
// Список с именами поставщика/точки (join). Фильтры применяются на сервере.
export const listProcurements = async (filters = {}) => {
  const sb = need()
  let q = sb
    .from('procurements')
    .select('*, suppliers(name), supplier_points(name, market_name)')
    .eq('archived', false)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.supplier_id) q = q.eq('supplier_id', filters.supplier_id)
  if (filters.supplier_point_id) q = q.eq('supplier_point_id', filters.supplier_point_id)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.category) q = q.eq('category', filters.category)
  if (filters.product_id) q = q.eq('product_id', filters.product_id)
  if (filters.from) q = q.gte('purchase_date', filters.from)
  if (filters.to) q = q.lte('purchase_date', filters.to)

  const { data, error } = await q
  if (error) throw error
  return (data || []).map((r) => ({
    ...r,
    supplier_name: r.suppliers?.name || '',
    point_name: r.supplier_points
      ? [r.supplier_points.market_name, r.supplier_points.name].filter(Boolean).join(' · ')
      : '',
  }))
}

// Только базовые поля идут в БД; денежные величины считает БД (generated).
const procurementToRow = (p) => {
  const numOrNull = (v) => (v === '' || v == null ? null : Number(v))
  return {
    product_id: p.product_id ? Number(p.product_id) : null,
    product_code: p.product_code?.trim() || null,
    product_name: p.product_name?.trim() || null,
    category: p.category?.trim() || null,
    color: p.color?.trim() || null,
    size: p.size?.trim() || null,
    supplier_id: p.supplier_id || null,
    supplier_point_id: p.supplier_point_id || null,
    purchase_date: p.purchase_date || null,
    purchase_time: p.purchase_time || null,
    quantity: Number(p.quantity),
    quantity_sold: p.quantity_sold === '' || p.quantity_sold == null ? 0 : Number(p.quantity_sold),
    purchase_unit_price: numOrNull(p.purchase_unit_price),
    planned_sale_unit_price: numOrNull(p.planned_sale_unit_price),
    payment_method: p.payment_method?.trim() || null,
    status: p.status || 'purchased',
    receipt_url: p.receipt_url?.trim() || null,
    notes: p.notes?.trim() || null,
  }
}

export const saveProcurement = async (p) => {
  const sb = need()
  const row = procurementToRow(p)
  // Клиентская валидация (UX); сервер (constraints/trigger) — авторитет.
  if (!row.supplier_id) throw new Error('SUPPLIER_REQUIRED')
  if (!row.supplier_point_id) throw new Error('POINT_REQUIRED')
  if (!row.purchase_date) throw new Error('DATE_REQUIRED')
  if (!(row.quantity > 0)) throw new Error('QUANTITY_INVALID')
  if (row.purchase_unit_price == null || row.purchase_unit_price < 0) throw new Error('PURCHASE_PRICE_INVALID')
  if (row.planned_sale_unit_price == null || row.planned_sale_unit_price < 0) throw new Error('SALE_PRICE_INVALID')
  if (row.quantity_sold < 0 || row.quantity_sold > row.quantity) throw new Error('SOLD_INVALID')

  const q = p.id
    ? sb.from('procurements').update(row).eq('id', p.id).select().single()
    : sb.from('procurements').insert(row).select().single()
  const { data, error } = await q
  if (error) throw error
  audit(p.id ? 'PROCUREMENT_UPDATED' : 'PROCUREMENT_CREATED',
    `Закупка ${p.id ? 'обновлена' : 'создана'}: ${row.product_name || row.product_code || '—'} ×${row.quantity}`,
    { id: data.id, supplier_id: row.supplier_id, quantity: row.quantity })
  return data
}

// Архивирование (soft-delete) — предпочтительнее удаления, т.к. закупка может
// быть связана с продажами/аналитикой. archived=true скрывает из списков/сумм.
export const archiveProcurement = async (id) => {
  const sb = need()
  const { error } = await sb.from('procurements').update({ archived: true }).eq('id', id)
  if (error) throw error
  audit('PROCUREMENT_ARCHIVED', 'Закупка перенесена в архив', { id })
}

// Аналитика за период — server-trusted RPC (реальные суммы, без фейка).
export const procurementAnalytics = async (from, to) => {
  const sb = need()
  const { data, error } = await sb.rpc('procurement_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data || {}
}
