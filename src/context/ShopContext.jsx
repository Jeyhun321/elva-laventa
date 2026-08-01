import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const ShopContext = createContext(null)

// The cache makes the interface feel instant. The source of truth is Supabase,
// so a signed-in customer's cart and favourites follow their account.
const CART_KEY_PREFIX = 'elva_cart:'
const FAV_KEY_PREFIX = 'elva_favorites:'

// Səbət və sevimlilər YALNIZ giriş etmiş alıcı üçündür.
//
// Köhnə versiyada qonaq da səbətə əlavə edə bilirdi və giriş anında
// həmin mallar hesaba KÖÇÜRÜLÜRDÜ. Bu köçürmə sonradan gözlənilməz
// nəticə verdi: brauzerdə qalmış köhnə qonaq səbəti YENİ hesaba
// "özü-özünə" düşürdü (istifadəçi heç nə əlavə etməmişdi).
// Köçürmə ləğv edildi; köhnə açarlar isə bir dəfə təmizlənir.
const GUEST_ID = 'guest'

const clearLegacyGuestData = () => {
  try {
    localStorage.removeItem(`${CART_KEY_PREFIX}${GUEST_ID}`)
    localStorage.removeItem(`${FAV_KEY_PREFIX}${GUEST_ID}`)
  } catch {
    // Storage bağlıdırsa — problem deyil.
  }
}

const accountKey = (prefix, accountId) => `${prefix}${accountId}`


const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private browsing. Supabase still works.
  }
}

const loadOwnedCache = (key, accountId, fallback) => {
  const cached = load(key, null)
  // Previous versions stored a plain array without an owner. Never reuse such
  // data: it may belong to a different account on the same device.
  if (!cached || Array.isArray(cached) || typeof cached !== 'object') return fallback
  if (cached.accountId !== accountId || !Array.isArray(cached.items)) return fallback
  return cached.items
}

const normaliseCart = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => ({
    id: Number(item.id ?? item.product_id),
    size: item.size || null,
    qty: Math.max(1, Math.min(20, Number(item.qty ?? item.quantity) || 1)),
  }))
  .filter((item) => Number.isFinite(item.id))

const normaliseFavorites = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => Number(item.id ?? item.product_id ?? item))
  .filter(Number.isFinite)

