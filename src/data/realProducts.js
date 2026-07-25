const base = `${import.meta.env.BASE_URL}products/`
const photos = (folder, count) => Array.from({ length: count }, (_, i) => `${base}${folder}/${String(i + 1).padStart(2, '0')}.jpeg`)

const dress = (code, name, description, price, colors, folder, photoCount) => ({
  code, brand: 'Elva LaVenta',
  name: { az: name, ru: name, en: name },
  description: { az: description, ru: description, en: description },
  category: 'donlar', price, oldPrice: null, image: photos(folder, photoCount)[0],
  colors, sizes: ['S', 'M', 'L', 'XL'], rating: 5, reviews: 0, tag: 'new', isActive: true,
})

export const REAL_PRODUCTS = [
  dress('2001', 'Çiçəkli Maxi Don', 'Yüngül, çiçək naxışlı uzun don. Bel hissəsi tənzimlənir.', 59, ['#f7b7d2', '#cf2879', '#ffffff'], 'floral-pink', 3),
  dress('2002', 'Qırmızı Ürəkli Maxi Don', 'Düyməli, ürək naxışlı, rahat gündəlik maxi don.', 49, ['#d3102f', '#ffffff'], 'heart-red', 3),
  dress('2003', 'Çəhrayı Ürəkli Maxi Don', 'Düyməli, ürək naxışlı, rahat gündəlik maxi don.', 49, ['#f29bd0', '#ffffff'], 'heart-pink', 2),
  dress('2004', 'Qəhvəyi Çiçəkli Don', 'Çiçək naxışlı, düyməli və arxadan tənzimlənən uzun don.', 55, ['#4a2b1d', '#eee6dc', '#b69772'], 'floral-brown', 2),
  dress('2005', 'Narıncı Kətan Don', 'Kəmərli, cibləri olan yüngül kətan maxi don.', 65, ['#f26522'], 'linen-01', 3),
  dress('2006', 'Bej Kətan Köynək Donu', 'Qısa qollu, kəmərli və rahat kətan köynək donu.', 65, ['#b7ada7'], 'linen-02', 3),
  dress('2007', 'Mavi Kətan Köynək Donu', 'Qısa qollu, kəmərli və rahat kətan köynək donu.', 65, ['#53677f'], 'linen-03', 3),
  dress('2008', 'Boz Kətan Don', 'Qolsuz, kəmərli, ön hissəsi düyməli kətan maxi don.', 65, ['#74717d'], 'linen-04', 3),
  dress('2009', 'Bordo Kətan Don', 'Qolsuz, kəmərli və cibləri olan bordo maxi don.', 65, ['#7d1d35'], 'linen-05', 3),
  dress('2010', 'Duman Boz Kətan Don', 'Qolsuz, kəmərli və rahat gündəlik maxi don.', 65, ['#8e7e83'], 'linen-06', 3),
  dress('2011', 'Qəhvəyi Kətan Köynək Donu', 'Qısa qollu, kəmərli və cibləri olan maxi don.', 65, ['#a27a67'], 'linen-07', 3),
  dress('2012', 'Parlaq Narıncı Kətan Don', 'Qolsuz, kəmərli və düyməli yay maxi donu.', 65, ['#fc6b10'], 'linen-08', 3),
  dress('2013', 'Yaşıl Kətan Don', 'Qolsuz, kəmərli, düyməli və rahat maxi don.', 65, ['#a8c996'], 'linen-09', 3),
  dress('2014', 'Zeytun Kətan Köynək Donu', 'Qısa qollu, kəmərli, yüngül və rahat maxi don.', 65, ['#858b78'], 'linen-10', 2),
]

export const REAL_PRODUCT_GALLERIES = Object.fromEntries(
  REAL_PRODUCTS.map((product) => {
    const folder = product.image.split('/').slice(-2, -1)[0]
    const count = { 'heart-pink': 2, 'floral-brown': 2, 'linen-10': 2 }[folder] || 3
    return [product.code, photos(folder, count)]
  }),
)
