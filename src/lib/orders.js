import { supabase } from './supabase.js'

// ============================================================
//  Sifarişlər — bazaya yazılır, WhatsApp-a yönləndirmə yoxdur
// ============================================================

export const createOrder = async ({ buyer, lines, userId = null, email = null }) => {
  if (!supabase) throw new Error('NO_DB')

  const total = lines.reduce((s, l) => s + l.product.price * l.item.qty, 0)

  const { data: order, error: oe } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      customer_name: buyer.name.trim(),
      phone: buyer.phone.trim(),
      phone_call: buyer.phoneCall?.trim() || null,
      email: email || buyer.email?.trim() || null,
      address: buyer.address.trim(),
      note: buyer.note?.trim() || null,
      total,
    })
    .select()
    .single()

  if (oe) throw oe

  const items = lines.map(({ item, product }) => ({
    order_id: order.id,
    product_id: product.id,
    product_code: product.code || '',
    product_name: product.name?.az || '',
    size: item.size || null,
    qty: item.qty,
    price: product.price,
  }))

  const { error: ie } = await supabase.from('order_items').insert(items)
  if (ie) throw ie

  return order
}

// Admin: sifarişlərin siyahısı
export const listOrders = async () => {
  if (!supabase) throw new Error('NO_DB')
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const setOrderStatus = async (id, status) => {
  if (!supabase) throw new Error('NO_DB')
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
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
