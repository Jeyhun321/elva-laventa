import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'

const ShopContext = createContext(null)

const CART_KEY_PREFIX = 'elva_cart:'
const FAV_KEY_PREFIX = 'elva_favorites:'

const accountKey = (prefix, accountId) => `${prefix}${accountId}`

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function ShopProvider({ children }) {
  const { user, isGoogleUser, loading } = useAuth()
  const accountId = isGoogleUser ? user?.id : null
  // cart: [{ id, size, qty }]
  const [cart, setCart] = useState([])
  // favorites: [id, id, ...]
  const [favorites, setFavorites] = useState([])
  // Protects the next account from receiving the previous account's state
  // during the short React update between two sessions.
  const [loadedAccountId, setLoadedAccountId] = useState(null)

  useEffect(() => {
    if (loading) return

    if (!accountId) {
      setCart([])
      setFavorites([])
      setLoadedAccountId(null)
      return
    }

    setCart(load(accountKey(CART_KEY_PREFIX, accountId), []))
    setFavorites(load(accountKey(FAV_KEY_PREFIX, accountId), []))
    setLoadedAccountId(accountId)
  }, [accountId, loading])

  useEffect(() => {
    if (!accountId || loadedAccountId !== accountId) return
    localStorage.setItem(accountKey(CART_KEY_PREFIX, accountId), JSON.stringify(cart))
  }, [accountId, cart, loadedAccountId])

  useEffect(() => {
    if (!accountId || loadedAccountId !== accountId) return
    localStorage.setItem(accountKey(FAV_KEY_PREFIX, accountId), JSON.stringify(favorites))
  }, [accountId, favorites, loadedAccountId])

  const addToCart = useCallback((id, size = null, qty = 1) => {
    if (!accountId || !isGoogleUser || loading) return false
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === id && i.size === size)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + qty }
        return next
      }
      return [...prev, { id, size, qty }]
    })
    return true
  }, [accountId, isGoogleUser, loading])

  const removeFromCart = useCallback((id, size = null) => {
    setCart((prev) => prev.filter((i) => !(i.id === id && i.size === size)))
  }, [])

  const setQty = useCallback((id, size, qty) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id && i.size === size ? { ...i, qty } : i))
        .filter((i) => i.qty > 0)
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites])

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.qty, 0),
    [cart]
  )

  const value = {
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
    canShop: isGoogleUser && !loading,
  }

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}