export function ShopProvider({ children }) {
  const { user, isSignedIn, loading } = useAuth()
  const accountId = isSignedIn ? user?.id : null
  // An account may be switched A → B → A while an earlier request is still
  // pending. The user id alone is not enough to identify the current session:
  // give each activation its own token so stale A responses cannot overwrite
  // a later A session.
  const accountSessionRef = useRef({ accountId, version: 0 })
  if (accountSessionRef.current.accountId !== accountId) {
    accountSessionRef.current = {
      accountId,
      version: accountSessionRef.current.version + 1,
    }
  }
  // The latest favorite request wins within the same account too. Without this
  // sequence, an older SELECT can arrive after a DELETE and rebuild the list
  // from its earlier snapshot.
  const favoritesRequestRef = useRef(0)
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loadedAccountId, setLoadedAccountId] = useState(null)
  // Qonaq nəyəsə toxunanda "daxil olun" pəncərəsini açan siqnal.
  // Bir yerdə saxlanılır ki, hansı düymə basılmasından asılı olmayaraq
  // eyni pəncərə görünsün.
  const [authPrompt, setAuthPrompt] = useState(null) // null | 'cart' | 'favorite'
  const closeAuthPrompt = useCallback(() => setAuthPrompt(null), [])
  // Pəncərəni heç nə əlavə etmədən açmaq üçün (məs. ölçü soruşulmamışdan əvvəl)
  const promptAuth = useCallback((kind = 'cart') => setAuthPrompt(kind), [])

  // Girişsiz alıcı üçün "guest" açarı istifadə olunur — səbəti yenə də yadda qalır.
  const storageId = accountId || GUEST_ID

  const cacheCart = useCallback((next, id = storageId) => {
    save(accountKey(CART_KEY_PREFIX, id), { accountId: id, items: next })
  }, [storageId])

  // Köhnə qonaq açarlarını bir dəfə silirik (bax: clearLegacyGuestData)
  useEffect(() => { clearLegacyGuestData() }, [])

  useEffect(() => {
    let cancelled = false
    const accountSession = accountSessionRef.current
    const favoritesRequest = ++favoritesRequestRef.current

    if (loading) return undefined

    // Girişsiz alıcının səbəti YOXDUR — hər şey boşdur.
    setCart([])
    setFavorites([])
    setLoadedAccountId(null)

    if (!accountId) {
      return undefined
    }

    const cachedCart = normaliseCart(loadOwnedCache(accountKey(CART_KEY_PREFIX, accountId), accountId, []))

    setCart(cachedCart)

    const syncAccount = async () => {
      if (!supabase) {
        if (cancelled || accountSessionRef.current !== accountSession) return
        setLoadedAccountId(accountId)
        return
      }

      const [cartResult, favoritesResult] = await Promise.all([
        supabase
          .from('customer_cart_items')
          .select('product_id, size, quantity')
          .eq('user_id', accountId),
        supabase
          .from('customer_favorites')
          .select('product_id')
          .eq('user_id', accountId),
      ])

      let nextCart = cachedCart
      let nextFavorites = []

      if (!cartResult.error) {
        const remoteCart = normaliseCart(cartResult.data || [])
        nextCart = remoteCart
      }

      if (!favoritesResult.error) {
        const remoteFavorites = normaliseFavorites(favoritesResult.data || [])
        nextFavorites = remoteFavorites
      }

      if (
        cancelled
        || accountSessionRef.current !== accountSession
        || favoritesRequestRef.current !== favoritesRequest
      ) return
      setCart(nextCart)
      setFavorites(nextFavorites)
      cacheCart(nextCart, accountId)

      setLoadedAccountId(accountId)
    }

    void syncAccount()
    return () => { cancelled = true }
  }, [accountId, cacheCart, loading])

  // Səbəti yalnız GİRİŞ ETMİŞ alıcı dəyişə bilər.
  // Həm də sinxronizasiya bitməlidir ki, yerli və uzaq səbət toqquşmasın.
  const canChangeShop = Boolean(!loading && accountId && loadedAccountId === accountId)
  const accountDataReady = loadedAccountId === accountId
  const visibleCart = accountDataReady ? cart : []
  const visibleFavorites = accountDataReady ? favorites : []

  // Supabase-ə yalnız girişli alıcı üçün yazırıq (qonaqda user_id yoxdur).
  const syncsToDatabase = Boolean(supabase && accountId)

  const addToCart = useCallback((id, size = null, qty = 1) => {
    // TƏK YOXLAMA NÖQTƏSİ: girişsiz alıcı buradan keçə bilmir.
    // Hansı düymə basılırsa basılsın (kart, məhsul səhifəsi, "indi al"),
    // hamısı bu funksiyaya gəlir — deməli yan yol yoxdur.
    if (!isSignedIn) {
      setAuthPrompt('cart')
      return false
    }
    if (!canChangeShop) return false
    const productId = Number(id)
    const amount = Math.max(1, Math.min(20, Number(qty) || 1))
    const index = cart.findIndex((item) => item.id === productId && item.size === size)
    const nextCart = index === -1
      ? [...cart, { id: productId, size, qty: amount }]
      : cart.map((item, itemIndex) => (
          itemIndex === index
            ? { ...item, qty: Math.min(20, item.qty + amount) }
            : item
        ))

    setCart(nextCart)
    cacheCart(nextCart)
    if (syncsToDatabase) {
      const item = nextCart.find((entry) => entry.id === productId && entry.size === size)
      void supabase.from('customer_cart_items').upsert({
        user_id: accountId,
        product_id: productId,
        size: size || '',
        quantity: item?.qty || amount,
      }, { onConflict: 'user_id,product_id,size' })
    }
    return true
  }, [accountId, cacheCart, canChangeShop, cart, isSignedIn])

  const removeFromCart = useCallback((id, size = null) => {
    if (!canChangeShop) return false
    const productId = Number(id)
    setCart((previous) => {
      const next = previous.filter((item) => !(item.id === productId && item.size === size))
      cacheCart(next)
      return next
    })
    if (syncsToDatabase) void supabase.from('customer_cart_items')
      .delete()
      .eq('user_id', accountId)
      .eq('product_id', productId)
      .eq('size', size || '')
    return true
  }, [accountId, cacheCart, canChangeShop])

  const setQty = useCallback((id, size, qty) => {
    const amount = Number(qty)
    if (amount <= 0) return removeFromCart(id, size)
    if (!canChangeShop) return false
    const productId = Number(id)
    const safeQty = Math.min(20, amount)
    setCart((previous) => {
      const next = previous.map((item) => (
        item.id === productId && item.size === size ? { ...item, qty: safeQty } : item
      ))
      cacheCart(next)
      return next
    })
    if (syncsToDatabase) void supabase.from('customer_cart_items').upsert({
      user_id: accountId,
      product_id: productId,
      size: size || '',
      quantity: safeQty,
    }, { onConflict: 'user_id,product_id,size' })
    return true
  }, [accountId, cacheCart, canChangeShop, removeFromCart])

  const clearCart = useCallback(async () => {
    if (!canChangeShop) return false
    setCart([])
    cacheCart([])
    if (syncsToDatabase) await supabase.from('customer_cart_items').delete().eq('user_id', accountId)
    return true
  }, [accountId, cacheCart, canChangeShop])

  const toggleFavorite = useCallback(async (id) => {
    // TƏK YOXLAMA NÖQTƏSİ — sevimlilər üçün
    if (!isSignedIn) {
      setAuthPrompt('favorite')
      return false
    }
    if (!canChangeShop) return false
    const accountSession = accountSessionRef.current
    const favoritesRequest = ++favoritesRequestRef.current
    const productId = Number(id)
    const isNowFavorite = !favorites.includes(productId)

    if (!syncsToDatabase) return false

    let error
    if (isNowFavorite) {
      ({ error } = await supabase.from('customer_favorites').upsert(
        { user_id: accountId, product_id: productId },
        { onConflict: 'user_id,product_id' }
      ))
    } else {
      ({ error } = await supabase.from('customer_favorites')
        .delete()
        .eq('user_id', accountId)
        .eq('product_id', productId))
    }
    if (
      error
      || accountSessionRef.current !== accountSession
      || favoritesRequestRef.current !== favoritesRequest
    ) return false

    // A mutation is never allowed to rebuild the UI from a closure or cache.
    // Read the current account's authoritative list after a successful write.
    const { data, error: selectError } = await supabase
      .from('customer_favorites')
      .select('product_id')
      .eq('user_id', accountId)

    if (
      selectError
      || accountSessionRef.current !== accountSession
      || favoritesRequestRef.current !== favoritesRequest
    ) return false
    setFavorites(normaliseFavorites(data || []))
    return true
  }, [accountId, canChangeShop, favorites, isSignedIn, syncsToDatabase])

  const isFavorite = useCallback((id) => visibleFavorites.includes(Number(id)), [visibleFavorites])
  const cartCount = useMemo(() => visibleCart.reduce((sum, item) => sum + item.qty, 0), [visibleCart])

  return (
    <ShopContext.Provider value={{
      cart: visibleCart,
      favorites: visibleFavorites,
      addToCart,
      removeFromCart,
      setQty,
      clearCart,
      toggleFavorite,
      isFavorite,
      cartCount,
      favCount: visibleFavorites.length,
      // Alış-veriş yalnız giriş etmiş alıcı üçündür
      canShop: Boolean(!loading && isSignedIn),
      // Girişsiz cəhd olanda pəncərəni açmaq üçün
      authPrompt,
      closeAuthPrompt,
      promptAuth,
    }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}
