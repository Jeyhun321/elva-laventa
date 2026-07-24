// Məhsullar artıq catalog.json faylında saxlanılır.
// Admin panel (/admin) həmin faylı GitHub üzərindən yeniləyir.
import catalog from './catalog.json'

export const categories = catalog.categories
export const products = catalog.products

export const discountPercent = (p) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0

export const saleProducts = products.filter((p) => p.oldPrice)

export const getProduct = (id) => products.find((p) => p.id === Number(id))

export const priceBounds = () => {
  if (!products.length) return { min: 0, max: 0 }
  const prices = products.map((p) => p.price)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export const nextId = () =>
  products.reduce((max, p) => Math.max(max, p.id), 0) + 1
