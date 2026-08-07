// Reklam / promo blokları üçün yenidən istifadə olunan konfiqurasiya.
// Hər bir promo obyekti öz-özünə yetərlidir: mətnlər birbaşa AZ/RU/EN kimi
// saxlanır (t() {az,ru,en} obyektini birbaşa çevirir), rəng "tone" ilə seçilir.
//
// Sahələr:
//   id         — unikal açar (React key)
//   title      — {az,ru,en} başlıq
//   subtitle   — {az,ru,en} qısa izah (ixtiyari)
//   badge      — {az,ru,en} kiçik nişan (ixtiyari)
//   cta        — {az,ru,en} düymə mətni (ixtiyari; wide banner üçün)
//   link       — daxili marşrut (react-router)
//   tone       — vizual variant: 'plum' | 'rose' | 'soft' | 'ivory'
//   image      — ixtiyari şəkil URL-i (yoxdursa brend qradiyenti — sıfır layout shift)
//   isActive   — false olsa göstərilmir
//   sortOrder  — kiçikdən böyüyə sıralama

const norm = (list) =>
  list
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

// Kompakt promo lenti (CompactPromoRail) — populyar məhsullardan sonra.
// Alçaq, yan sürüşən kiçik kartlar (Trendyol-un "endirim oranları" zolağı UX-i,
// amma LaVenta rəngləri və mətnləri ilə).
export const railPromos = norm([
  {
    id: 'free-shipping',
    tone: 'ivory',
    icon: 'truck',
    link: '/catalog',
    isActive: true,
    sortOrder: 1,
    title: { az: 'Pulsuz çatdırılma', ru: 'Бесплатная доставка', en: 'Free delivery' },
    subtitle: { az: '50 ₼-dən yuxarı', ru: 'От 50 ₼', en: 'Over 50 ₼' },
  },
  {
    id: 'discounts',
    tone: 'rose',
    icon: 'tag',
    link: '/catalog?sale=1',
    isActive: true,
    sortOrder: 2,
    title: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' },
    subtitle: { az: 'Gündəlik yenilənir', ru: 'Обновляются ежедневно', en: 'Updated daily' },
  },
  {
    id: 'new-collection',
    tone: 'plum',
    icon: 'sparkle',
    link: '/catalog',
    isActive: true,
    sortOrder: 3,
    title: { az: 'Yeni kolleksiya', ru: 'Новая коллекция', en: 'New collection' },
    subtitle: { az: 'Hər kəs üçün', ru: 'Для каждой', en: 'For everyone' },
  },
])

// Товарные секции arasında geniş, alçaq sezon banneri.
export const wideBanners = norm([
  {
    id: 'season-sale',
    tone: 'plum',
    link: '/catalog?sale=1',
    isActive: true,
    sortOrder: 1,
    badge: { az: 'Mövsüm sonu satışı', ru: 'Сезонная распродажа', en: 'Seasonal sale' },
    title: {
      az: 'Seçilmiş modellər -40%-ə qədər',
      ru: 'Избранные модели до -40%',
      en: 'Selected styles up to -40% off',
    },
    subtitle: {
      az: 'Məhdud sayda',
      ru: 'Количество ограничено',
      en: 'While stocks last',
    },
    cta: { az: 'Endirimlərə bax', ru: 'Смотреть скидки', en: 'Shop the sale' },
  },
])
