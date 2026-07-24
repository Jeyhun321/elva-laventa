// Məhsul kataloqu — Elva LaVenta
// Şəkilləri real məhsul şəkilləri ilə əvəz etmək üçün `image` sahəsini dəyişin.
// name/label çoxdillidir: { az, ru, en }.

export const categories = [
  { id: 'all', label: { az: 'Hamısı', ru: 'Все', en: 'All' } },
  { id: 'donlar', label: { az: 'Donlar', ru: 'Платья', en: 'Dresses' } },
  { id: 'bluzalar', label: { az: 'Bluzalar', ru: 'Блузки', en: 'Blouses' } },
  { id: 'etekler', label: { az: 'Ətəklər', ru: 'Юбки', en: 'Skirts' } },
  { id: 'salvarlar', label: { az: 'Şalvarlar', ru: 'Брюки', en: 'Trousers' } },
  { id: 'ust-geyim', label: { az: 'Üst geyim', ru: 'Верхняя одежда', en: 'Outerwear' } },
  { id: 'trikotaj', label: { az: 'Trikotaj', ru: 'Трикотаж', en: 'Knitwear' } },
  { id: 'aksesuarlar', label: { az: 'Aksesuarlar', ru: 'Аксессуары', en: 'Accessories' } },
]

const img = (id, w = 700) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

const S = ['XS', 'S', 'M', 'L', 'XL']

