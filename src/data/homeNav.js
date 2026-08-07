// Dairəvi sürətli kateqoriyalar (Trendyol UX, LaVenta rəngləri).
// icon — Categories.jsx-dəki xəritə açarı. link — real filtr/marşrut.
// "parfum" hələ kataloqda yoxdur — UI-stub (link kataloqa aparır).
// Qeyd: "Hamısı" ayrıca dairə kimi göstərilmir — solundakı menyu (☰) düyməsi
// bütün kateqoriyaları açır.
export const quickCategories = [
  { id: 'donlar', icon: 'dress', label: { az: 'Donlar', ru: 'Платья', en: 'Dresses' }, link: '/catalog?cat=donlar' },
  { id: 'bluzalar', icon: 'blouse', label: { az: 'Bluzalar', ru: 'Блузы', en: 'Blouses' }, link: '/catalog?cat=bluzalar' },
  { id: 'etekler', icon: 'skirt', label: { az: 'Ətəklər', ru: 'Юбки', en: 'Skirts' }, link: '/catalog?cat=etekler' },
  { id: 'sale', icon: 'percent', label: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' }, link: '/catalog?sale=1' },
  { id: 'new', icon: 'sparkle', label: { az: 'Yenilər', ru: 'Новинки', en: 'New' }, link: '/catalog?sort=new' },
  { id: 'parfum', icon: 'perfume', label: { az: 'Parfüm', ru: 'Парфюм', en: 'Perfume' }, link: '/catalog' },
]
