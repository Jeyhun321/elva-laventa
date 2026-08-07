// ============================================================
//  Ağıllı məhsul axtarışı (LAV-FEAT-Smart-Search)
//  - dəqiq deyil, həm də qismən/prefiks/alt-sətir uyğunluğu;
//  - ad, kateqoriya, kod, brend, teq (açar sözlər), təsvir üzrə;
//  - yazı səhvlərinə dözüm (Levenshtein);
//  - dəqiq uyğunluq yoxdursa — ən uyğun "oxşar" məhsullar (relevantlıq üzrə).
//  Nəticə sıralaması CatalogPage-də: əvvəlcə "Prioritet" (is_featured),
//  sonra relevantlıq balı — müasir e-commerce (Trendyol/Amazon) məntiqi.
// ============================================================

// Azərbaycan/türk hərflərini və diakritikaları "sadə" formaya gətirir ki,
// "ə/ı/ş/ç/ğ/ö/ü" və rus/latın yazılışı fərqi axtarışa mane olmasın.
export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function tokenize(s) {
  // Unicode hərf/rəqəm sərhədi ilə bölürük — kiril (rus) sözləri itməsin.
  return normalizeText(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

// Levenshtein məsafəsi ≤ max? (yazı səhvi tolerantlığı). Erkən çıxışlarla ucuz.
function withinEditDistance(a, b, max) {
  if (a === b) return true
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > max) return false
  const dp = Array.from({ length: la + 1 }, (_, i) => i)
  for (let j = 1; j <= lb; j++) {
    let prev = dp[0]
    dp[0] = j
    let rowMin = dp[0]
    for (let i = 1; i <= la; i++) {
      const tmp = dp[i]
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
      prev = tmp
      if (dp[i] < rowMin) rowMin = dp[i]
    }
    if (rowMin > max) return false // bu sətirdə heç bir yol məqsədə çatmır
  }
  return dp[la] <= max
}

// Sahə çəkiləri: kod ən güclü, sonra ad, kateqoriya, brend, teq, təsvir.
const FIELD_WEIGHTS = {
  code: 100,
  name: 42,
  category: 24,
  brand: 18,
  tag: 14,
  description: 6,
}
// Fuzzy yalnız "mənalı" sahələrdə (qısa kodlarda səhv nəticə verməsin).
const FUZZY_FIELDS = new Set(['name', 'category', 'brand'])

// Məhsulun axtarış üçün normallaşdırılmış mətn sahələri.
// getCategoryText(product) → kateqoriyanın adı (bütün dillər birləşmiş).
export function productSearchFields(product, getCategoryText) {
  const names = product?.name ? Object.values(product.name).join(' ') : ''
  const descs = product?.description ? Object.values(product.description).join(' ') : ''
  return {
    code: normalizeText(product?.code),
    name: normalizeText(names),
    category: normalizeText(getCategoryText ? getCategoryText(product) : ''),
    brand: normalizeText(product?.brand),
    tag: normalizeText(product?.tag),
    description: normalizeText(descs),
  }
}

// Bir məhsulun sorğuya görə relevantlıq balı. 0 = uyğun deyil.
export function scoreFields(fields, queryTokens, rawQueryNorm) {
  let score = 0

  // Bütöv sorğu kodla tam üst-üstə düşürsə — çox güclü siqnal (barkod/kod axtarışı)
  if (rawQueryNorm && fields.code && fields.code === rawQueryNorm) score += 300

  for (const key in FIELD_WEIGHTS) {
    const text = fields[key]
    if (!text) continue
    const w = FIELD_WEIGHTS[key]
    const words = text.split(/\s+/)
    const canFuzzy = FUZZY_FIELDS.has(key)

    for (const qt of queryTokens) {
      if (words.includes(qt)) { score += w; continue }                    // tam söz
      if (words.some((wd) => wd.startsWith(qt))) { score += w * 0.8; continue } // prefiks
      if (text.includes(qt)) { score += w * 0.55; continue }              // alt-sətir
      if (canFuzzy && qt.length >= 4) {                                    // yazı səhvi
        const max = qt.length >= 7 ? 2 : 1
        if (words.some((wd) => withinEditDistance(wd, qt, max))) score += w * 0.4
      }
    }
  }
  return score
}

// products → Map<id, score> (yalnız score>0). Boş sorğuda active=false.
export function searchScores(products, query, getCategoryText) {
  const scores = new Map()
  const tokens = tokenize(query)
  if (!tokens.length) return { scores, active: false }
  const rawQueryNorm = normalizeText(query)
  for (const p of products) {
    const s = scoreFields(productSearchFields(p, getCategoryText), tokens, rawQueryNorm)
    if (s > 0) scores.set(p.id, s)
  }
  return { scores, active: true }
}
