// 3 dil: az (default), ru, en
export const LANGS = [
  { code: 'az', label: 'AZ', name: 'Azərbaycan' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'en', label: 'EN', name: 'English' },
]

export const DEFAULT_LANG = 'az'

export const ui = {
  // Header / nav
  catalog: { az: 'Kataloq', ru: 'Каталог', en: 'Catalog' },
  home: { az: 'Ana səhifə', ru: 'Главная', en: 'Home' },
  search_placeholder: {
    az: 'Məhsul axtar...',
    ru: 'Искать товары...',
    en: 'Search products...',
  },
  favorites: { az: 'Sevimlilər', ru: 'Избранное', en: 'Favorites' },
  cart: { az: 'Səbət', ru: 'Корзина', en: 'Cart' },
  sale: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' },
  about: { az: 'Haqqımızda', ru: 'О нас', en: 'About' },
  contact: { az: 'Əlaqə', ru: 'Контакты', en: 'Contact' },

  // Intro / hero
  hero_badge: {
    az: 'Mövsüm sonu satışı · -40%-ə qədər',
    ru: 'Сезонная распродажа · до -40%',
    en: 'End of season sale · up to -40%',
  },
  hero_title: {
    az: 'Zərifliyin yeni ünvanı',
    ru: 'Новый адрес элегантности',
    en: 'The new address of elegance',
  },
  hero_title_em: { az: 'yeni', ru: 'Новый', en: 'new' },
  hero_desc: {
    az: 'Elva LaVenta — hər gününüzə yaraşan qadın geyimləri. Yeni kolleksiya və endirimli məhsullar indi kataloqumuzda.',
    ru: 'Elva LaVenta — женская одежда на каждый день. Новая коллекция и товары со скидкой уже в каталоге.',
    en: 'Elva LaVenta — women’s clothing for every day. New collection and discounted items now in our catalog.',
  },
  hero_cta_primary: { az: 'Kataloqa keç', ru: 'В каталог', en: 'Go to catalog' },
  hero_cta_secondary: {
    az: 'Endirimlərə bax',
    ru: 'Смотреть скидки',
    en: 'View deals',
  },
  stat_products: { az: 'Məhsul', ru: 'Товаров', en: 'Products' },
  stat_customers: { az: 'Məmnun müştəri', ru: 'Довольных клиентов', en: 'Happy customers' },
  stat_rating: { az: 'Reytinq', ru: 'Рейтинг', en: 'Rating' },

  // Catalog
  collection: { az: 'Kolleksiya', ru: 'Коллекция', en: 'Collection' },
  all_products: { az: 'Bütün məhsullar', ru: 'Все товары', en: 'All products' },
  sort_by: { az: 'Sıralama', ru: 'Сортировка', en: 'Sort by' },
  sort_popular: { az: 'Populyar', ru: 'Популярные', en: 'Popular' },
  sort_price_asc: { az: 'Ucuzdan bahaya', ru: 'Сначала дешёвые', en: 'Price: low to high' },
  sort_price_desc: { az: 'Bahadan ucuza', ru: 'Сначала дорогие', en: 'Price: high to low' },
  sort_rating: { az: 'Reytinqə görə', ru: 'По рейтингу', en: 'By rating' },
  sort_discount: { az: 'Endirimə görə', ru: 'По скидке', en: 'By discount' },
  filters: { az: 'Filtrlər', ru: 'Фильтры', en: 'Filters' },
  price_range: { az: 'Qiymət', ru: 'Цена', en: 'Price' },
  price_min: { az: 'Min', ru: 'Мин', en: 'Min' },
  price_max: { az: 'Maks', ru: 'Макс', en: 'Max' },
  price_invalid: {
    az: 'Maksimum qiymət minimumdan kiçik ola bilməz',
    ru: 'Максимальная цена не может быть меньше минимальной',
    en: 'Max price cannot be lower than min price',
  },
  only_sale: { az: 'Yalnız endirimlilər', ru: 'Только со скидкой', en: 'On sale only' },
  reset: { az: 'Sıfırla', ru: 'Сбросить', en: 'Reset' },
  found: { az: 'tapıldı', ru: 'найдено', en: 'found' },
  items: { az: 'məhsul', ru: 'товаров', en: 'items' },
  empty_category: {
    az: 'Bu kateqoriyada məhsul yoxdur.',
    ru: 'В этой категории нет товаров.',
    en: 'No products in this category.',
  },
  search_results: { az: 'Axtarış nəticələri', ru: 'Результаты поиска', en: 'Search results' },
  nothing_found: {
    az: 'Heç nə tapılmadı',
    ru: 'Ничего не найдено',
    en: 'Nothing found',
  },
  nothing_found_desc: {
    az: 'Başqa açar söz sınayın və ya kataloqa baxın.',
    ru: 'Попробуйте другой запрос или загляните в каталог.',
    en: 'Try another keyword or browse the catalog.',
  },

  // Product card / page
  add_to_cart: { az: 'Səbətə əlavə et', ru: 'В корзину', en: 'Add to cart' },
  in_cart: { az: 'Səbətdə', ru: 'В корзине', en: 'In cart' },
  buy_now: { az: 'İndi al', ru: 'Купить сейчас', en: 'Buy now' },
  reviews: { az: 'rəy', ru: 'отзывов', en: 'reviews' },
  select_size: { az: 'Ölçü seçin', ru: 'Выберите размер', en: 'Select size' },
  size: { az: 'Ölçü', ru: 'Размер', en: 'Size' },
  color: { az: 'Rəng', ru: 'Цвет', en: 'Color' },
  description: { az: 'Təsvir', ru: 'Описание', en: 'Description' },
  product_desc_generic: {
    az: 'Keyfiyyətli materialdan hazırlanmış, rahat və zərif model. Gündəlik və xüsusi anlar üçün idealdır.',
    ru: 'Модель из качественного материала — удобная и элегантная. Идеальна для повседневных и особых случаев.',
    en: 'Made from quality material — comfortable and elegant. Perfect for everyday and special occasions.',
  },
  delivery: { az: 'Çatdırılma', ru: 'Доставка', en: 'Delivery' },
  delivery_info: {
    az: '1-3 gün · 100 ₼-dən yuxarı pulsuz',
    ru: '1–3 дня · бесплатно от 100 ₼',
    en: '1–3 days · free over 100 ₼',
  },
  back_to_catalog: { az: '← Kataloqa qayıt', ru: '← Назад в каталог', en: '← Back to catalog' },
  related: { az: 'Oxşar məhsullar', ru: 'Похожие товары', en: 'Related products' },
  choose_size_first: {
    az: 'Zəhmət olmasa ölçü seçin',
    ru: 'Пожалуйста, выберите размер',
    en: 'Please select a size',
  },

  // Cart
  cart_title: { az: 'Səbətiniz', ru: 'Ваша корзина', en: 'Your cart' },
  cart_empty: { az: 'Səbətiniz boşdur', ru: 'Корзина пуста', en: 'Your cart is empty' },
  cart_empty_desc: {
    az: 'Kataloqdan bəyəndiyiniz məhsulları əlavə edin.',
    ru: 'Добавьте понравившиеся товары из каталога.',
    en: 'Add items you like from the catalog.',
  },
  go_shopping: { az: 'Alış-verişə başla', ru: 'Начать покупки', en: 'Start shopping' },
  subtotal: { az: 'Cəm', ru: 'Сумма', en: 'Subtotal' },
  discount_total: { az: 'Endirim', ru: 'Скидка', en: 'Discount' },
  total: { az: 'Yekun', ru: 'Итого', en: 'Total' },
  checkout: { az: 'Sifarişi rəsmiləşdir', ru: 'Оформить заказ', en: 'Checkout' },
  remove: { az: 'Sil', ru: 'Удалить', en: 'Remove' },
  quantity: { az: 'Say', ru: 'Кол-во', en: 'Qty' },
  // Checkout / sifariş
  checkout_title: { az: 'Sifarişin rəsmiləşdirilməsi', ru: 'Оформление заказа', en: 'Checkout' },
  your_details: { az: 'Əlaqə məlumatlarınız', ru: 'Ваши контакты', en: 'Your details' },
  order_summary: { az: 'Sifarişiniz', ru: 'Ваш заказ', en: 'Your order' },
  field_name: { az: 'Ad və soyad', ru: 'Имя и фамилия', en: 'Full name' },
  field_phone: { az: 'WhatsApp nömrəsi', ru: 'Номер WhatsApp', en: 'WhatsApp number' },
  whatsapp_invalid: {
    az: 'Nömrəni düzgün yazın: +994 50 123 45 67',
    ru: 'Введите номер правильно: +994 50 123 45 67',
    en: 'Enter a valid number: +994 50 123 45 67',
  },
  whatsapp_note: {
    az: 'Sifarişi təsdiqləmək üçün bu nömrədən sizinlə WhatsApp-da əlaqə saxlayacağıq. Nömrə işlək olmalıdır.',
    ru: 'Мы свяжемся с вами в WhatsApp по этому номеру, чтобы подтвердить заказ. Номер должен быть рабочим.',
    en: 'We will contact you on WhatsApp at this number to confirm your order. It must be a working number.',
  },
  field_address: { az: 'Çatdırılma ünvanı', ru: 'Адрес доставки', en: 'Delivery address' },
  field_note: { az: 'Qeyd (istəyə bağlı)', ru: 'Комментарий (необязательно)', en: 'Note (optional)' },
  note_placeholder: {
    az: 'Rəng, ölçü və ya çatdırılma vaxtı barədə istəyiniz',
    ru: 'Пожелания по цвету, размеру или времени доставки',
    en: 'Any wishes about colour, size or delivery time',
  },
  required_field: { az: 'Bu xana doldurulmalıdır', ru: 'Заполните это поле', en: 'This field is required' },
  phone_hint: { az: 'Məsələn: +994 50 123 45 67', ru: 'Например: +994 50 123 45 67', en: 'e.g. +994 50 123 45 67' },
  order_via_whatsapp: { az: 'WhatsApp ilə sifariş et', ru: 'Заказать через WhatsApp', en: 'Order via WhatsApp' },
  whatsapp_explain: {
    az: 'Düyməyə basdıqda WhatsApp açılacaq və sifarişiniz hazır mesaj kimi görünəcək. Göndərdikdən sonra sizinlə əlaqə saxlayacağıq.',
    ru: 'После нажатия откроется WhatsApp с готовым сообщением о заказе. Отправьте его — и мы свяжемся с вами.',
    en: 'Tapping the button opens WhatsApp with your order ready as a message. Send it and we will contact you.',
  },
  back_to_cart: { az: '← Səbətə qayıt', ru: '← Назад в корзину', en: '← Back to cart' },
  remember_me: {
    az: 'Məlumatlarımı yadda saxla',
    ru: 'Запомнить мои данные',
    en: 'Remember my details',
  },
  order_sent: {
    az: 'WhatsApp açıldı. Mesajı göndərməyi unutmayın!',
    ru: 'WhatsApp открыт. Не забудьте отправить сообщение!',
    en: 'WhatsApp opened. Don’t forget to send the message!',
  },
  wa_greeting: { az: 'Salam! Yeni sifariş', ru: 'Здравствуйте! Новый заказ', en: 'Hello! New order' },
  wa_total: { az: 'Cəmi', ru: 'Итого', en: 'Total' },
  wa_customer: { az: 'Müştəri', ru: 'Покупатель', en: 'Customer' },

  // Favorites
  fav_title: { az: 'Sevimliləriniz', ru: 'Избранное', en: 'Favorites' },
  fav_empty: { az: 'Sevimlilər siyahısı boşdur', ru: 'Список избранного пуст', en: 'No favorites yet' },
  fav_empty_desc: {
    az: 'Ürək işarəsinə toxunaraq məhsulları buraya əlavə edin.',
    ru: 'Добавляйте товары, нажимая на сердечко.',
    en: 'Add products by tapping the heart icon.',
  },

  // Promo / marquee
  promo_title: {
    az: 'Mövsüm sonu satışı — 40%-ə qədər endirim',
    ru: 'Сезонная распродажа — скидки до 40%',
    en: 'End of season sale — up to 40% off',
  },
  promo_desc: {
    az: 'Sevdiyiniz modelləri əlçatan qiymətlərlə əldə edin. Say məhduddur!',
    ru: 'Любимые модели по доступным ценам. Количество ограничено!',
    en: 'Get your favorite styles at great prices. Limited stock!',
  },
  promo_cta: { az: 'Endirimləri kəşf et', ru: 'Смотреть скидки', en: 'Explore deals' },
  m_new_collection: { az: 'Yeni Kolleksiya 2026', ru: 'Новая коллекция 2026', en: 'New Collection 2026' },
  m_free_delivery: {
    az: 'Pulsuz çatdırılma — 100 ₼-dən yuxarı',
    ru: 'Бесплатная доставка — от 100 ₼',
    en: 'Free delivery — over 100 ₼',
  },
  m_season_sale: { az: 'Mövsüm sonu endirimləri', ru: 'Сезонные скидки', en: 'Season sale' },
  m_returns: { az: '14 gün ərzində geri qaytarma', ru: 'Возврат в течение 14 дней', en: '14-day returns' },
  m_premium: { az: 'Premium keyfiyyət', ru: 'Премиум качество', en: 'Premium quality' },

  // Footer
  footer_tagline: {
    az: 'Qadın zərifliyini hər detala daşıyan geyim brendi. Keyfiyyət, zövq və rahatlıq bir arada.',
    ru: 'Бренд одежды, что несёт женскую элегантность в каждой детали. Качество, вкус и комфорт вместе.',
    en: 'A clothing brand bringing feminine elegance to every detail. Quality, taste and comfort together.',
  },
  newsletter_placeholder: { az: 'E-poçt ünvanınız', ru: 'Ваш e-mail', en: 'Your e-mail' },
  subscribe: { az: 'Abunə ol', ru: 'Подписаться', en: 'Subscribe' },
  shop: { az: 'Mağaza', ru: 'Магазин', en: 'Shop' },
  new_arrivals: { az: 'Yeni gələnlər', ru: 'Новинки', en: 'New arrivals' },
  help: { az: 'Kömək', ru: 'Помощь', en: 'Help' },
  delivery_link: { az: 'Çatdırılma', ru: 'Доставка', en: 'Delivery' },
  returns_link: { az: 'Geri qaytarma', ru: 'Возврат', en: 'Returns' },
  size_guide: { az: 'Ölçü cədvəli', ru: 'Таблица размеров', en: 'Size guide' },
  faq: { az: 'Tez-tez verilən suallar', ru: 'Частые вопросы', en: 'FAQ' },
  rights: {
    az: 'Bütün hüquqlar qorunur.',
    ru: 'Все права защищены.',
    en: 'All rights reserved.',
  },
  subscribed: { az: 'Abunə oldunuz! ✓', ru: 'Вы подписаны! ✓', en: 'Subscribed! ✓' },
}

// Tag tərcümələri
export const tagLabels = {
  bestseller: { az: 'Bestseller', ru: 'Хит', en: 'Bestseller' },
  new: { az: 'Yeni', ru: 'Новинка', en: 'New' },
  sale: { az: 'Endirim', ru: 'Скидка', en: 'Sale' },
}
