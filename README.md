# Laventa — Qadın Geyimləri Mağazası

Qadın geyimləri üçün onlayn mağaza (React + Vite). Bu, layihənin ilk versiyasıdır:
animasiyalı **intro** (endirimdə olan məhsullar vitrini) və **kataloq** (kateqoriya filtrləri ilə).

## İşə salmaq

```bash
npm install
npm run dev
```

Sayt `http://localhost:5173` ünvanında açılır.

Production üçün:

```bash
npm run build
npm run preview
```

## Struktur

```
src/
  data/products.js      # Məhsul kataloqu (ad, qiymət, endirim, şəkil, kateqoriya)
  components/
    Navbar.jsx          # Yuxarı naviqasiya + səbət
    Intro.jsx           # Hero + endirim vitrini (avtomatik dəyişir)
    Marquee.jsx         # Hərəkət edən üstünlüklər lenti
    Catalog.jsx         # Kateqoriya filtrləri + məhsul şəbəkəsi
    ProductCard.jsx     # Tək məhsul kartı
    ProductImage.jsx    # Şəkil + ehtiyat (fallback) placeholder
    Promo.jsx           # Endirim banneri
    Footer.jsx          # Alt hissə + abunə + əlaqə
    Icons.jsx           # SVG ikonlar
  styles/index.css      # Bütün stillər (dəyişənlərlə tema)
```

## Məhsulları dəyişmək

Bütün məhsullar `src/data/products.js` faylındadır. Real məhsul şəkillərini
əlavə etmək üçün hər məhsulun `image` sahəsini öz şəkil ünvanınızla əvəz edin
(və ya `public/` qovluğuna şəkil qoyub `/sekil.jpg` kimi göstərin). Şəkil
yüklənməzsə, avtomatik olaraq zərif bir placeholder göstərilir.

## Növbəti addımlar (müzakirə üçün)

- Məhsul detal səhifəsi
- Səbət və ödəniş
- Axtarış və qiymət/ölçü filtrləri
- Admin panel / məhsulların idarə edilməsi
- Backend + verilənlər bazası
