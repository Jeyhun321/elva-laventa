import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const ShopContext = createContext(null)

// The cache makes the interface feel instant. The source of truth is Supabase,
// so a signed-in customer's cart and favourites follow their account.
const CART_KEY_PREFIX = 'elva_cart:'
const FAV_KEY_PREFIX = 'elva_favorites:'

// Qonaq (girişsiz) alıcı da səbətdən istifadə edə bilər. Onun səbəti
// yalnız brauzerdə saxlanılır; giriş edəndə hesabın səbətinə birləşdirilir.
const GUEST_ID = 'guest'

const accountKey = (prefix, accountId) => `${prefix}${accountId}`

const cartLineKey = (item) => `${item.id}|${item.size || ''}`

// Eyni məhsul + eyni ölçü olarsa, sayları TOPLAYIRIQ (dublikat sətir yaranmır).
// Olmayanlar sadəcə əlavə olunur. Maksimum say 20-dir.
const mergeCarts = (base, extra) => {
  const result = base.map((item) => ({ ...item }))
  const index = new Map(result.map((item, i) => [cartLineKey(item), i]))

  extra.forEach((item) => {
    const key = cartLineKey(item)
    if (index.has(key)) {
      const target = result[index.get(key)]
      target.qty = Math.min(20, target.qty + item.qty)
    } else {
      index.set(key, result.length)
      result.push({ ...item })
    }
  })

  return result
}

const mergeFavorites = (base, extra) => [...new Set([...base, ...extra])]

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
  const { user, isGoogleUser, loading } = useAuth()
  const accountId = isGoogleUser ? user?.id : null
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loadedAccountId, setLoadedAccountId] = useState(null)

  // Girişsiz alıcı üçün "guest" açarı istifadə olunur — səbəti yenə də yadda qalır.
  const storageId = accountId || GUEST_ID

  const cacheCart = useCallback((next, id = storageId) => {
    save(accountKey(CART_KEY_PREFIX, id), next)
  }, [storageId])

  const cacheFavorites = useCallback((next, id = storageId) => {
    save(accountKey(FAV_KEY_PREFIX, id), next)
  }, [storageId])

  useEffect(() => {
    let cancelled = false

    if (loading) return undefined

    // Qonaq: səbət yalnız brauzerdən oxunur, Supabase-ə heç nə getmir.
    if (!accountId) {
      setCart(normaliseCart(load(accountKey(CART_KEY_PREFIX, GUEST_ID), [])))
      setFavorites(normaliseFavorites(load(accountKey(FAV_KEY_PREFIX, GUEST_ID), [])))
      setLoadedAccountId(GUEST_ID)
      return undefined
    }

    const cachedCart = normaliseCart(load(accountKey(CART_KEY_PREFIX, accountId), []))
    const cachedFavorites = normaliseFavorites(load(accountKey(FAV_KEY_PREFIX, accountId), []))
    // Giriş anında qonaq səbəti — hesabın səbəti ilə birləşdiriləcək
    const guestCart = normaliseCart(load(accountKey(CART_KEY_PREFIX, GUEST_ID), []))
    const guestFavorites = normaliseFavorites(load(accountKey(FAV_KEY_PREFIX, GUEST_ID), []))

    setCart(guestCart.length ? mergeCarts(cachedCart, guestCart) : cachedCart)
    setFavorites(guestFavorites.length ? mergeFavorites(cachedFavorites, guestFavorites) : cachedFavorites)
    setLoadedAccountId(null)

    const syncAccount = async () => {
      if (!supabase) {
        // Baza olmasa belə, birləşmə itməsin: nəticəni brauzerdə saxlayırıq
        // və qonaq səbətini təmizləyirik.
        if (cancelled) return
        if (guestCart.length) {
          cacheCart(mergeCarts(cachedCart, guestCart), accountId)
          save(accountKey(CART_KEY_PREFIX, GUEST_ID), [])
        }
        if (guestFavorites.length) {
          cacheFavorites(mergeFavorites(cachedFavorites, guestFavorites), accountId)
          save(accountKey(FAV_KEY_PREFIX, GUEST_ID), [])
        }
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
        const base = remoteCart.length ? remoteCart : cachedCart
        // Qonaq səbəti həmişə üstünə əlavə olunur (saylar toplanır).
        nextCart = guestCart.length ? mergeCarts(base, guestCart) : base

        // Bazaya yazmaq lazımdırsa yazırıq: ya qonaq malları gəlib,
        // ya da baza boş idi və brauzerdəki nüsxəni köçürürük.
        const mustPush = guestCart.length > 0 || (!remoteCart.length && cachedCart.length > 0)
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
        const base = remoteFavorites.length ? remoteFavorites : cachedFavorites
        nextFavorites = guestFavorites.length ? mergeFavorites(base, guestFavorites) : base

        const mustPush = guestFavorites.length > 0 || (!remoteFavorites.length && cachedFavorites.length > 0)
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

      // Birləşmə bitdi — qonaq səbətini silirik ki, növbəti girişdə
      // saylar TƏKRAR toplanmasın.
      if (guestCart.length) save(accountKey(CART_KEY_PREFIX, GUEST_ID), [])
      if (guestFavorites.length) save(accountKey(FAV_KEY_PREFIX, GUEST_ID), [])

      setLoadedAccountId(accountId)
    }

    void syncAccount()
    return () => { cancelled = true }
  }, [accountId, cacheCart, cacheFavorites, loading])

  // Qonaq da səbətdən istifadə edə bilər. Girişli alıcı üçün əvvəlki kimi
  // sinxronizasiyanın bitməsini gözləyirik ki, yerli və uzaq səbət toqquşmasın.
  const canChangeShop = loading
    ? false
    : accountId
      ? loadedAccountId === accountId
      : loadedAccountId === GUEST_ID

  // Supabase-ə yalnız girişli alıcı üçün yazırıq (qonaqda user_id yoxdur).
  const syncsToDatabase = Boolean(supabase && accountId)

  const addToCart = useCallback((id, size = null, qty = 1) => {
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
  }, [accountId, cacheCart, canChangeShop, cart])

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
  }, [accountId, cacheFavorites, canChangeShop, favorites])

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
      // Artıq qonaq da alış-veriş edə bilər; giriş yalnız sifarişin təsdiqindədir.
      canShop: !loading,
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
