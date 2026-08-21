import { adminSupabase } from '../lib/supabase.js'
import { logSystemEvent } from '../lib/systemLogs.js'

// Этот модуль выполняет операции только из /admin, поэтому использует
// отдельную сессию и не меняет аккаунт, которым клиент вошёл в магазин.
const supabase = adminSupabase

// ============================================================
//  Admin paneli üçün baza əməliyyatları.
//  Yazma yalnız daxil olmuş istifadəçiyə icazəlidir (RLS).
// ============================================================

export const BUCKET = 'product-images'

const need = () => {
  if (!supabase) throw new Error('Supabase bağlantısı yoxdur')
  return supabase
}

// Baza sətri → panelin gözlədiyi forma
export const fromRow = (r) => ({
  id: r.id,
  code: r.code || '',
  brand: r.brand,
  name: r.name,
  description: r.description || { az: '', ru: '', en: '' },
  category: r.category_id,
  price: String(r.price ?? ''),
  oldPrice: r.old_price == null ? '' : String(r.old_price),
  image: r.image || '',
  images: r.images?.length ? r.images : (r.image ? [r.image] : []),
  colors: r.colors || [],
  sizes: r.sizes || [],
  rating: r.rating ?? 5,
  reviews: r.reviews ?? 0,
  tag: r.tag || '',
  isActive: r.is_active !== false,
  // Prioritet məhsul (axtarışda yuxarı). Sütun yoxdursa → false.
  isFeatured: r.is_featured === true,
  // Rəng variantları: eyni kodlu məhsullar bir qrupdur
  colorName: r.color_name || '',
  colorHex: r.color_hex || '',
  isDefaultColor: r.is_default_color === true,
  inStock: r.in_stock !== false,
})

// Panel forması → baza sətri
const toRow = (p) => {
  const az = (p.name.az || '').trim()
  const images = [...new Set((p.images || [p.image]).map((image) => (image || '').trim()).filter(Boolean))]
  return {
    // boş buraxsan, baza özü kod verir (1000 + id)
    code: (p.code || '').trim() || null,
    brand: (p.brand || '').trim() || 'Elva LaVenta',
    name: {
      az,
      ru: (p.name.ru || '').trim() || az,
      en: (p.name.en || '').trim() || az,
    },
    description: {
      az: (p.description.az || '').trim(),
      ru: (p.description.ru || '').trim() || (p.description.az || '').trim(),
      en: (p.description.en || '').trim() || (p.description.az || '').trim(),
    },
    category_id: p.category,
    price: Number(p.price) || 0,
    old_price: p.oldPrice === '' || p.oldPrice == null ? null : Number(p.oldPrice),
    image: images[0] || '',
    images,
    colors: (p.colors || []).filter(Boolean),
    sizes: (p.sizes || []).length ? p.sizes : ['One size'],
    rating: Number(p.rating) || 5,
    reviews: Number(p.reviews) || 0,
    tag: p.tag || null,
    is_active: p.isActive !== false,
    is_featured: p.isFeatured === true,
    // Rəng variantı. Boş color_name = adi məhsul (variant yoxdur).
    // Əsas rəngi baza özü tənzimləyir (products_zdefault_color triggeri).
    color_name: (p.colorName || '').trim(),
    color_hex: (p.colorHex || '').trim() || (p.colors || [])[0] || '',
    is_default_color: p.isDefaultColor === true,
    in_stock: p.inStock !== false,
  }
}

export const loadAll = async () => {
  const sb = need()
  const [{ data: products, error: pe }, { data: categories, error: ce }] = await Promise.all([
    sb.from('products').select('*').order('id'),
    sb.from('categories').select('*').order('sort_order'),
  ])
  if (pe) throw pe
  if (ce) throw ce
  return {
    products: (products || []).map(fromRow),
    categories: categories || [],
  }
}

const runSave = async (sb, id, row) => {
  // id yoxdursa — yeni məhsul (id-ni baza özü verir)
  const query = id
    ? sb.from('products').update(row).eq('id', id).select().single()
    : sb.from('products').insert(row).select().single()
  const { data, error } = await query
  if (error) throw error
  return fromRow(data)
}

// PostgREST: sütun sxemdə yoxdursa "Could not find the 'x' column" qaytarır.
const isMissingColumn = (error, col) =>
  error?.code === 'PGRST204' || new RegExp(`'${col}'.*column|column.*'${col}'`, 'i').test(error?.message || '')

