import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
  // Prioritet məhsul (axtarışda yuxarı qalxır). Sütun yoxdursa → false.
  isFeatured: r.is_featured === true,
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

  // Ən son sorğu qalib gəlir. İlkin yükləmə, tab qayıdışı və realtime yeniləməsi
  // eyni state-ə yazır — köhnə (gec gələn) cavab yenisini ƏZMƏSİN deyə ardıcıllıq
  // nömrəsi saxlayırıq (fresh data → stale cache override problemi qarşısı alınır).
  const dataSeq = useRef(0)

  const applyData = useCallback((prods, cats, seq) => {
    if (seq !== dataSeq.current) return false // daha yeni sorğu artıq yazıb
    if (prods) setProducts(prods.map(fromRow))
    if (cats) setCategories([ALL, ...cats.map((c) => ({ id: c.id, label: c.label }))])
    setSource('supabase')
    return true
  }, [])

  const load = useCallback(async () => {
    if (!isConfigured || !supabase) return
    const seq = ++dataSeq.current
    setLoading(true)
    try {
      const [{ data: prods, error: pe }, { data: cats, error: ce }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('id'),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      if (pe) throw pe
      if (ce) throw ce
      applyData(prods, cats, seq)
    } catch (e) {
      // 1-ci cəhd alınmadı. Yerli fayla keçməzdən əvvəl anonim açarla təkrar yoxlayırıq —
      // beləliklə xarab sessiya vəsiqəsi ucbatından köhnə qiymətlər göstərilmir.
      try {
        const { prods, cats } = await fetchAnonCatalog()
        if (applyData(prods, cats, seq)) {
          void logSystemEvent({
            level: 'info',
            source: 'catalog',
            event: 'catalog_recovered_anon',
            message: `Каталог загружен анонимно после ошибки: ${e?.message || 'без описания'}`,
          })
        }
        return
      } catch (anonError) {
        // Yalnız bu hələ ən son sorğudursa yerli surətə keçirik (yeni cavab gəldisə toxunmuruq).
        if (seq === dataSeq.current) {
          console.warn('Kataloq bazadan yüklənmədi, yerli surət istifadə olunur:', e.message)
          setProducts(localProducts)
          setCategories(localCatalog.categories)
          setSource('local')
        }
        void logSystemEvent({
          level: 'warning',
          source: 'catalog',
          event: 'catalog_load_failed',
          message: e?.message || 'Каталог не загрузился из базы',
          details: { anonRetry: anonError?.message || 'не удалось' },
        })
      }
    } finally {
      setLoading(false)
    }
  }, [applyData])

  useEffect(() => { load() }, [load])

  // SƏSSİZ yeniləmə (loading bayrağını qaldırmadan → UI sıçramır): tab qayıdanda
  // VƏ admin realtime dəyişikliyində çağırılır. Arxa plandayıqsa keçirik — tab
  // görünəndə onsuz da yenidən çağırılır.
  const revalidate = useCallback(async () => {
    if (!isConfigured || !supabase) return
    if (document.visibilityState === 'hidden') return
    const seq = ++dataSeq.current
    try {
      const [{ data: prods, error: pe }, { data: cats, error: ce }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('id'),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      if (pe || ce) throw pe || ce
      applyData(prods, cats, seq)
    } catch {
      // Xarab sessiya vəsiqəsində anonim açarla təkrar — səssiz yeniləmədir.
      try {
        const { prods, cats } = await fetchAnonCatalog()
        applyData(prods, cats, seq)
      } catch {
        // Alınmadı — köhnə kataloq qalır, problem deyil.
      }
    }
  }, [applyData])

  // Köhnə tab problemi: istifadəçi tab-ı açıq saxlayıb, admin stoku/qiyməti dəyişir.
  // Tab yenidən görünəndə kataloqu səssiz yeniləyirik ki, stok/qiymət canlı qalsın.
  useEffect(() => {
    if (!isConfigured || !supabase) return undefined
    const onVisible = () => { if (document.visibilityState === 'visible') revalidate() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [revalidate])

  // Admin → Storefront CANLI sinxronizasiya (Supabase Realtime).
  // Admin `products`/`categories` cədvəlini dəyişdikdə açıq müştəri səhifəsi FULL
  // RELOAD OLMADAN yenilənir: dəyişiklik siqnalı gəlir → səssiz `revalidate` →
  // React yenidən render. Çoxlu ardıcıl sətir dəyişikliyi bir yeniləməyə yığılır
  // (debounce 300ms). TƏK kanal yaradılır və cleanup-da silinir → listener sızması
  // yoxdur; şəbəkə kəsilib-qoşulanda supabase-realtime özü yenidən qoşulur.
  // QEYD: bunun işləməsi üçün Supabase-də `products` (və `categories`) cədvəli
  // `supabase_realtime` publication-a əlavə olunmalıdır (bax: supabase/realtime-catalog.sql).
  useEffect(() => {
    if (!isConfigured || !supabase) return undefined
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { revalidate() }, 300)
    }
    const channel = supabase
      .channel('catalog-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, schedule)
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [revalidate])

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
