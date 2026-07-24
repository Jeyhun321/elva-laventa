import { useState } from 'react'

// Şəkil yüklənməsə, məhsul adı ilə zərif bir placeholder göstərilir.
export default function ProductImage({ product }) {
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
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
