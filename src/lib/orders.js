import { supabase } from './supabase.js'

// ============================================================
//  Sifarişlər — bazaya yazılır, WhatsApp-a yönləndirmə yoxdur
// ============================================================

export const createOrder = async ({ buyer, lines, email = null }) => {
  if (!supabase) throw new Error('NO_DB')

  // Brauzer yalnız id, ölçü və sayı göndərir — qiyməti baza özü qoyur
  const items = lines.map(({ item, product }) => ({
    product_id: product.id,
    size: item.size || '',
    qty: item.qty,
  }))

  const { data, error } = await supabase.rpc('place_order', {
    p_customer_name: buyer.name.trim(),
    p_phone: buyer.phone.trim(),
    p_phone_call: buyer.phoneCall?.trim() || null,
    p_email: email || buyer.email?.trim() || null,
    p_address: buyer.address.trim(),
    p_note: buyer.note?.trim() || null,
    p_items: items,
  })

  if (error) throw error
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
