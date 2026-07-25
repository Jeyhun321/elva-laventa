// ============================================================
//  Şəkildən əsas rəngləri təyin edir (avtomatik)
//  File və ya URL qəbul edir, hex rənglər massivi qaytarır.
// ============================================================

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')

const dist = (a, b) =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)

const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    let objUrl = null
    img.onload = () => resolve({ img, objUrl })
    img.onerror = reject
    if (typeof source === 'string') {
      img.crossOrigin = 'anonymous' // canvas «zəhərlənməsin»
      img.src = source
    } else {
      objUrl = URL.createObjectURL(source)
      img.src = objUrl
    }
  })

export async function extractColors(source, count = 8, minDist = 32) {
  const { img, objUrl } = await loadImage(source)
  try {
    const W = 72, H = 72
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, W, H)

    let data
    try {
      data = ctx.getImageData(0, 0, W, H).data
    } catch {
      return [] // CORS — pikselləri oxumaq olmur
    }

    // Rəngləri qruplaşdırırıq (kvantlaşdırma)
    const buckets = new Map()
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue // şəffaf
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (r > 240 && g > 240 && b > 240) continue // ağ fon
      const key = `${Math.round(r / 26)},${Math.round(g / 26)},${Math.round(b / 26)}`
      const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }
      e.n++; e.r += r; e.g += g; e.b += b
      buckets.set(key, e)
    }

    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
    const picked = []
    for (const e of sorted) {
      const c = {
        r: Math.round(e.r / e.n),
        g: Math.round(e.g / e.n),
        b: Math.round(e.b / e.n),
      }
      // əvvəlkilərdən kifayət qədər fərqlənsin
      if (picked.every((p) => dist(p, c) > minDist)) picked.push(c)
      if (picked.length >= count) break
    }
    return picked.map((c) => toHex(c.r, c.g, c.b))
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl)
  }
}
