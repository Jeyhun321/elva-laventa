import { supabase } from '../lib/supabase.js'

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

export const saveProduct = async (p) => {
  const sb = need()
  const row = toRow(p)

  // id yoxdursa — yeni məhsul (id-ni baza özü verir)
  const query = p.id
    ? sb.from('products').update(row).eq('id', p.id).select().single()
    : sb.from('products').insert(row).select().single()

  const { data, error } = await query
  if (error) throw error
  return fromRow(data)
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
