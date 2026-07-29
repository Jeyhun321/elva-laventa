import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase.js'
import { logSystemEvent } from '../lib/systemLogs.js'
import localCatalog from '../data/catalog.json'

const CatalogContext = createContext(null)

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
})

const ALL = { id: 'all', label: { az: 'Hamısı', ru: 'Все', en: 'All' } }

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
  const [products, setProducts] = useState(
    localCatalog.products.map((p) => ({ ...p, code: p.code || makeCode(p.id) }))
  )
  const [categories, setCategories] = useState(localCatalog.categories)
  const [loading, setLoading] = useState(isConfigured)
  const [source, setSource] = useState('local')

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

  const value = useMemo(() => ({
    products,
    categories,
    loading,
    source,
    reload: load,
    getProduct: (id) => products.find((p) => p.id === Number(id)),
    saleProducts: products.filter((p) => p.oldPrice),
    priceBounds: () => {
      if (!products.length) return { min: 0, max: 0 }
      const prices = products.map((p) => p.price)
      return { min: Math.min(...prices), max: Math.max(...prices) }
    },
  }), [products, categories, loading, source, load])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}

export const discountPercent = (p) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
