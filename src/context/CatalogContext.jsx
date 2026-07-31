import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase.js'
import { logSystemEvent } from '../lib/systemLogs.js'
import localCatalog from '../data/catalog.json'

const CatalogContext = createContext(null)

const localProducts = localCatalog.products.map((p) => ({
  ...p,
  code: p.code || String(1000 + Number(p.id)),
}))

// Baza sətrini saytın gözlədiyi formata çevirir
// Kod yoxdursa (yerli ehtiyat nüsxə), id-dən düzəldirik: 1 -> 1001
export const makeCode = (id) => String(1000 + Number(id))

const fromRow = (r) => ({
  id: r.id,
  code: r.code || makeCode(r.id),
  brand: r.brand,
  name: r.name,
  description: r.description || { az: '', ru: '', en: '' },
  category: r.category_id,
  price: Number(r.price),
  oldPrice: r.old_price == null ? null : Number(r.old_price),
  image: r.image || '',
  images: r.images?.length ? r.images : (r.image ? [r.image] : []),
  colors: r.colors || [],
  sizes: r.sizes || [],
  rating: Number(r.rating),
  reviews: r.reviews,
  tag: r.tag,
  // Rəng variantı (yeni sahələr; köhnə yerli faylda yoxdur — boş qalır)
  colorName: r.color_name || '',
  colorHex: r.color_hex || '',
  isDefaultColor: r.is_default_color === true,
  inStock: r.in_stock !== false,
})

const ALL = { id: 'all', label: { az: 'Hamısı', ru: 'Все', en: 'All' } }

// Eyni KODLU məhsullar bir məhsulun rəngləridir.
// Kataloqa hər qrupdan BİR məhsul gedir — əsas rəng.
// Hər məhsula öz qrupunun rəng siyahısı (variants) əlavə olunur.
const groupVariants = (list) => {
  const groups = new Map()
  list.forEach((p) => {
    const key = (p.code || '').trim().toUpperCase() || `id:${p.id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(p)
  })

  const withVariants = new Map() // id -> məhsul + variants
  const forCatalog = []

  groups.forEach((items) => {
    // Rəngi olan variantlar; adı olmayanlar variant sayılmır
    const named = items.filter((x) => (x.colorName || '').trim())
    const variants = named.length > 1
      ? named.map((x) => ({
          id: x.id,
          colorName: x.colorName,
          colorHex: x.colorHex || x.colors?.[0] || '',
          inStock: x.inStock,
          price: x.price,
        }))
      : []

    items.forEach((x) => withVariants.set(x.id, { ...x, variants }))

    // Kataloq üçün: əsas rəng, yoxdursa — anbarda olan ilk, yoxdursa — birinci
    const main = items.find((x) => x.isDefaultColor)
      || items.find((x) => x.inStock)
      || items[0]
    forCatalog.push(withVariants.get(main.id))
  })

  return { forCatalog, byId: withVariants }
}

// Kataloq ictimaidir — girişsiz də oxunur. İstifadəçinin sessiya "vəsiqəsi"
// xarab olarsa (məs. saat fərqi: "JWT issued at future"), bazadan oxumaq
// tamamilə dayanmasın deyə sorğunu anonim açarla təkrarlayırıq.
const fetchAnonCatalog = async () => {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  }
  const base = SUPABASE_URL.replace(/\/+$/, '')

  const [pRes, cRes] = await Promise.all([
    fetch(`${base}/rest/v1/products?select=*&is_active=eq.true&order=id`, { headers }),
    fetch(`${base}/rest/v1/categories?select=*&order=sort_order`, { headers }),
  ])

  if (!pRes.ok) throw new Error(`products HTTP ${pRes.status}`)
  if (!cRes.ok) throw new Error(`categories HTTP ${cRes.status}`)

  return { prods: await pRes.json(), cats: await cRes.json() }
}

export function CatalogProvider({ children }) {
  // Baza cavab verməsə, sayt boş qalmasın deyə yerli fayl ehtiyatdır
  const [products, setProducts] = useState(() => isConfigured ? [] : localProducts)
  const [categories, setCategories] = useState(() => isConfigured ? [] : localCatalog.categories)
  const [loading, setLoading] = useState(isConfigured)
  const [source, setSource] = useState(isConfigured ? 'loading' : 'local')

  const load = useCallback(async () => {
    if (!isConfigured || !supabase) return
    setLoading(true)
    try {
      const [{ data: prods, error: pe }, { data: cats, error: ce }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('id'),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      if (pe) throw pe
      if (ce) throw ce

      if (prods) setProducts(prods.map(fromRow))
      if (cats) {
        setCategories([ALL, ...cats.map((c) => ({ id: c.id, label: c.label }))])
      }
      setSource('supabase')
    } catch (e) {
      // 1-ci cəhd alınmadı. Yerli fayla keçməzdən əvvəl anonim açarla təkrar yoxlayırıq —
      // beləliklə xarab sessiya vəsiqəsi ucbatından köhnə qiymətlər göstərilmir.
      try {
        const { prods, cats } = await fetchAnonCatalog()
        if (prods) setProducts(prods.map(fromRow))
        if (cats) setCategories([ALL, ...cats.map((c) => ({ id: c.id, label: c.label }))])
        setSource('supabase')

        void logSystemEvent({
          level: 'info',
          source: 'catalog',
          event: 'catalog_recovered_anon',
          message: `Каталог загружен анонимно после ошибки: ${e?.message || 'без описания'}`,
        })
        return
      } catch (anonError) {
        console.warn('Kataloq bazadan yüklənmədi, yerli surət istifadə olunur:', e.message)
        setProducts(localProducts)
        setCategories(localCatalog.categories)
        void logSystemEvent({
          level: 'warning',
          source: 'catalog',
          event: 'catalog_load_failed',
          message: e?.message || 'Каталог не загрузился из базы',
          details: { anonRetry: anonError?.message || 'не удалось' },
        })
        setSource('local')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // products — bazadan gələn BÜTÜN sətirlər (hər rəng ayrıca sətirdir).
  // Kataloq isə qruplaşdırılmış siyahını görür.
  const { forCatalog, byId } = useMemo(() => groupVariants(products), [products])

  const value = useMemo(() => ({
    // Kataloq, ana səhifə, axtarış — hər məhsul BİR dəfə
    products: forCatalog,
    categories,
    loading,
    source,
    reload: load,
    // Məhsul səhifəsi konkret rəngi açır — ona görə bütün sətirlər üzrə axtarırıq
    getProduct: (id) => byId.get(Number(id)),
    saleProducts: forCatalog.filter((p) => p.oldPrice),
    priceBounds: () => {
      if (!forCatalog.length) return { min: 0, max: 0 }
      const prices = forCatalog.map((p) => p.price)
      return { min: Math.min(...prices), max: Math.max(...prices) }
    },
  }), [forCatalog, byId, categories, loading, source, load])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}

export const discountPercent = (p) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
