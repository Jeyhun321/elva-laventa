import { supabase } from './supabase.js'
import { logSystemEvent } from './systemLogs.js'

// Sifariş üçün GİRİŞ kifayətdir — Google, ya e-poçt, fərqi yoxdur.
// place_order bazada auth.uid() yazır, deməli sessiya mütləqdir.

// ============================================================
//  Sifarişlər — bazaya yazılır, WhatsApp-a yönləndirmə yoxdur
// ============================================================

export const createOrder = async ({ buyer, lines, email = null, promoCode = null, deliveryType = 'standard' }) => {
  if (!supabase) throw new Error('NO_DB')

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) throw new Error('AUTH_REQUIRED')

  // Brauzer yalnız id, ölçü və sayı göndərir — qiyməti baza özü qoyur
  const items = lines.map(({ item, product }) => ({
    product_id: product.id,
    size: item.size || '',
    qty: item.qty,
  }))

  const type = deliveryType === 'express' ? 'express' : 'standard'
  const userNote = buyer.note?.trim() || null
  const code = promoCode ? String(promoCode).trim() : null

  // 9-арг place_order: промокод И тип доставки проверяются/считаются на сервере
  // (trusted). Клиент присылает только код и тип — стоимость доставки, скидку и
  // итог считает БД. delivery_type/delivery_fee/total сохраняются в заказе.
  const { data, error } = await supabase.rpc('place_order', {
    p_customer_name: buyer.name.trim(),
    p_phone: buyer.phone.trim(),
    p_phone_call: buyer.phoneCall?.trim() || null,
    p_email: email || buyer.email?.trim() || null,
    p_address: buyer.address.trim(),
    p_note: userNote,
    p_items: items,
    p_promo_code: code,
    p_delivery_type: type,
  })

  if (error) {
    // ПЕРЕХОДНЫЙ период: если 9-арг сигнатура ещё не применена в БД, PostgREST
    // вернёт PGRST202 («не найдена функция»). Не ломаем checkout — откатываемся к
    // 8-арг версии, дополнив note строкой доставки (структурного поля ещё нет).
    const missing = error.code === 'PGRST202'
      || /Could not find the function|place_order\(.*p_delivery_type/i.test(error.message || '')
    if (missing) {
      const deliveryNote = type === 'express' ? 'Çatdırılma: Ekspress (+7 ₼)' : 'Çatdırılma: Standart'
      const composedNote = [userNote, deliveryNote].filter(Boolean).join('\n')
      const { data: d2, error: e2 } = await supabase.rpc('place_order', {
        p_customer_name: buyer.name.trim(),
        p_phone: buyer.phone.trim(),
        p_phone_call: buyer.phoneCall?.trim() || null,
        p_email: email || buyer.email?.trim() || null,
        p_address: buyer.address.trim(),
        p_note: composedNote,
        p_items: items,
        p_promo_code: code,
      })
      if (!e2) return Array.isArray(d2) ? d2[0] : d2
    }
    void logSystemEvent({
      source: 'checkout',
      event: 'order_rpc_failed',
      message: error.message || 'Не удалось создать заказ',
      details: { code: error.code || null, line_count: Array.isArray(lines) ? lines.length : 0 },
    })
    throw error
  }
  // rpc bir sətir qaytarır: { order_no, order_id }
  return Array.isArray(data) ? data[0] : data
}

// Admin: sifarişlərin siyahısı
export const listOrders = async (client = supabase) => {
  if (!client) throw new Error('NO_DB')
  const { data, error } = await client
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const setOrderStatus = async (id, status, client = supabase) => {
  if (!client) throw new Error('NO_DB')
  const { error } = await client.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

// Müştəri: öz sifarişləri
export const myOrders = async () => {
  if (!supabase) throw new Error('NO_DB')
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
