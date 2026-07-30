import { useState } from 'react'

// Şəkil yüklənməsə, məhsul adı ilə zərif bir placeholder göstərilir.
// eager — yalnız ekranın İLK (LCP) şəkli üçün: gecikmədən yüklənsin.
// Qeyd: React 18 camelCase `fetchPriority`-ni tanımır, ona görə atribut
// kiçik hərflərlə (`fetchpriority`) yazılır.
export default function ProductImage({ product, eager = false }) {
  const [failed, setFailed] = useState(false)

  const gradient = product.colors && product.colors.length
    ? `linear-gradient(135deg, ${product.colors[0]}, ${product.colors[product.colors.length - 1]})`
    : 'linear-gradient(135deg, #e8d9f2, #f3e0d0)'

  if (failed || !product.image) {
    return (
      <div className="product-fallback" style={{ background: gradient }}>
        <span>{product.name}</span>
      </div>
    )
  }

  return (
    <img
      src={product.image}
      alt={product.name}
      loading={eager ? 'eager' : 'lazy'}
      fetchpriority={eager ? 'high' : undefined}
      decoding={eager ? 'sync' : 'async'}
      onError={() => setFailed(true)}
    />
  )
}