export const saveProduct = async (p) => {
  const sb = need()
  const row = toRow(p)
  try {
    return await runSave(sb, p.id, row)
  } catch (error) {
    // `is_featured` miqrasiyası hələ işə salınmayıbsa, saxlama pozulmasın —
    // həmin sahə olmadan təkrar cəhd (graceful degrade; product-featured.sql).
    if (isMissingColumn(error, 'is_featured')) {
      const { is_featured, ...rest } = row
      return await runSave(sb, p.id, rest)
    }
    throw error
  }
}

export const deleteProduct = async (id) => {
  const sb = need()
  const { error } = await sb.from('products').delete().eq('id', id)
  if (error) throw error
}

// Şəkli Supabase Storage-a yükləyir və ictimai linki qaytarır
export const uploadImage = async (file) => {
  const sb = need()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safe = (file.name.replace(/\.[^.]+$/, '') || 'foto')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'foto'
  const path = `${Date.now()}-${safe}.${ext}`

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false })

  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error('BUCKET_MISSING')
    }
    throw error
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// --- Autentifikasiya ---
export const signIn = async (email, password) => {
  const sb = need()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export const signOutAdmin = async () => {
  if (supabase) await supabase.auth.signOut()
}

// ============================================================
//  Промокоды / купоны (единый discount-движок, RLS: только is_admin)
// ============================================================

export const promoFromRow = (r) => ({
  id: r.id,
  code: r.code || '',
  type: r.type || 'campaign',
  discount_type: r.discount_type || 'percent',
  discount_value: r.discount_value == null ? '' : String(r.discount_value),
  active: r.active !== false,
  starts_at: r.starts_at || '',
  expires_at: r.expires_at || '',
  max_total_uses: r.max_total_uses == null ? '' : String(r.max_total_uses),
  max_uses_per_account: r.max_uses_per_account == null ? '' : String(r.max_uses_per_account),
  minimum_order_amount: r.minimum_order_amount == null ? '' : String(r.minimum_order_amount),
  assigned_account_id: r.assigned_account_id || '',
  source: r.source || 'manual',
  created_at: r.created_at,
})

const promoToRow = (p) => {
  const num = (v) => (v === '' || v == null ? null : Number(v))
  const iso = (v) => (v ? new Date(v).toISOString() : null)
  return {
    code: (p.code || '').trim().toUpperCase(),
    type: p.type === 'individual' ? 'individual' : 'campaign',
    discount_type: p.discount_type === 'fixed' ? 'fixed' : 'percent',
    discount_value: Number(p.discount_value) || 0,
    active: p.active !== false,
    starts_at: iso(p.starts_at),
    expires_at: iso(p.expires_at),
    max_total_uses: num(p.max_total_uses),
    max_uses_per_account: num(p.max_uses_per_account),
    minimum_order_amount: num(p.minimum_order_amount),
    assigned_account_id: p.type === 'individual' ? (p.assigned_account_id || null) : null,
    source: p.source === 'wheel' ? 'wheel' : 'manual',
  }
}

export const listPromos = async () => {
  const sb = need()
  const { data, error } = await sb
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(promoFromRow)
}

// Использования по каждому промокоду (для колонки "использовано")
export const promoUsageCounts = async () => {
  const sb = need()
  const { data, error } = await sb.from('promo_redemptions').select('promo_id')
  if (error) return {}
  const counts = {}
  for (const r of data || []) counts[r.promo_id] = (counts[r.promo_id] || 0) + 1
  return counts
}

export const savePromo = async (p) => {
  const sb = need()
  const row = promoToRow(p)
  if (!row.code) throw new Error('CODE_REQUIRED')
  if (row.type === 'individual' && !row.assigned_account_id) throw new Error('ACCOUNT_REQUIRED')
  const query = p.id
    ? sb.from('promo_codes').update(row).eq('id', p.id).select().single()
    : sb.from('promo_codes').insert(row).select().single()
  const { data, error } = await query
  if (error) throw error
  return promoFromRow(data)
}

export const deletePromo = async (id) => {
  const sb = need()
  const { error } = await sb.from('promo_codes').delete().eq('id', id)
  if (error) throw error
}

// Генерация уникального кода на сервере (не голый random)
export const generatePromoCode = async (prefix = 'VIP') => {
  const sb = need()
  const { data, error } = await sb.rpc('generate_promo_code', { p_prefix: prefix })
  if (error) throw error
  return data
}

// Список клиентов для привязки individual-кода — из заказов (admin RLS разрешает).
// Дедуп по user_id; берём имя и email из последнего заказа клиента.
export const listOrderCustomers = async () => {
  const sb = need()
  const { data, error } = await sb
    .from('orders')
    .select('user_id, customer_name, email, created_at')
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) return []
  const seen = new Map()
  for (const o of data || []) {
    if (!o.user_id || seen.has(o.user_id)) continue
    seen.set(o.user_id, { id: o.user_id, name: o.customer_name || '', email: o.email || '' })
  }
  return [...seen.values()]
}