export const products = [
  {
    id: 1,
    brand: 'Elva LaVenta',
    name: { az: 'Zərif Midi Don', ru: 'Изящное миди-платье', en: 'Elegant Midi Dress' },
    category: 'donlar',
    price: 89, oldPrice: 129,
    image: img('1595777457583-95e059d581b8'),
    colors: ['#e84a92', '#b3155f', '#ffd6e8'],
    sizes: S, rating: 4.8, reviews: 214, tag: 'bestseller',
  },
  {
    id: 2,
    brand: 'Rosé Studio',
    name: { az: 'Çiçəkli Yay Donu', ru: 'Летнее платье в цветах', en: 'Floral Summer Dress' },
    category: 'donlar',
    price: 74, oldPrice: 110,
    image: img('1572804013309-59a88b7e92f1'),
    colors: ['#f7a8cd', '#ffe0ee'],
    sizes: S, rating: 4.6, reviews: 132,
  },
  {
    id: 3,
    brand: 'Elva LaVenta',
    name: { az: 'Kəmərli Kokteyl Donu', ru: 'Коктейльное платье с поясом', en: 'Belted Cocktail Dress' },
    category: 'donlar',
    price: 119, oldPrice: null,
    image: img('1566174053879-31528523f8ae'),
    colors: ['#2b2b30', '#b3155f'],
    sizes: ['S', 'M', 'L'], rating: 4.9, reviews: 88, tag: 'new',
  },
  {
    id: 4,
    brand: 'Bella Moda',
    name: { az: 'İpək Bluza', ru: 'Шёлковая блузка', en: 'Silk Blouse' },
    category: 'bluzalar',
    price: 49, oldPrice: 69,
    image: img('1564257631407-4deb1f99d992'),
    colors: ['#ffe0ee', '#ffd6e8', '#f7a8cd'],
    sizes: S, rating: 4.5, reviews: 176,
  },
  {
    id: 5,
    brand: 'Rosé Studio',
    name: { az: 'Klassik Ağ Köynək', ru: 'Классическая белая рубашка', en: 'Classic White Shirt' },
    category: 'bluzalar',
    price: 39, oldPrice: 55,
    image: img('1598554747436-c9293d6a588f'),
    colors: ['#ffffff', '#ffe0ee'],
    sizes: S, rating: 4.7, reviews: 301, tag: 'bestseller',
  },
  {
    id: 6,
    brand: 'Bella Moda',
    name: { az: 'Volanlı Bluza', ru: 'Блузка с воланами', en: 'Ruffled Blouse' },
    category: 'bluzalar',
    price: 44, oldPrice: null,
    image: img('1551163943-3f6a855d1153'),
    colors: ['#f7a8cd', '#ffffff'],
    sizes: S, rating: 4.4, reviews: 64,
  },
  {
    id: 7,
    brand: 'Elva LaVenta',
    name: { az: 'Plisse Midi Ətək', ru: 'Плиссированная миди-юбка', en: 'Pleated Midi Skirt' },
    category: 'etekler',
    price: 59, oldPrice: 85,
    image: img('1583496661160-fb5886a0aaaa'),
    colors: ['#e84a92', '#b3155f'],
    sizes: S, rating: 4.6, reviews: 121,
  },
  {
    id: 8,
    brand: 'Noir Line',
    name: { az: 'Dəri A-formalı Ətək', ru: 'Кожаная юбка А-силуэта', en: 'Leather A-line Skirt' },
    category: 'etekler',
    price: 69, oldPrice: 95,
    image: img('1591369822096-ffd140ec948f'),
    colors: ['#3a2a2a', '#2b2b30'],
    sizes: ['S', 'M', 'L'], rating: 4.7, reviews: 93, tag: 'sale',
  },
  {
    id: 9,
    brand: 'Bella Moda',
    name: { az: 'Yüksək Belli Şalvar', ru: 'Брюки с высокой посадкой', en: 'High-Waist Trousers' },
    category: 'salvarlar',
    price: 64, oldPrice: 89,
    image: img('1594633312681-425c7b97ccd1'),
    colors: ['#2b2b30', '#6b7280'],
    sizes: S, rating: 4.5, reviews: 158,
  },
  {
    id: 10,
    brand: 'Rosé Studio',
    name: { az: 'Geniş Balaqlı Şalvar', ru: 'Широкие брюки', en: 'Wide-Leg Trousers' },
    category: 'salvarlar',
    price: 72, oldPrice: null,
    image: img('1509551388413-e18d0ac5d495'),
    colors: ['#f7a8cd', '#b3155f'],
    sizes: S, rating: 4.6, reviews: 77, tag: 'new',
  },
  {
    id: 11,
    brand: 'Noir Line',
    name: { az: 'Yun Palto', ru: 'Шерстяное пальто', en: 'Wool Coat' },
    category: 'ust-geyim',
    price: 159, oldPrice: 219,
    image: img('1539533018447-63fcce2678e3'),
    colors: ['#b89b74', '#3a2a2a'],
    sizes: S, rating: 4.9, reviews: 142, tag: 'sale',
  },
  {
    id: 12,
    brand: 'Elva LaVenta',
    name: { az: 'Trençkot', ru: 'Тренчкот', en: 'Trench Coat' },
    category: 'ust-geyim',
    price: 139, oldPrice: 189,
    image: img('1591047139829-d91aecb6caea'),
    colors: ['#c8a97e', '#3a2a2a'],
    sizes: S, rating: 4.8, reviews: 110,
  },
  {
    id: 13,
    brand: 'Bella Moda',
    name: { az: 'Kaşmir Sviter', ru: 'Кашемировый свитер', en: 'Cashmere Sweater' },
    category: 'trikotaj',
    price: 79, oldPrice: 109,
    image: img('1576566588028-4147f3842f27'),
    colors: ['#ffe0ee', '#f7a8cd', '#ffd6e8'],
    sizes: S, rating: 4.7, reviews: 189, tag: 'bestseller',
  },
  {
    id: 14,
    brand: 'Rosé Studio',
    name: { az: 'Oversize Kardiqan', ru: 'Кардиган оверсайз', en: 'Oversize Cardigan' },
    category: 'trikotaj',
    price: 69, oldPrice: 99,
    image: img('1584917865442-de89df76afd3'),
    colors: ['#b89b74', '#ffe0ee'],
    sizes: ['S', 'M', 'L'], rating: 4.5, reviews: 96,
  },
  {
    id: 15,
    brand: 'Elva LaVenta',
    name: { az: 'Zərif Boyunbağı', ru: 'Изящное ожерелье', en: 'Delicate Necklace' },
    category: 'aksesuarlar',
    price: 29, oldPrice: 45,
    image: img('1515562141207-7a88fb7ce338'),
    colors: ['#d4af37', '#ffe0ee'],
    sizes: ['One size'], rating: 4.6, reviews: 54,
  },
  {
    id: 16,
    brand: 'Noir Line',
    name: { az: 'Dəri Çanta', ru: 'Кожаная сумка', en: 'Leather Bag' },
    category: 'aksesuarlar',
    price: 99, oldPrice: 145,
    image: img('1584917865442-de89df76afd3'),
    colors: ['#b3155f', '#3a2a2a'],
    sizes: ['One size'], rating: 4.8, reviews: 133, tag: 'sale',
  },
  {
    id: 17,
    brand: 'Bella Moda',
    name: { az: 'İpək Şərf', ru: 'Шёлковый шарф', en: 'Silk Scarf' },
    category: 'aksesuarlar',
    price: 24, oldPrice: null,
    image: img('1601924994987-69e26d50dc26'),
    colors: ['#e84a92', '#f7a8cd', '#ffe0ee'],
    sizes: ['One size'], rating: 4.4, reviews: 41,
  },
  {
    id: 18,
    brand: 'Elva LaVenta',
    name: { az: 'Saten Maksi Don', ru: 'Атласное макси-платье', en: 'Satin Maxi Dress' },
    category: 'donlar',
    price: 129, oldPrice: 179,
    image: img('1566174053879-31528523f8ae'),
    colors: ['#b3155f', '#e84a92'],
    sizes: S, rating: 4.9, reviews: 167, tag: 'sale',
  },
]

export const discountPercent = (p) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0

export const saleProducts = products.filter((p) => p.oldPrice)

export const getProduct = (id) => products.find((p) => p.id === Number(id))

export const priceBounds = () => {
  const prices = products.map((p) => p.price)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
