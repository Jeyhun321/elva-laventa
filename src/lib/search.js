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

// Axtarış üçün minimum sorğu uzunluğu (qısa sorğuda böyük təsadüfi siyahı olmasın).
export const SEARCH_MIN = 2

// Məhsulun axtarış üçün normallaşdırılmış mətn sahələri.
// names — hər dil üçün ayrıca (ada görə "tam / prefiks / qismən" mərtəbələri üçün).
// getCategoryText(product) → kateqoriyanın adı (bütün dillər birləşmiş).
export function productSearchFields(product, getCategoryText) {
  const names = product?.name ? Object.values(product.name).map(normalizeText).filter(Boolean) : []
  const descs = product?.description ? Object.values(product.description).join(' ') : ''
  return {
    names,
    nameJoined: names.join(' '),
    code: normalizeText(product?.code),
    category: normalizeText(getCategoryText ? getCategoryText(product) : ''),
    brand: normalizeText(product?.brand),
    tag: normalizeText(product?.tag),
    description: normalizeText(descs),
  }
}

// Relevantlıq balı — ТЗ sıralamasına uyğun mərtəbələr:
//   ad tam > ad başlanğıcı > ad qismən > kod > kateqoriya/teq > brend/təsvir.
// Böyük fərqlərlə (fraza mərtəbəsi) ad kod/kateqoriyadan həmişə yuxarı qalır;
// çoxsözlü sorğu üçün token-səviyyəli əlavələr toplanır.
export function scoreFields(fields, queryTokens, rawQueryNorm, opts = {}) {
  const lenient = opts.lenient === true
  let score = 0

  // --- Fraza mərtəbəsi (bütöv sorğu) ---
  let namePhrase = 0
  if (rawQueryNorm) {
    for (const nm of fields.names) {
      if (nm === rawQueryNorm) namePhrase = Math.max(namePhrase, 1000)      // ad tam
      else if (nm.startsWith(rawQueryNorm)) namePhrase = Math.max(namePhrase, 800) // ad başlanğıcı
      else if (nm.includes(rawQueryNorm)) namePhrase = Math.max(namePhrase, 600)   // ad qismən
    }
  }
  score += namePhrase

  // TASK 4 — Məhsul KODU yalnız TAM uyğunluqla tapılır (qismən/prefiks yox).
  // Ad qismən axtarışa təsir etmir (ad üçün partial saxlanılır, aşağıda).
  // Məs. kod "LV2381": "LV"/"LV23" → tapılmır; yalnız "LV2381" → tapılır.
  if (rawQueryNorm && fields.code && fields.code === rawQueryNorm) {
    score += 500                                                            // kod tam
  }

  // --- Token səviyyəsi (hər söz) ---
  const nameWords = fields.nameJoined ? fields.nameJoined.split(/\s+/) : []
  const fuzzyMin = lenient ? 3 : 4
  for (const qt of queryTokens) {
    // ad
    if (nameWords.includes(qt)) score += 120
    else if (nameWords.some((w) => w.startsWith(qt))) score += 90
    else if (fields.nameJoined.includes(qt)) score += 60
    else if (qt.length >= fuzzyMin && nameWords.some((w) => withinEditDistance(w, qt, qt.length >= 7 ? 2 : (lenient ? 2 : 1)))) score += lenient ? 45 : 35
    // kateqoriya / teq / brend / təsvir
    if (fields.category && fields.category.includes(qt)) score += 55
    if (fields.tag && fields.tag.includes(qt)) score += 45
    if (fields.brand && fields.brand.includes(qt)) score += 35
    if (!lenient && fields.description && fields.description.includes(qt)) score += 12
  }
  return score
}

// products → Map<id, score> (yalnız score>0). Boş/qısa sorğuda active=false.
export function searchScores(products, query, getCategoryText) {
  const scores = new Map()
  const raw = (query || '').trim()
  if (raw.length < SEARCH_MIN) return { scores, active: false }
  const tokens = tokenize(query)
  if (!tokens.length) return { scores, active: false }
  const rawQueryNorm = normalizeText(query)
  for (const p of products) {
    const s = scoreFields(productSearchFields(p, getCategoryText), tokens, rawQueryNorm)
    if (s > 0) scores.set(p.id, s)
  }
  return { scores, active: true }
}

// Dəqiq nəticə YOXDURSA — "oxşar məhsullar". Daha yumşaq uyğunluq
// (kateqoriya/teq/brend + genişlənmiş fuzzy). Heç nə tapılmasa — reytinqə görə
// ən yaxşılar. Nəticə həmişə relevantlıq üzrə, sonra featured, sonra reytinq.
export function similarProducts(products, query, getCategoryText, limit = 12) {
  const tokens = tokenize(query)
  const rawQueryNorm = normalizeText(query)
  const scored = []
  for (const p of products) {
    const s = tokens.length
      ? scoreFields(productSearchFields(p, getCategoryText), tokens, rawQueryNorm, { lenient: true })
      : 0
    if (s > 0) scored.push({ p, s })
  }
  scored.sort((a, b) =>
    (b.s - a.s) ||
    (Number(!!b.p.isFeatured) - Number(!!a.p.isFeatured)) ||
    (b.p.rating - a.p.rating)
  )
  let list = scored.map((x) => x.p)
  if (!list.length) {
    // Heç bir oxşar tapılmadı — ümumi tövsiyə (reytinq + featured), amma UI bunu
    // "oxşar məhsullar" başlığı ilə açıq göstərir (təsadüfi kataloq deyil).
    list = [...products].sort((a, b) =>
      (Number(!!b.isFeatured) - Number(!!a.isFeatured)) || (b.rating - a.rating)
    )
  }
  return list.slice(0, limit)
}
