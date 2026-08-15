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
    az: 'Məhsul və ya kod axtar...',
    ru: 'Поиск по названию или коду...',
    en: 'Search by name or code...',
  },
  favorites: { az: 'Sevimlilər', ru: 'Избранное', en: 'Favorites' },
  settings: { az: 'Ayarlar', ru: 'Настройки', en: 'Settings' },
  all_categories: { az: 'Bütün kateqoriyalar', ru: 'Все категории', en: 'All categories' },

  // Ayarlar (Settings) səhifəsi — hazırda UI
  settings_subtitle: {
    az: 'Mağaza tərcihlərinizi idarə edin',
    ru: 'Управляйте настройками магазина',
    en: 'Manage your store preferences',
  },
  settings_language: { az: 'Dil', ru: 'Язык', en: 'Language' },
  settings_notifications: { az: 'Bildirişlər', ru: 'Уведомления', en: 'Notifications' },
  settings_push: { az: 'Push bildirişləri', ru: 'Push-уведомления', en: 'Push notifications' },
  settings_promo_mail: { az: 'Kampaniya məktubları', ru: 'Письма об акциях', en: 'Promo emails' },
  settings_soon: { az: 'Tezliklə', ru: 'Скоро', en: 'Soon' },
  settings_about: { az: 'Haqqında', ru: 'О приложении', en: 'About' },
  settings_help: { az: 'Kömək və dəstək', ru: 'Помощь и поддержка', en: 'Help & support' },
  settings_terms: { az: 'İstifadə şərtləri', ru: 'Условия использования', en: 'Terms of use' },
  settings_privacy: { az: 'Məxfilik siyasəti', ru: 'Политика конфиденциальности', en: 'Privacy policy' },

  // Giriş / qeydiyyat
  sign_in: { az: 'Giriş', ru: 'Войти', en: 'Sign in' },
  sign_out: { az: 'Çıxış', ru: 'Выйти', en: 'Sign out' },
  switch_account: { az: 'Hesabı dəyiş', ru: 'Сменить аккаунт', en: 'Switch account' },
  continue_with_google: {
    az: 'Google ilə davam et',
    ru: 'Продолжить через Google',
    en: 'Continue with Google',
  },
  sign_in_title: { az: 'Hesaba giriş', ru: 'Вход в аккаунт', en: 'Sign in' },
  sign_in_why: {
    az: 'Giriş etsəniz, sifariş zamanı məlumatlarınız avtomatik dolacaq.',
    ru: 'После входа ваши данные будут подставляться в заказ автоматически.',
    en: 'Once signed in, your details are filled in automatically at checkout.',
  },
  sign_in_failed: {
    az: 'Giriş alınmadı. Bir azdan yenidən cəhd edin.',
    ru: 'Не удалось войти. Попробуйте ещё раз.',
    en: 'Sign-in failed. Please try again.',
  },
  my_account: { az: 'Hesabım', ru: 'Мой аккаунт', en: 'My account' },
  sign_up: { az: 'Qeydiyyat', ru: 'Регистрация', en: 'Sign up' },
  have_account: { az: 'Hesabınız var?', ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
  no_account: { az: 'Hesabınız yoxdur?', ru: 'Нет аккаунта?', en: 'No account yet?' },
  field_email: { az: 'E-poçt', ru: 'E-mail', en: 'Email' },
  field_password: { az: 'Şifrə', ru: 'Пароль', en: 'Password' },
  field_birth: { az: 'Doğum tarixi', ru: 'Дата рождения', en: 'Date of birth' },
  password_short: {
    az: 'Şifrə ən azı 6 simvol olmalıdır',
    ru: 'Пароль минимум 6 символов',
    en: 'Password must be at least 6 characters',
  },
  email_invalid: { az: 'E-poçt düzgün deyil', ru: 'Неверный e-mail', en: 'Invalid email' },
  or_divider: { az: 'və ya', ru: 'или', en: 'or' },
  confirm_sent_title: {
    az: 'Poçtunuzu təsdiqləyin',
    ru: 'Подтвердите почту',
    en: 'Confirm your email',
  },
  confirm_sent_text: {
    az: 'Sizə təsdiq məktubu göndərdik. Məktubdakı linkə keçin — sonra hesabınıza girə biləcəksiniz.',
    ru: 'Мы отправили письмо со ссылкой. Откройте её — после этого сможете войти.',
    en: 'We sent you a confirmation link. Open it, then you can sign in.',
  },
  check_spam: {
    az: 'Məktub gəlmirsə, «Spam» qovluğuna baxın.',
    ru: 'Если письма нет — загляните в папку «Спам».',
    en: 'If you don’t see it, check your Spam folder.',
  },
  email_not_confirmed: {
    az: 'Poçt hələ təsdiqlənməyib. Məktubdakı linkə keçin.',
    ru: 'Почта ещё не подтверждена. Откройте ссылку из письма.',
    en: 'Email not confirmed yet. Open the link we sent you.',
  },
  wrong_credentials: {
    az: 'E-poçt və ya şifrə yanlışdır',
    ru: 'Неверная почта или пароль',
    en: 'Wrong email or password',
  },
  weak_password: {
    az: 'Şifrə çox qısadır — ən azı 6 simvol olmalıdır',
    ru: 'Пароль слишком короткий — минимум 6 символов',
    en: 'Password is too short — at least 6 characters',
  },
  too_many_attempts: {
    az: 'Çox cəhd oldu. Bir neçə dəqiqə gözləyin və yenidən yoxlayın.',
    ru: 'Слишком много попыток. Подождите пару минут и попробуйте снова.',
    en: 'Too many attempts. Wait a couple of minutes and try again.',
  },
  auth_failed_generic: {
    az: 'Alınmadı. İnternet bağlantısını yoxlayın və yenidən cəhd edin.',
    ru: 'Не получилось. Проверьте интернет и попробуйте ещё раз.',
    en: 'Something went wrong. Check your connection and try again.',
  },
  sign_in_with_email: {
    az: 'E-poçt ilə daxil ol',
    ru: 'Войти по почте',
    en: 'Sign in with email',
  },
  email_taken: {
    az: 'Bu e-poçt artıq qeydiyyatdan keçib',
    ru: 'Эта почта уже зарегистрирована',
    en: 'This email is already registered',
  },
  forgot_password: { az: 'Şifrəni unutmusunuz?', ru: 'Забыли пароль?', en: 'Forgot password?' },
  reset_title: { az: 'Şifrənin bərpası', ru: 'Восстановление пароля', en: 'Reset password' },
  reset_intro: {
    az: 'E-poçtunuzu yazın — bərpa linki göndərəcəyik.',
    ru: 'Введите почту — пришлём ссылку для сброса.',
    en: 'Enter your email — we’ll send a reset link.',
  },
  reset_sent: {
    az: 'Bərpa linki göndərildi. Poçtunuzu yoxlayın (və «Spam» qovluğunu).',
    ru: 'Ссылка отправлена. Проверьте почту (и папку «Спам»).',
    en: 'Reset link sent. Check your email (and Spam).',
  },
  send_link: { az: 'Link göndər', ru: 'Отправить ссылку', en: 'Send link' },
  new_password: { az: 'Yeni şifrə', ru: 'Новый пароль', en: 'New password' },
  set_new_password: { az: 'Yeni şifrəni təyin et', ru: 'Задать новый пароль', en: 'Set new password' },
  password_updated: {
    az: 'Şifrə yeniləndi! İndi girə bilərsiniz.',
    ru: 'Пароль обновлён! Теперь можно войти.',
    en: 'Password updated! You can sign in now.',
  },
  reset_link_expired: {
    az: 'Bərpa linki köhnəlib. Yenidən sorğu göndərin.',
    ru: 'Ссылка устарела. Запросите новую.',
    en: 'The reset link has expired. Request a new one.',
  },
  back_to_login: { az: '← Girişə qayıt', ru: '← Назад ко входу', en: '← Back to sign in' },

  // Admin: sifarişlər
  tab_products: { az: 'Məhsullar', ru: 'Товары', en: 'Products' },
  tab_orders: { az: 'Sifarişlər', ru: 'Заказы', en: 'Orders' },
  status_new: { az: 'Yeni', ru: 'Новый', en: 'New' },
  status_contacted: { az: 'Əlaqə saxlanıldı', ru: 'Связались', en: 'Contacted' },
  status_confirmed: { az: 'Təsdiqləndi', ru: 'Подтверждён', en: 'Confirmed' },
  status_shipped: { az: 'Göndərildi', ru: 'Отправлен', en: 'Shipped' },
  status_done: { az: 'Tamamlandı', ru: 'Выполнен', en: 'Done' },
  status_cancelled: { az: 'Ləğv edildi', ru: 'Отменён', en: 'Cancelled' },
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
    az: 'Hər gününüzə yaraşan qadın geyimləri — yeni kolleksiya və endirimlər indi kataloqda.',
    ru: 'Женская одежда на каждый день — новая коллекция и скидки уже в каталоге.',
    en: 'Women’s clothing for every day — new collection and deals now in the catalog.',
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

  // Hero — redizayn (sosial sübut, üzən nişan, mini kart)
  hero_proof: {
    az: '500+ məmnun müştəri',
    ru: '500+ довольных клиенток',
    en: '500+ happy customers',
  },
  hero_card_title: {
    az: 'Yeni kolleksiya 2026',
    ru: 'Новая коллекция 2026',
    en: 'New collection 2026',
  },
  hero_card_cta: { az: 'Bax', ru: 'Смотреть', en: 'Shop now' },
  hero_off_label: { az: 'endirim', ru: 'скидка до', en: 'up to' },
  brand_statement_title: {
    az: 'Hər gün üçün seçilmiş zəriflik',
    ru: 'Элегантность, выбранная на каждый день',
    en: 'Elegance chosen for every day',
  },
  brand_statement_text: {
    az: 'ELVA kolleksiyası gündəlik rahatlığı incə siluetlər və asan kombinlərlə birləşdirir.',
    ru: 'Коллекция ELVA объединяет комфорт на каждый день с лаконичными силуэтами, которые легко сочетать.',
    en: 'The ELVA collection brings everyday comfort together with considered silhouettes that are easy to wear.',
  },
  brand_statement_cta: { az: 'Kolleksiyaya bax', ru: 'Смотреть коллекцию', en: 'Explore the collection' },
  benefits_title: { az: 'ELVA ilə rahat seçim', ru: 'Выбирать с ELVA легко', en: 'Choosing with ELVA is simple' },
  benefits_intro: {
    az: 'Məhsulu seçin, sevimlilərə əlavə edin və sifarişi bir neçə addımda tamamlayın.',
    ru: 'Выбирайте модели, сохраняйте избранное и оформляйте заказ в несколько шагов.',
    en: 'Choose a style, save favorites, and place an order in a few simple steps.',
  },
  benefit_choice: { az: 'Kolleksiyada rəng, ölçü və model üzrə rahat seçim.', ru: 'Удобный выбор по цвету, размеру и модели.', en: 'Easy choice by colour, size, and style.' },
  benefit_contact: { az: 'Sifarişdən sonra WhatsApp ilə əlaqə saxlayırıq.', ru: 'После заказа мы свяжемся с вами в WhatsApp.', en: 'We will contact you on WhatsApp after your order.' },
  benefit_languages: { az: 'Sayt Azərbaycan, rus və ingilis dillərində əlçatandır.', ru: 'Сайт доступен на азербайджанском, русском и английском.', en: 'The store is available in Azerbaijani, Russian, and English.' },

  // Kateqoriyalar zolağı
  cats_eyebrow: { az: 'Kateqoriyalar', ru: 'Категории', en: 'Categories' },
  cats_title: {
    az: 'Üslubunuza görə seçin',
    ru: 'Выбирайте по стилю',
    en: 'Shop by style',
  },


  // Catalog
  collection: { az: 'Kolleksiya', ru: 'Коллекция', en: 'Collection' },
  new_in_eyebrow: { az: 'Yeni', ru: 'Новинки', en: 'New in' },
  popular_products: { az: 'Populyar məhsullar', ru: 'Популярные товары', en: 'Popular products' },
  discounts_title: { az: 'Endirimlər', ru: 'Скидки', en: 'Sale' },
  view_all: { az: 'Hamısına bax', ru: 'Смотреть все', en: 'View all' },
  all_products: { az: 'Bütün məhsullar', ru: 'Все товары', en: 'All products' },
  sort_by: { az: 'Sıralama', ru: 'Сортировка', en: 'Sort by' },
  sort_popular: { az: 'Populyar', ru: 'Популярные', en: 'Popular' },
  sort_new: { az: 'Ən yenilər', ru: 'Сначала новые', en: 'Newest first' },
  sort_price_asc: { az: 'Ucuzdan bahaya', ru: 'Сначала дешёвые', en: 'Price: low to high' },
  sort_price_desc: { az: 'Bahadan ucuza', ru: 'Сначала дорогие', en: 'Price: high to low' },
  sort_rating: { az: 'Reytinqə görə', ru: 'По рейтингу', en: 'By rating' },
  sort_discount: { az: 'Endirimə görə', ru: 'По скидке', en: 'By discount' },
  filters: { az: 'Filtrlər', ru: 'Фильтры', en: 'Filters' },
  // Aşağı tab paneli + mobil filtr pərdəsi
  menu: { az: 'Menyu', ru: 'Меню', en: 'Menu' },
  apply: { az: 'Tətbiq et', ru: 'Применить', en: 'Apply' },
  filters_and_sort: {
    az: 'Filtrlər və sıralama',
    ru: 'Фильтры и сортировка',
    en: 'Filters and sorting',
  },
  close: { az: 'Bağla', ru: 'Закрыть', en: 'Close' },
  back: { az: 'Geri', ru: 'Назад', en: 'Back' },
  language: { az: 'Dil', ru: 'Язык', en: 'Language' },
  // Rəng variantları
  out_of_stock: { az: 'Stokda yoxdur', ru: 'Нет в наличии', en: 'Out of stock' },
  // Mobil alış paneli (məhsul səhifəsi)
  added_to_cart: { az: 'Əlavə olundu', ru: 'Добавлено', en: 'Added' },
  go_to_cart: { az: 'Səbətə keç', ru: 'В корзину', en: 'Go to cart' },
  loading: { az: 'Yüklənir…', ru: 'Загрузка…', en: 'Loading…' },
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
  no_exact_matches: {
    az: 'Dəqiq nəticə tapılmadı. Oxşar məhsullar',
    ru: 'Точных совпадений не найдено. Похожие товары',
    en: 'No exact matches found. Similar products',
  },
  // Yalnız informativ mesaj (alert). "Oxşar məhsullar" ayrıca bölmə başlığıdır
  // (t('related')) — birləşmiş `no_exact_matches` artıq UI-da istifadə olunmur.
  no_exact_matches_short: {
    az: 'Dəqiq nəticə tapılmadı.',
    ru: 'Точных совпадений не найдено.',
    en: 'No exact matches found.',
  },

  // --- Promokod (checkout) ---
  promo_title: { az: 'Promokod', ru: 'Промокод', en: 'Promo code' },
  promo_placeholder: { az: 'Kod daxil edin', ru: 'Введите код', en: 'Enter code' },
  promo_apply: { az: 'Tətbiq et', ru: 'Применить', en: 'Apply' },
  promo_remove: { az: 'Sil', ru: 'Убрать', en: 'Remove' },
  promo_applied: { az: 'Promokod tətbiq olundu', ru: 'Промокод применён', en: 'Promo code applied' },
  promo_discount: { az: 'Endirim', ru: 'Скидка', en: 'Discount' },
  promo_only_one: {
    az: 'Bir sifarişə yalnız bir promokod tətbiq olunur.',
    ru: 'На один заказ применяется только один промокод.',
    en: 'Only one promo code per order.',
  },
  promo_err_PROMO_NOT_FOUND: { az: 'Belə promokod yoxdur.', ru: 'Такого промокода нет.', en: 'Promo code not found.' },
  promo_err_PROMO_INACTIVE: { az: 'Promokod aktiv deyil.', ru: 'Промокод неактивен.', en: 'Promo code is inactive.' },
  promo_err_PROMO_EXPIRED: { az: 'Promokodun vaxtı bitib.', ru: 'Срок промокода истёк.', en: 'Promo code expired.' },
  promo_err_PROMO_NOT_STARTED: { az: 'Promokod hələ aktiv deyil.', ru: 'Промокод ещё не активен.', en: 'Promo code is not active yet.' },
  promo_err_PROMO_ACCOUNT_MISMATCH: { az: 'Bu promokod başqa hesaba aiddir.', ru: 'Промокод принадлежит другому аккаунту.', en: 'This code belongs to another account.' },
  promo_err_PROMO_ALREADY_USED: { az: 'Bu promokoddan artıq istifadə etmisiniz.', ru: 'Вы уже использовали этот промокод.', en: 'You have already used this code.' },
  promo_err_PROMO_LIMIT_REACHED: { az: 'Promokodun istifadə limiti bitib.', ru: 'Лимит использования промокода исчерпан.', en: 'Promo usage limit reached.' },
  promo_err_PROMO_MIN_ORDER: { az: 'Sifariş məbləği minimuma çatmır.', ru: 'Сумма заказа ниже минимальной.', en: 'Order amount is below the minimum.' },
  promo_err_AUTH_REQUIRED: { az: 'Promokod üçün daxil olun.', ru: 'Войдите, чтобы применить промокод.', en: 'Sign in to use a promo code.' },
  promo_err_PROMO_INVALID: { az: 'Promokod tətbiq olunmadı.', ru: 'Промокод не применён.', en: 'Promo code could not be applied.' },

  // --- Wheel of Fortune ---
  wheel_invite_title: { az: 'Şansını sına', ru: 'Испытай удачу', en: 'Try your luck' },
  wheel_invite_text: {
    az: 'Endirim çarxını fırlat və endirim qazan!',
    ru: 'Крути колесо и выиграй скидку!',
    en: 'Spin the wheel and win a discount!',
  },
  wheel_spin: { az: 'Fırlat', ru: 'Крутить', en: 'Spin' },
  wheel_spinning: { az: 'Fırlanır…', ru: 'Крутится…', en: 'Spinning…' },
  wheel_login_required: {
    az: 'Endirim çarxını fırlatmaq üçün daxil olun.',
    ru: 'Войдите, чтобы крутить колесо скидок.',
    en: 'Sign in to spin the discount wheel.',
  },
  wheel_already_spun: {
    az: 'Bu dövr üçün artıq fırlatmısınız. Növbəti dövrdə yenidən cəhd edin.',
    ru: 'В этом окне вы уже крутили. Попробуйте в следующем.',
    en: 'You already spun in this window. Try the next one.',
  },
  wheel_win_title: { az: 'Təbriklər!', ru: 'Поздравляем!', en: 'Congratulations!' },
  wheel_win_text: {
    az: '{percent}% endirim qazandınız!',
    ru: 'Вы выиграли скидку {percent}%!',
    en: 'You won a {percent}% discount!',
  },
  wheel_use_reward: { az: 'Endirimi istifadə et', ru: 'Использовать скидку', en: 'Use discount' },
  wheel_reward_hint: {
    az: 'Kod ödənişdə avtomatik tətbiq olunacaq.',
    ru: 'Код автоматически применится при оформлении.',
    en: 'The code will apply automatically at checkout.',
  },
  wheel_error: { az: 'Xəta baş verdi. Yenidən cəhd edin.', ru: 'Произошла ошибка. Попробуйте ещё раз.', en: 'Something went wrong. Try again.' },
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
  field_code: { az: 'Kod', ru: 'Код', en: 'Code' },
  wa_code: { az: 'kod', ru: 'код', en: 'code' },
  wa_phone: { az: 'Telefon nömrəsi', ru: 'Номер телефона', en: 'Phone number' },
  color: { az: 'Rəng', ru: 'Цвет', en: 'Color' },
  description: { az: 'Təsvir', ru: 'Описание', en: 'Description' },
  product_desc_generic: {
    az: 'Keyfiyyətli materialdan hazırlanmış, rahat və zərif model. Gündəlik və xüsusi anlar üçün idealdır.',
    ru: 'Модель из качественного материала — удобная и элегантная. Идеальна для повседневных и особых случаев.',
    en: 'Made from quality material — comfortable and elegant. Perfect for everyday and special occasions.',
  },
  delivery: { az: 'Çatdırılma', ru: 'Доставка', en: 'Delivery' },
  // Çatdırılma üsulu (Checkout)
  delivery_method: { az: 'Çatdırılma üsulu', ru: 'Способ доставки', en: 'Delivery method' },
  delivery_standard: { az: 'Standart çatdırılma', ru: 'Стандартная доставка', en: 'Standard delivery' },
  delivery_express: { az: 'Ekspress çatdırılma', ru: 'Экспресс-доставка', en: 'Express delivery' },
  delivery_standard_time: { az: '1–3 iş günü', ru: '1–3 рабочих дня', en: '1–3 business days' },
  delivery_express_time: { az: '6 saata qədər', ru: 'до 6 часов', en: 'up to 6 hours' },
  delivery_free: { az: 'Pulsuz', ru: 'Бесплатно', en: 'Free' },
  products_subtotal: { az: 'Məhsullar', ru: 'Товары', en: 'Products' },
  delivery_info: {
    az: '1-3 gün · 100 ₼-dən yuxarı pulsuz',
    ru: '1–3 дня · бесплатно от 100 ₼',
    en: '1–3 days · free over 100 ₼',
  },
  // Ox mətndə DEYİL, CSS-də (.back-link::before) — yoxsa iki ox görünür
  back_to_catalog: { az: 'Kataloqa qayıt', ru: 'Назад в каталог', en: 'Back to catalog' },
  back: { az: 'Geri', ru: 'Назад', en: 'Back' },
  share: { az: 'Paylaş', ru: 'Поделиться', en: 'Share' },
  link_copied: { az: 'Keçid kopyalandı', ru: 'Ссылка скопирована', en: 'Link copied' },
  // Məhsul şəkli üzərindəki İKİ nişan (lokallaşdırılmış — türk mətni yoxdur)
  badge_free_delivery: { az: 'Pulsuz çatdırılma', ru: 'Бесплатная доставка', en: 'Free delivery' },
  badge_ships_fast: { az: 'Sabah göndərilir', ru: 'Отправка завтра', en: 'Ships tomorrow' },
  // Qalereya aria-etiketləri (əvvəllər kodda sabit AZ mətni idi → i18n-ə köçdü)
  image_prev: { az: 'Əvvəlki şəkil', ru: 'Предыдущее фото', en: 'Previous image' },
  image_next: { az: 'Növbəti şəkil', ru: 'Следующее фото', en: 'Next image' },
  product_images: { az: 'Məhsul şəkilləri', ru: 'Фото товара', en: 'Product images' },
  image_word: { az: 'Şəkil', ru: 'Фото', en: 'Photo' },
  // Xarakteristika etiketləri (yalnız məhsulda həqiqi dəyər olduqda göstərilir)
  attr_material: { az: 'Parça', ru: 'Материал', en: 'Material' },
  attr_fit: { az: 'Kəsim', ru: 'Крой', en: 'Fit' },
  attr_neckline: { az: 'Yaxa', ru: 'Вырез', en: 'Neckline' },
  attr_season: { az: 'Mövsüm', ru: 'Сезон', en: 'Season' },
  related: { az: 'Oxşar məhsullar', ru: 'Похожие товары', en: 'Related products' },
  choose_size_first: {
    az: 'Zəhmət olmasa ölçü seçin',
    ru: 'Пожалуйста, выберите размер',
    en: 'Please select a size',
  },
  choose_size_on_product: {
    az: 'Ölçünü seçmək üçün məhsulun səhifəsini açın',
    ru: 'Чтобы выбрать размер, откройте страницу товара',
    en: 'Open the product page to choose a size',
  },
  google_auth_required: {
    az: 'Məhsulu səbətə əlavə etmək üçün Google ilə daxil olun.',
    ru: 'Чтобы добавить товар в корзину, войдите через Google.',
    en: 'Sign in with Google to add items to your cart.',
  },
  // Səbət artıq girişsiz işləyir — giriş yalnız sifarişin təsdiqindədir
  checkout_auth_required: {
    az: 'Son addım: sifarişi təsdiqləmək üçün Google ilə daxil olun. Doldurduğunuz məlumatlar saxlanılacaq.',
    ru: 'Последний шаг: чтобы подтвердить заказ, войдите через Google. Заполненные данные сохранятся.',
    en: 'Last step: sign in with Google to confirm the order. Your details will be kept.',
  },
  favorites_auth_required: {
    az: 'Məhsulu sevimlilərə əlavə etmək üçün hesabınıza daxil olun.',
    ru: 'Чтобы добавить товар в избранное, войдите в аккаунт.',
    en: 'Sign in to add this item to your favorites.',
  },
  google_auth_action: { az: 'Google ilə daxil ol', ru: 'Войти через Google', en: 'Sign in with Google' },
  checkout_form_incomplete: {
    az: 'Qırmızı ilə işarələnmiş xanaları yoxlayın.',
    ru: 'Проверьте поля, выделенные красным.',
    en: 'Check the fields highlighted in red.',
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
  // Uğurlu sifarişdən sonra boş səbətdə göstərilir (əl ilə silmədən fərqli)
  continue_shopping: { az: 'Alış-verişə davam et', ru: 'Продолжить покупки', en: 'Continue shopping' },
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
  // Sifariş göndərildi
  field_phone_call: { az: 'Zəng üçün mobil nömrə', ru: 'Мобильный для звонка', en: 'Mobile for calls' },
  same_as_whatsapp: {
    az: 'Zəng nömrəsi WhatsApp nömrəsi ilə eynidir',
    ru: 'Номер для звонка совпадает с WhatsApp',
    en: 'Call number is the same as WhatsApp',
  },
  place_order: { az: 'Sifarişi göndər', ru: 'Отправить заказ', en: 'Place order' },
  order_sending: { az: 'Göndərilir…', ru: 'Отправляем…', en: 'Sending…' },
  order_ok_title: {
    az: 'Sifarişiniz qəbul edildi!',
    ru: 'Заказ принят!',
    en: 'Order received!',
  },
  order_ok_text: {
    az: '5 dəqiqə ərzində WhatsApp vasitəsilə sizinlə əlaqə saxlayacağıq.',
    ru: 'В течение 5 минут мы свяжемся с вами в WhatsApp.',
    en: 'We will contact you on WhatsApp within 5 minutes.',
  },
  order_redirect_notice: {
    az: '{seconds} san. sonra əsas səhifəyə yönləndiriləcəksiniz.',
    ru: 'Вы будете перенаправлены на главную страницу через {seconds} с.',
    en: 'You will be redirected to the home page in {seconds} seconds.',
  },
  recovery_title: {
    az: 'Səhifəni yeniləmək lazımdır',
    ru: 'Страницу нужно обновить',
    en: 'This page needs to be refreshed',
  },
  recovery_text: {
    az: 'Sayt yenilənib. Zəhmət olmasa səhifəni yenidən açın.',
    ru: 'Сайт был обновлён. Пожалуйста, перезагрузите страницу.',
    en: 'The site has been updated. Please reload the page.',
  },
  recovery_reload: { az: 'Yenilə', ru: 'Обновить', en: 'Reload' },
  order_number: { az: 'Sifariş nömrəsi', ru: 'Номер заказа', en: 'Order number' },
  order_failed: {
    az: 'Sifariş göndərilmədi. Yenidən cəhd edin.',
    ru: 'Не удалось отправить заказ. Попробуйте ещё раз.',
    en: 'Could not send the order. Please try again.',
  },
  // Giriş artıq yalnız Google deyil — e-poçt da var
  order_auth_required: {
    az: 'Sifariş üçün hesabınıza daxil olun.',
    ru: 'Для оформления заказа войдите в аккаунт.',
    en: 'Sign in to place an order.',
  },
  order_cart_empty: {
    az: 'Səbət boşdur. Əvvəl məhsul əlavə edin.',
    ru: 'Корзина пуста. Сначала добавьте товар.',
    en: 'Your cart is empty. Add an item first.',
  },
  order_fields_required: {
    az: 'Ad, WhatsApp nömrəsi və çatdırılma ünvanını doldurun.',
    ru: 'Заполните имя, номер WhatsApp и адрес доставки.',
    en: 'Enter your name, WhatsApp number and delivery address.',
  },
  order_invalid_item: {
    az: 'Səbətdə düzgün olmayan məhsul var. Səbəti yeniləyin.',
    ru: 'В корзине есть некорректный товар. Обновите корзину.',
    en: 'Your cart contains an invalid item. Refresh the cart.',
  },
  order_product_unavailable: {
    az: 'Məhsullardan biri artıq satışda deyil. Səbəti yeniləyin.',
    ru: 'Один из товаров больше не продаётся. Обновите корзину.',
    en: 'One item is no longer available. Refresh your cart.',
  },
  order_size_invalid: {
    az: 'Məhsul üçün düzgün ölçü seçin.',
    ru: 'Выберите доступный размер товара.',
    en: 'Select an available product size.',
  },
  cart_unavailable_notice: {
    az: 'Bəzi məhsullar artıq stokda yoxdur. Davam etmək üçün onları səbətdən silin.',
    ru: 'Некоторых товаров больше нет в наличии. Удалите их из корзины, чтобы продолжить.',
    en: 'Some items are no longer in stock. Remove them from the cart to continue.',
  },
  order_service_unavailable: {
    az: 'Sifarişi hazırda göndərmək alınmadı. Bir az sonra yenidən cəhd edin.',
    ru: 'Сейчас не удалось оформить заказ. Попробуйте немного позже.',
    en: 'We could not place your order right now. Please try again shortly.',
  },
  order_explain: {
    az: 'Sifarişi göndərdikdən sonra operatorumuz WhatsApp-dan yazacaq və detalları dəqiqləşdirəcək.',
    ru: 'После отправки наш оператор напишет вам в WhatsApp и уточнит детали.',
    en: 'After you send the order, our operator will message you on WhatsApp to confirm details.',
  },

  whatsapp_explain: {
    az: 'WhatsApp hazır mesajla açılacaq — sadəcə «Göndər» düyməsinə basın. Sifarişi aldıqdan sonra sizinlə əlaqə saxlayacağıq.',
    ru: 'WhatsApp откроется с готовым сообщением — вам останется нажать «Отправить». После получения заказа мы свяжемся с вами.',
    en: 'WhatsApp opens with the message ready — just press “Send”. We will contact you once we receive the order.',
  },
  // Bu da .back-link sinfindədir — ox CSS-dən gəlir, mətndə olmamalıdır
  back_to_cart: { az: 'Səbətə qayıt', ru: 'Назад в корзину', en: 'Back to cart' },
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
  // {name} müştərinin adı ilə əvəz olunur
  wa_intro: {
    az: 'Salam! Mənim adım {name}. Aşağıdakı məhsulları sifariş etmək istəyirəm:',
    ru: 'Здравствуйте! Меня зовут {name}. Хочу заказать следующие товары:',
    en: 'Hello! My name is {name}. I would like to order the following items:',
  },
  wa_total: { az: 'Cəmi', ru: 'Итого', en: 'Total' },
  wa_customer: { az: 'Əlaqə məlumatlarım', ru: 'Мои контакты', en: 'My contact details' },
  wa_thanks: {
    az: 'Sifarişi təsdiqləməyinizi xahiş edirəm. Təşəkkürlər!',
    ru: 'Прошу подтвердить заказ. Спасибо!',
    en: 'Please confirm my order. Thank you!',
  },

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