// UUID v-agnostic формат (8-4-4-4-12 hex). Клиентская проверка — только для UX;
// существование пользователя подтверждает сервер (admin_find_user, is_admin-gated).
export const isUuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '').trim())

// Поиск пользователя по его User ID (UUID) для привязки индивидуального промокода.
// Доверять фронту нельзя: реальную проверку (is_admin + существование) делает RPC
// admin_find_user (SECURITY DEFINER). Бросает 'INVALID_USER_ID' / 'USER_NOT_FOUND'.
export const findUserById = async (rawId) => {
  const sb = need()
  const id = String(rawId || '').trim()
  if (!isUuid(id)) throw new Error('INVALID_USER_ID')
  const { data, error } = await sb.rpc('admin_find_user', { p_id: id })
  if (error) {
    if (/INVALID_USER_ID/.test(error.message || '')) throw new Error('INVALID_USER_ID')
    if (/USER_NOT_FOUND/.test(error.message || '')) throw new Error('USER_NOT_FOUND')
    throw error
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id) throw new Error('USER_NOT_FOUND')
  return { id: row.id, email: row.email || '', name: row.full_name || '' }
}

// ============================================================
//  Wheel of Fortune — конфигурация (singleton id=1, RLS: только is_admin)
// ============================================================

export const getWheelConfig = async () => {
  const sb = need()
  const { data, error } = await sb.from('wheel_config').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  return data
}

export const saveWheelConfig = async (cfg) => {
  const sb = need()
  const row = {
    enabled: cfg.enabled !== false,
    timezone: (cfg.timezone || 'Asia/Baku').trim(),
    windows: Array.isArray(cfg.windows) ? cfg.windows : [],
    tolerance_minutes: Number(cfg.tolerance_minutes) || 0,
    rewards: Array.isArray(cfg.rewards) ? cfg.rewards : [],
    reward_expiry_hours: Number(cfg.reward_expiry_hours) || 24,
    max_spins_per_window: Number(cfg.max_spins_per_window) || 1,
  }
  const { data, error } = await sb.from('wheel_config').update(row).eq('id', 1).select().single()
  if (error) throw error
  return data
}

// ============================================================
//  Пользователи (Admin Users module)
//  Список пользователей приходит ТОЛЬКО из security-definer RPC admin_list_users(),
//  которая на сервере проверяет is_admin() и возвращает whitelist безопасных полей.
//  auth.users напрямую из браузера НЕ читается; паролей/токенов здесь нет.
// ============================================================

export const listUsers = async () => {
  const sb = need()
  const { data, error } = await sb.rpc('admin_list_users')
  if (error) throw error
  return (data || []).map((u) => ({
    id: u.id,
    email: u.email || '',
    name: u.full_name || '',
    role: u.role || 'customer',
    emailVerified: Boolean(u.email_verified),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
    ordersCount: Number(u.orders_count) || 0,
    promoCount: Number(u.promo_count) || 0,
  }))
}

// Маскируем email для безопасного аудита (без полного PII в логах).
const maskEmail = (e) => {
  const [u, d] = String(e).split('@')
  if (!d) return '***'
  return `${u.slice(0, 2)}***@${d}`
}

// Безопасный сброс пароля: НЕ показывает и НЕ задаёт пароль. Отправляет
// стандартное Supabase recovery-письмо на email пользователя — он сам ставит
// новый пароль по ссылке (страница /reset). service_role НЕ используется.
// UI показывает успех ТОЛЬКО при реальном успехе API (ошибка пробрасывается).
export const sendUserPasswordReset = async (email) => {
  const sb = need()
  const clean = String(email || '').trim()
  if (!clean) throw new Error('EMAIL_REQUIRED')
  const redirectTo = window.location.origin + import.meta.env.BASE_URL + 'reset'
  const { error } = await sb.auth.resetPasswordForEmail(clean, { redirectTo })
  // Аудит в System Logs (без recovery-token): факт запроса, маскированный email,
  // результат и безопасный код ошибки. ВНИМАНИЕ: успех здесь = «API принял запрос»,
  // фактическая доставка письма зависит от Supabase Email/SMTP настроек.
  void logSystemEvent({
    level: error ? 'warning' : 'info',
    source: 'auth',
    event: error ? 'PASSWORD_RESET_FAILED' : 'PASSWORD_RESET_REQUESTED',
    message: `Password recovery ${error ? 'failed' : 'requested'} for ${maskEmail(clean)}`,
    details: { ok: !error, status: error?.status || null },
  })
  if (error) throw error
  return true
}
