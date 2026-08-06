// Reklam / promo blokları üçün yenidən istifadə olunan konfiqurasiya.
// Hər bir promo obyekti öz-özünə yetərlidir: mətnlər birbaşa AZ/RU/EN kimi
// saxlanır (t() {az,ru,en} obyektini birbaşa çevirir), rəng "tone" ilə seçilir.
//
// Sahələr:
//   id         — unikal açar (React key + gələcək analitika üçün)
//   title      — {az,ru,en} başlıq
//   subtitle   — {az,ru,en} qısa izah (ixtiyari)
//   badge      — {az,ru,en} kiçik nişan (ixtiyari)
//   cta        — {az,ru,en} düymə mətni (ixtiyari; yoxdursa ox göstərilir)
//   link       — daxili marşrut (react-router)
//   tone       — vizual variant: 'plum' | 'rose' | 'soft' | 'ivory'
//   image      — ixtiyari şəkil URL-i (yoxdursa brend qradiyenti — sıfır layout shift)
//   active     — false olsa göstərilmir
//   sortOrder  — kiçikdən böyüyə sıralama
//
// Qeyd: şəkil əlavə etmək istəsən image sahəsini doldur; əks halda blok
// brend qradiyenti ilə render olunur — heç bir əlavə şəbəkə sorğusu yaratmır.

const norm = (list) =>
  list
    .filter((p) => p.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

// A + item 3: hero-dan dərhal sonra kompakt üfüqi reklam zolağı (üstün ekranda).
export const compactPromos = norm([
  {
    id: 'free-shipping',
    tone: 'ivory',
    link: '/catalog',
    active: true,
    sortOrder: 1,
    badge: { az: 'Kampaniya', ru: 'Акция', en: 'Offer' },
    title: {
      az: '50 ₼-dən yuxarı sifarişlərə pulsuz çatdırılma',
      ru: 'Бесплатная доставка от 50 ₼',
      en: 'Free delivery on orders over 50 ₼',
    },
    subtitle: {
      az: 'Bütün Bakı üzrə',
      ru: 'По всему Баку',
      en: 'Across Baku',
    },
  },
])

// D: yan-yana iki kiçik reklam kartı.
export const promoPair = norm([
  {
    id: 'new-collection',
    tone: 'plum',
    link: '/catalog',
    active: true,
    sortOrder: 1,
    badge: { az: 'Yeni', ru: 'Новое', en: 'New' },
    title: { az: 'Yeni kolleksiya', ru: 'Новая коллекция', en: 'New collection' },
    subtitle: { az: '2026 baharı', ru: 'Весна 2026', en: 'Spring 2026' },
  },
  {
    id: 'up-to-40',
    tone: 'rose',
    link: '/catalog?sale=1',
    active: true,
    sortOrder: 2,
    badge: { az: 'Endirim', ru: 'Скидки', en: 'Sale' },
    title: { az: '-40%-ə qədər', ru: 'До -40%', en: 'Up to -40%' },
    subtitle: { az: 'Mövsüm sonu', ru: 'Конец сезона', en: 'End of season' },
  },
])

// E: товарные секции arasında geniş sezon banneri.
export const wideBanners = norm([
  {
    id: 'season-sale',
    tone: 'plum',
    link: '/catalog?sale=1',
    active: true,
    sortOrder: 1,
    badge: { az: 'Mövsüm sonu satışı', ru: 'Сезонная распродажа', en: 'Seasonal sale' },
    title: {
      az: 'Sevdiyiniz modellər indi -40%-ə qədər',
      ru: 'Любимые модели теперь до -40%',
      en: 'Your favourite styles now up to -40% off',
    },
    subtitle: {
      az: 'Kolleksiyanın seçilmiş məhsulları məhdud sayda',
      ru: 'Избранные модели коллекции — количество ограничено',
      en: 'Selected pieces from the collection, while stocks last',
    },
    cta: { az: 'Endirimlərə bax', ru: 'Смотреть скидки', en: 'Shop the sale' },
  },
])
