import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

const normaliseCart = (items) => items
  .map((item) => ({
    id: Number(item.id ?? item.product_id),
    size: item.size || null,
    qty: Math.max(1, Math.min(20, Number(item.qty ?? item.quantity) || 1)),
  }))
  .filter((item) => Number.isFinite(item.id))

const normaliseFavorites = (items) => items
  .map((item) => Number(item.id ?? item.product_id ?? item))
  .filter(Number.isFinite)

export function ShopProvider({ children }) {
  const { user, isSignedIn, loading } = useAuth()
  const accountId = isSignedIn ? user?.id : null
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
    save(accountKey(CART_KEY_PREFIX, id), next)
  }, [storageId])

  const cacheFavorites = useCallback((next, id = storageId) => {
    save(accountKey(FAV_KEY_PREFIX, id), next)
  }, [storageId])

  // Köhnə qonaq açarlarını bir dəfə silirik (bax: clearLegacyGuestData)
  useEffect(() => { clearLegacyGuestData() }, [])

  useEffect(() => {
    let cancelled = false

    if (loading) return undefined

    // Girişsiz alıcının səbəti YOXDUR — hər şey boşdur.
    if (!accountId) {
      setCart([])
      setFavorites([])
      setLoadedAccountId(null)
      return undefined
    }

    const cachedCart = normaliseCart(load(accountKey(CART_KEY_PREFIX, accountId), []))
    const cachedFavorites = normaliseFavorites(load(accountKey(FAV_KEY_PREFIX, accountId), []))

    setCart(cachedCart)
    setFavorites(cachedFavorites)
    setLoadedAccountId(null)

    const syncAccount = async () => {
      if (!supabase) {
        if (cancelled) return
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
      let nextFavorites = cachedFavorites

      if (!cartResult.error) {
        const remoteCart = normaliseCart(cartResult.data || [])
        // Bazadakı səbət əsasdır; boşdursa, brauzerdəki nüsxə götürülür.
        nextCart = remoteCart.length ? remoteCart : cachedCart

        // Baza boş idisə, brauzerdəki nüsxəni ora köçürürük.
        const mustPush = !remoteCart.length && cachedCart.length > 0
        if (mustPush && nextCart.length) {
          await supabase.from('customer_cart_items').upsert(
            nextCart.map((item) => ({
              user_id: accountId,
              product_id: item.id,
              size: item.size || '',
              quantity: item.qty,
            })),
            { onConflict: 'user_id,product_id,size' }
          )
        }
      }

      if (!favoritesResult.error) {
        const remoteFavorites = normaliseFavorites(favoritesResult.data || [])
        nextFavorites = remoteFavorites.length ? remoteFavorites : cachedFavorites

        const mustPush = !remoteFavorites.length && cachedFavorites.length > 0
        if (mustPush && nextFavorites.length) {
          await supabase.from('customer_favorites').upsert(
            nextFavorites.map((productId) => ({ user_id: accountId, product_id: productId })),
            { onConflict: 'user_id,product_id' }
          )
        }
      }

      if (cancelled) return
      setCart(nextCart)
      setFavorites(nextFavorites)
      cacheCart(nextCart, accountId)
      cacheFavorites(nextFavorites, accountId)

      setLoadedAccountId(accountId)
    }

    void syncAccount()
    return () => { cancelled = true }
  }, [accountId, cacheCart, cacheFavorites, loading])

  // Səbəti yalnız GİRİŞ ETMİŞ alıcı dəyişə bilər.
  // Həm də sinxronizasiya bitməlidir ki, yerli və uzaq səbət toqquşmasın.
  const canChangeShop = Boolean(!loading && accountId && loadedAccountId === accountId)

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

  const toggleFavorite = useCallback((id) => {
    // TƏK YOXLAMA NÖQTƏSİ — sevimlilər üçün
    if (!isSignedIn) {
      setAuthPrompt('favorite')
      return false
    }
    if (!canChangeShop) return false
    const productId = Number(id)
    const isNowFavorite = !favorites.includes(productId)
    const next = isNowFavorite
      ? [...favorites, productId]
      : favorites.filter((entry) => entry !== productId)

    setFavorites(next)
    cacheFavorites(next)
    if (syncsToDatabase) {
      if (isNowFavorite) {
        void supabase.from('customer_favorites').upsert(
          { user_id: accountId, product_id: productId },
          { onConflict: 'user_id,product_id' }
        )
      } else {
        void supabase.from('customer_favorites')
          .delete()
          .eq('user_id', accountId)
          .eq('product_id', productId)
      }
    }
    return true
  }, [accountId, cacheFavorites, canChangeShop, favorites, isSignedIn])

  const isFavorite = useCallback((id) => favorites.includes(Number(id)), [favorites])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])

  return (
    <ShopContext.Provider value={{
      cart,
      favorites,
      addToCart,
      removeFromCart,
      setQty,
      clearCart,
      toggleFavorite,
      isFavorite,
      cartCount,
      favCount: favorites.length,
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
