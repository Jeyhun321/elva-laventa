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
// filters.archived: 'active' (по умолчанию) | 'archived' | 'all'.
export const listProcurements = async (filters = {}) => {
  const sb = need()
  let q = sb
    .from('procurements')
    .select('*, suppliers(name), supplier_points(name, market_name)')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })

  const arch = filters.archived || 'active'
  if (arch === 'active') q = q.eq('archived', false)
  else if (arch === 'archived') q = q.eq('archived', true)
  // 'all' — без фильтра по archived

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

// Сумма количества по вариантам (если варианты заданы — quantity считается из них).
export const variantsTotalQty = (variants) =>
  (Array.isArray(variants) ? variants : []).reduce(
    (t, v) => t + (Array.isArray(v.sizes) ? v.sizes.reduce((s, x) => s + (Number(x.qty) || 0), 0) : 0),
    0,
  )

// Нормализация вариантов к чистому виду для БД: [{color,colorHex,sizes:[{size,qty}]}].
const cleanVariants = (variants) =>
  (Array.isArray(variants) ? variants : [])
    .map((v) => ({
      color: (v.color || '').trim(),
      colorHex: (v.colorHex || '').trim(),
      sizes: (Array.isArray(v.sizes) ? v.sizes : [])
        .map((s) => ({ size: (s.size || '').trim(), qty: Number(s.qty) || 0 }))
        .filter((s) => s.size && s.qty > 0),
    }))
    .filter((v) => v.sizes.length > 0)

// Только базовые поля идут в БД; денежные величины считает БД (generated).
const procurementToRow = (p) => {
  const numOrNull = (v) => (v === '' || v == null ? null : Number(v))
  const variants = cleanVariants(p.variants)
  const images = [...new Set((p.images || []).map((s) => (s || '').trim()).filter(Boolean))]
  // Если варианты заданы — количество вычисляется из них (source of truth);
  // иначе берём ручное поле quantity.
  const quantity = variants.length ? variantsTotalQty(variants) : Number(p.quantity)
  return {
    product_id: p.product_id ? Number(p.product_id) : null,
    product_code: p.product_code?.trim() || null,
    product_name: p.product_name?.trim() || null,
    category: p.category?.trim() || null,      // хранит category_id (storefront), опционально
    color: variants[0]?.color || p.color?.trim() || null,
    size: variants[0]?.sizes?.[0]?.size || p.size?.trim() || null,
    supplier_id: p.supplier_id || null,
    supplier_point_id: p.supplier_point_id || null,   // опционально (точки остаются в модуле «Поставщики»)
    purchase_date: p.purchase_date || null,
    purchase_time: p.purchase_time || null,
    quantity,
    purchase_unit_price: numOrNull(p.purchase_unit_price),
    planned_sale_unit_price: numOrNull(p.planned_sale_unit_price), // опционально (цену задаёт «Товары»)
    notes: p.notes?.trim() || null,
    images,
    variants,
  }
}

export const saveProcurement = async (p) => {
  const sb = need()
  const row = procurementToRow(p)
  // Клиентская валидация (UX); сервер (constraints) — авторитет.
  if (!row.supplier_id) throw new Error('SUPPLIER_REQUIRED')
  if (!row.product_code) throw new Error('SKU_REQUIRED')
  if (!row.product_name) throw new Error('TITLE_REQUIRED')
  if (!row.purchase_date) throw new Error('DATE_REQUIRED')
  if (!(row.quantity > 0)) throw new Error('QUANTITY_INVALID')
  if (row.purchase_unit_price == null || row.purchase_unit_price < 0) throw new Error('PURCHASE_PRICE_INVALID')
  if (row.planned_sale_unit_price != null && row.planned_sale_unit_price < 0) throw new Error('SALE_PRICE_INVALID')

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

// Перенос закупки в «Товары»: создаёт ЧЕРНОВИК товара или линкует к существующему
// (идемпотентно, атомарно на сервере). Закупочная цена в товар НЕ попадает.
export const promoteToProduct = async (procurementId) => {
  const sb = need()
  const { data, error } = await sb.rpc('promote_procurement_to_product', { p_id: procurementId })
  if (error) throw error
  const res = Array.isArray(data) ? data[0] : data
  audit(res?.created ? 'PROCUREMENT_TO_PRODUCT' : 'PROCUREMENT_LINKED_EXISTING_PRODUCT',
    `Закупка перенесена в товары (${res?.created ? 'создан черновик' : 'связан существующий'})`,
    { procurement_id: procurementId, product_id: res?.product_id || null })
  return res
}

const missingFn = (error) => error?.code === 'PGRST202'
  || /Could not find the function|does not exist/i.test(error?.message || '')

// Архивирование (soft-delete): факт закупки сохраняется, история цела. Через
// server RPC (is_admin + аудит). Fallback на прямой update — на случай, если
// procurement-archive-delete.sql ещё не применён (чтобы архив продолжал работать).
export const archiveProcurement = async (id) => {
  const sb = need()
  const { error } = await sb.rpc('archive_procurement', { p_id: id })
  if (error) {
    if (missingFn(error)) {
      const { error: e2 } = await sb.from('procurements').update({ archived: true }).eq('id', id)
      if (e2) throw e2
      audit('PROCUREMENT_ARCHIVED', 'Закупка перенесена в архив', { id })
      return
    }
    throw error
  }
}

// Восстановление из архива (archived=false). Данные/связи не меняются.
export const restoreProcurement = async (id) => {
  const sb = need()
  const { error } = await sb.rpc('restore_procurement', { p_id: id })
  if (error) {
    if (missingFn(error)) {
      const { error: e2 } = await sb.from('procurements').update({ archived: false }).eq('id', id)
      if (e2) throw e2
      audit('PROCUREMENT_RESTORED', 'Закупка восстановлена из архива', { id })
      return
    }
    throw error
  }
}

// Физическое удаление — ТОЛЬКО через server RPC (сервер сам проверяет связи и
// is_admin; фронт не решает). Связанную с товаром закупку сервер отклонит
// (PROCUREMENT_LINKED). Без миграции — понятная ошибка (не «тихий» прямой delete).
export const deleteProcurement = async (id) => {
  const sb = need()
  const { error } = await sb.rpc('delete_procurement', { p_id: id })
  if (error) {
    if (/PROCUREMENT_LINKED/.test(error.message || '')) throw new Error('PROCUREMENT_LINKED')
    if (missingFn(error)) throw new Error('DELETE_RPC_MISSING')
    throw error
  }
}

// Аналитика за период — server-trusted RPC (реальные суммы, без фейка).
export const procurementAnalytics = async (from, to) => {
  const sb = need()
  const { data, error } = await sb.rpc('procurement_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data || {}
}
