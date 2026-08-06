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
    id: 'up-to-40',
    tone: 'plum',
    link: '/catalog?sale=1',
    isActive: true,
    sortOrder: 1,
    badge: { az: '-40%', ru: '-40%', en: '-40%' },
    title: { az: 'Mövsüm sonu', ru: 'Конец сезона', en: 'End of season' },
  },
  {
    id: 'new-collection',
    tone: 'rose',
    link: '/catalog',
    isActive: true,
    sortOrder: 2,
    badge: { az: 'Yeni', ru: 'Новое', en: 'New' },
    title: { az: 'Yeni kolleksiya', ru: 'Новая коллекция', en: 'New collection' },
  },
  {
    id: 'free-shipping',
    tone: 'ivory',
    link: '/catalog',
    isActive: true,
    sortOrder: 3,
    badge: { az: 'Pulsuz', ru: 'Бесплатно', en: 'Free' },
    title: { az: '50 ₼-dən çatdırılma', ru: 'Доставка от 50 ₼', en: 'Delivery from 50 ₼' },
  },
  {
    id: 'last-sizes',
    tone: 'soft',
    link: '/catalog',
    isActive: true,
    sortOrder: 4,
    badge: { az: 'Son ölçülər', ru: 'Последние размеры', en: 'Last sizes' },
    title: { az: 'Tükənmədən al', ru: 'Успей купить', en: 'Before they’re gone' },
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
