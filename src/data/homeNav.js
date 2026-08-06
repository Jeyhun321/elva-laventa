// Ana səhifənin üfüqi bölmə vkladkaları (yalnız mobil).
// Yalnız real LaVenta bölmələri — gələcək boş kateqoriyalar əlavə edilmir.
// label — {az,ru,en} (t() birbaşa çevirir); link — real marşrut/filtr.
// Kateqoriya id-ləri Categories/CatalogPage ilə eynidir (donlar, bluzalar, etekler).

// Dairəvi sürətli kateqoriyalar (Trendyol UX, LaVenta rəngləri).
// icon — Categories.jsx-dəki xəritə açarı. link — real filtr/marşrut.
// "parfum" hələ kataloqda yoxdur — UI-stub (link kataloqa aparır).
export const quickCategories = [
  { id: 'all', icon: 'layers', label: { az: 'Hamısı', ru: 'Все', en: 'All' }, link: '/catalog' },
  { id: 'donlar', icon: 'dress', label: { az: 'Donlar', ru: 'Платья', en: 'Dresses' }, link: '/catalog?cat=donlar' },
  { id: 'bluzalar', icon: 'blouse', label: { az: 'Bluzalar', ru: 'Блузы', en: 'Blouses' }, link: '/catalog?cat=bluzalar' },
  { id: 'etekler', icon: 'skirt', label: { az: 'Ətəklər', ru: 'Юбки', en: 'Skirts' }, link: '/catalog?cat=etekler' },
  { id: 'sale', icon: 'percent', label: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' }, link: '/catalog?sale=1' },
  { id: 'new', icon: 'sparkle', label: { az: 'Yenilər', ru: 'Новинки', en: 'New' }, link: '/catalog' },
  { id: 'parfum', icon: 'perfume', label: { az: 'Parfüm', ru: 'Парфюм', en: 'Perfume' }, link: '/catalog' },
]

export const homeTabs = [
  { id: 'women', label: { az: 'Qadın', ru: 'Женское', en: 'Women' }, link: '/catalog' },
  { id: 'donlar', label: { az: 'Donlar', ru: 'Платья', en: 'Dresses' }, link: '/catalog?cat=donlar' },
  { id: 'bluzalar', label: { az: 'Bluzalar', ru: 'Блузы', en: 'Blouses' }, link: '/catalog?cat=bluzalar' },
  { id: 'etekler', label: { az: 'Ətəklər', ru: 'Юбки', en: 'Skirts' }, link: '/catalog?cat=etekler' },
  { id: 'new', label: { az: 'Yeni', ru: 'Новинки', en: 'New' }, link: '/catalog' },
  { id: 'sale', label: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' }, link: '/catalog?sale=1' },
  { id: 'popular', label: { az: 'Populyar', ru: 'Популярные', en: 'Popular' }, link: '/#catalog-preview' },
]
