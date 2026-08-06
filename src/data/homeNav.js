// Ana səhifənin üfüqi bölmə vkladkaları (yalnız mobil).
// Yalnız real LaVenta bölmələri — gələcək boş kateqoriyalar əlavə edilmir.
// label — {az,ru,en} (t() birbaşa çevirir); link — real marşrut/filtr.
// Kateqoriya id-ləri Categories/CatalogPage ilə eynidir (donlar, bluzalar, etekler).

export const homeTabs = [
  { id: 'women', label: { az: 'Qadın', ru: 'Женское', en: 'Women' }, link: '/catalog' },
  { id: 'donlar', label: { az: 'Donlar', ru: 'Платья', en: 'Dresses' }, link: '/catalog?cat=donlar' },
  { id: 'bluzalar', label: { az: 'Bluzalar', ru: 'Блузы', en: 'Blouses' }, link: '/catalog?cat=bluzalar' },
  { id: 'etekler', label: { az: 'Ətəklər', ru: 'Юбки', en: 'Skirts' }, link: '/catalog?cat=etekler' },
  { id: 'new', label: { az: 'Yeni', ru: 'Новинки', en: 'New' }, link: '/catalog' },
  { id: 'sale', label: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' }, link: '/catalog?sale=1' },
  { id: 'popular', label: { az: 'Populyar', ru: 'Популярные', en: 'Popular' }, link: '/#catalog-preview' },
]
