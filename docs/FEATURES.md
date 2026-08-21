# FEATURES — реализованные функции

Все реализованные функции. Новые — **сверху**.

Шаблон:

```
## [F-XXX] Название
- **Описание:** что делает функция для пользователя/системы.
- **Дата:** ГГГГ-ММ-ДД
- **Изменённые файлы:** список ключевых файлов.
- **Связанные задачи:** коммиты, BUGS #, DECISIONS #.
```

---

## [F-018] Procurement-first Product lifecycle (Supplier → Закупка → черновик Товара → публикация)
- **Описание:** бизнес-flow создания товара переведён на «сначала закупка». В закупке теперь хранятся полноценные данные физически купленного товара: **фото** (переиспользован общий product image uploader/бакет), **варианты** (цвет → размеры с количеством; количество считается из вариантов), SKU, название, категория (опц.), закуп. цена и опц. плановая цена продажи. Из закупки кнопкой **«Добавить в Товары»** создаётся **ЧЕРНОВИК** товара (`is_active=false`, `in_stock=true`, цена 0) с переносом SKU/названия/фото/цветов/размеров; закупочная цена в товар НЕ попадает. Owner затем в «Товары» задаёт цену продажи/описание/категорию и публикует существующим flow. Повторное нажатие/двойной клик не создаёт дубль (атомарный серверный перенос по product_id); если товар с таким SKU уже есть — закупка **линкуется** к нему («Открыть товар»), а не плодит копии.
- **UX-правки закупок:** «Добавить закупку» — вверху рядом с заголовком (section-head, справа на desktop); форма — **центральный modal** (backdrop, max-height, скролл внутри; на мобильном почти full-screen) вместо узкого правого drawer. Из формы убраны: Магазин/точка, Способ оплаты, Статус, Ссылка на чек/URL (+ подпись про хранилище), Продано. Убран фильтр статусов и упоминания «точки» (поиск/описание). Summary-карточки: Сегодня закупок / Сумма закупок / **Закуплено единиц** / Ожидаемая прибыль (— если нет плановой цены). Таблица: Фото, Товар, SKU, Поставщик, Дата, Кол-во, Закуп., Сумма, **статус переноса** (В Товарах / Не добавлен) + действия.
- **Закуп. цена vs цена продажи:** закупочная цена — confidential (RLS is_admin, не в public product API). Цена продажи живёт в `products.price`, задаётся owner в «Товары». Перенос их не смешивает.
- **Аналитика — ТОЛЬКО закупки:** метрики партии/единицы/расходы/средняя закуп. цена/ожидаемые выручка+прибыль (expected, только где задана цена продажи) + разбивки по поставщику/товару. Продажи/orders/revenue НЕ подмешиваются (см. D-010). Sales Analytics и Combined Profit Analytics — отдельные будущие модули (TODO).
- **Stock:** модель товара — булев `in_stock` (нет числового склада), поэтому перенос ставит `in_stock=true` без числового инкремента; количество/варианты хранятся в закупке (история). Числовой per-variant склад — будущий этап (документировано). Идемпотентность переноса — флаг `stock_applied` + `product_id`.
- **Безопасность/аудит:** `procurements/suppliers` — RLS только is_admin; `promote_procurement_to_product` — SECURITY DEFINER + is_admin, атомарно (row lock). Аудит `PROCUREMENT_TO_PRODUCT` / `PROCUREMENT_LINKED_EXISTING_PRODUCT` (procurement_id, product_id, без секретов). Не тронуты: OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront.
- **Дата:** 2026-08-22
- **Изменённые файлы:** `supabase/procurement-product-flow.sql` (new), `src/admin/procurement.js`, `src/components/admin/ProcurementPanel.jsx` (modal+фото+варианты+перенос), `src/components/admin/AnalyticsPanel.jsx` (procurement-only), `src/pages/AdminPage.jsx` (header CTA + props), `src/styles/index.css`, `tests/money.test.mjs` (+5).
- **Связанные задачи:** продолжение F-017; DECISIONS #D-010. OWNER: выполнить `supabase/procurement-product-flow.sql`.

## [F-017] Admin: вертикальный sidebar + модули Закупки / Поставщики / Аналитика
- **Описание:** навигация админки переведена с горизонтальных вкладок на **вертикальный левый sidebar** (SaaS-стиль, розово-кремовая палитра LaVenta, иконки, active/hover, «Настройки» внизу → storefront `/settings`). На мобильном sidebar сворачивается в drawer (гамбургер). На `/admin` витринные Header/Footer/TabBar больше не рендерятся — админка это самостоятельный дашборд с собственным topbar. Порядок модулей: Товары, Заказы, Промокоды, Колесо фортуны, Пользователи, **Закупки**, **Поставщики**, **Аналитика**, Системные логи.
- **Закупки:** учёт закупочных партий (товар из каталога или ручной SKU, поставщик+точка, дата, кол-во, закуп. и план. цена продажи, статус, оплата, чек-URL, примечание). Summary-карточки (сегодня закупок / сумма за период / ожидаемая прибыль / товаров в пути), поиск (товар/SKU/поставщик/точка), фильтры (период/поставщик/статус/категория), сортировка (дата/сумма/прибыль/кол-во/маржа), пагинация, таблица (mobile→карточки), drawer add/edit с **live-расчётом** (сумма/выручка/прибыль/маржа/наценка/остаток). Архивирование (soft-delete) вместо удаления.
- **Поставщики:** CRUD поставщиков + их торговых точек (1..N; рынок/город/ряд/магазин/телефон). Dependent dropdown в форме закупки — показываются только точки выбранного поставщика (сервер тоже проверяет принадлежность). Статистика по поставщику (закупок/сумма/ожид. прибыль/последняя) из реальных записей.
- **Аналитика:** период + пресеты (неделя/месяц/квартал), метрики (расходы/ожид. выручка/ожид. прибыль/средняя маржа/продано/остаток/факт. прибыль/в пути) через is_admin-RPC `procurement_analytics`, разбивки по поставщику и товару. Явно разделены «Ожидаемая» и «Фактическая» прибыль; ограничение задокументировано (нет FIFO-автосписания по заказам).
- **Формулы (единый источник `src/lib/money.js`, БД дублирует GENERATED-колонками):** `purchase_total = закуп×кол-во`, `expected_revenue = продажа×кол-во`, `expected_profit = (продажа−закуп)×кол-во`, `margin% = прибыль/выручка×100`, `markup% = прибыль/себестоимость×100` (margin ≠ markup), `remaining = кол-во − продано`, `actual_profit = (продажа−закуп)×продано`.
- **Безопасность:** таблицы `suppliers/supplier_points/procurements` — RLS ON, доступ ТОЛЬКО `public.is_admin()` (owner). anon/обычный пользователь не читают закупочные цены/контакты/прибыль. Аналитика — SECURITY DEFINER + is_admin. Аудит `PROCUREMENT_/SUPPLIER_*` в System Logs. service_role во фронте нет; второй auth-клиент не создавался. Не тронуты: OTP/404/impersonation/promos/wheel/orders/delivery.
- **Дата:** 2026-08-22
- **Изменённые файлы:** `supabase/procurement-module.sql` (new), `src/lib/money.js` (new), `tests/money.test.mjs` (new), `src/admin/procurement.js` (new), `src/components/admin/ProcurementPanel.jsx` / `SuppliersPanel.jsx` / `AnalyticsPanel.jsx` (new), `src/pages/AdminPage.jsx` (sidebar shell), `src/App.jsx` (скрытие витринного chrome на /admin), `src/styles/index.css`.
- **Связанные задачи:** DECISIONS #D-009. OWNER: выполнить `supabase/procurement-module.sql`.

## [F-016] Индивидуальный промокод по User ID + User ID в профиле
- **Описание:** у каждого зарегистрированного пользователя в «Настройки → Мой аккаунт» показан его **User ID** — реальный immutable Supabase Auth UUID (read-only, кнопка «Копировать» → копируется ПОЛНЫЙ UUID, feedback «ID скопирован»). i18n AZ/RU/EN, mobile-first (длинный UUID переносится и не ломает ширину). В Admin → Промокоды для типа «Персональный» owner вставляет этот User ID, жмёт «Найти» → сервер (`admin_find_user`, is_admin-gated) находит реального пользователя (имя/email/User ID показываются для подтверждения) → промокод привязывается к target UUID. В списке промокодов у индивидуальных показан User ID.
- **Безопасность:** принадлежность индивидуального промокода проверяется server-side (`_validate_promo`: `type='individual' AND assigned_account_id = auth.uid()`), поэтому чужой пользователь с тем же кодом получает `PROMO_ACCOUNT_MISMATCH`. Поиск пользователя закрыт `is_admin()` (SECURITY DEFINER); UUID-формат валидируется и на клиенте (UX), и на сервере (`INVALID_USER_ID`/`USER_NOT_FOUND`). service_role во фронте нет; RLS не ослаблена; профиль показывает только собственный UUID пользователя.
- **Дата:** 2026-08-21
- **Изменённые файлы:** `src/pages/SettingsPage.jsx`, `src/pages/AdminPage.jsx` (PromoPanel), `src/admin/db.js` (`findUserById`/`isUuid`), `src/i18n/translations.js`, `src/styles/index.css`, `supabase/delivery-and-individual-promo.sql` (`admin_find_user`).
- **Связанные задачи:** опирается на F-010 (promo-движок). OWNER: выполнить `supabase/delivery-and-individual-promo.sql`.

## [F-015] Новая логика доставки (standard/express) с единым расчётом и персистентностью
- **Описание:** единый источник истины `src/lib/delivery.js` (`getDeliveryPrice(subtotalAfterDiscount, type)`). **Standard:** товары после скидки ≥ 100 ₼ → бесплатно, < 100 ₼ → 3 ₼; ETA «в течение 3 календарных дней» (AZ «3 gün ərzində» / RU «В течение 3 дней» / EN «Within 3 days» — слово «рабочих» удалено). **Express:** всегда 7 ₼ (бесплатная доставка от 100 ₼ на express НЕ распространяется). Порог 100 ₼ считается по стоимости ТОВАРОВ после скидки/промокода (доставка в порог не входит). Checkout показывает Товары/Скидку/Доставку/Итого; товарный бейдж «Pulsuz çatdırılma» переформулирован в честный «Бесплатно от 100 ₼».
- **Персистентность:** сервер (`place_order`, 9-арг + `public.delivery_fee`) считает доставку авторитетно и сохраняет `delivery_type`/`delivery_fee` + `total = (товары − скидка) + доставка`. Admin → Orders показывает тип/стоимость доставки и скидку. Исторические заказы не переписываются. Клиент шлёт только тип доставки (`p_delivery_type`), стоимость считает БД; при отсутствии 9-арг сигнатуры (до применения SQL) фронт откатывается к 8-арг (доставка в note) — checkout не ломается.
- **Дата:** 2026-08-21
- **Изменённые файлы:** `src/lib/delivery.js` (new), `tests/delivery.test.mjs` (new, 16 тестов), `src/pages/CheckoutPage.jsx`, `src/lib/orders.js`, `src/pages/AdminPage.jsx` (Orders), `src/i18n/translations.js`, `src/data/promos.js`, `src/styles/index.css`, `supabase/delivery-and-individual-promo.sql`.
- **Связанные задачи:** DECISIONS #D-005. OWNER: выполнить `supabase/delivery-and-individual-promo.sql`.

## [F-014] Admin → «Войти как пользователь» (owner impersonation реального аккаунта)
- **Описание:** в Admin → Пользователи у каждого не-owner — кнопка **«Войти как пользователь»** (у owner — «Текущий аккаунт»). По клику owner переходит в обычную витрину и работает с **РЕАЛЬНЫМИ persisted данными выбранного пользователя** (корзина, избранное, профиль-имя/email, wheel-купон; заказы — RPC есть, storefront-страницы заказов пока нет). Не клон/preview/mock. Разрешённые записи (add/remove корзины и избранного) сохраняются на реальный target UUID.
- **Безопасность:** actor=owner (Supabase-сессия НЕ меняется, второй auth-клиент НЕ создаётся, service_role во фронте нет). effectiveAccount=target UUID. Доступ к данным target — ТОЛЬКО через is_admin-gated security-definer RPC (`admin_imp_*`) с проверкой `is_admin()` + активного серверного grant (TTL 45 мин). RLS обычных таблиц не ослаблена — обычные юзеры на `auth.uid()`. Non-owner/anon → RPC отклоняются (AUTH_REQUIRED); без активного grant → IMPERSONATION_NOT_ACTIVE. Аудит `USER_IMPERSONATION_STARTED/ENDED` в `system_logs` (owner/target/email/время; без токенов/паролей).
- **UX/изоляция:** постоянный admin-only баннер «Вы вошли в аккаунт: {name} — {email}» + «Вернуться в админку» (очищает effective + revalidate + возврат в /admin, owner НЕ разлогинивается). effectiveAccount tab-scoped (sessionStorage) + авто-expire. Кэш чужого аккаунта НЕ персистится в localStorage owner'а; при старте/смене target/выходе account-scoped state сбрасывается (нет утечки A→B); глобальный каталог не трогается. **`place_order` в режиме имперсонации заблокирован** (этап 1, admin-сообщение); обычный checkout пользователей не изменён.
- **Дата:** 2026-08-21
- **Изменённые файлы:** `supabase/admin-impersonation.sql` (new, OWNER применяет), `src/lib/impersonation.js` (new), `src/context/ImpersonationContext.jsx` (new), `src/components/ImpersonationBanner.jsx` (new), `src/context/ShopContext.jsx` (routing cart/favorites), `src/pages/AdminPage.jsx` (кнопка), `src/pages/CheckoutPage.jsx` (prefill/купон/блок place_order), `src/components/UserMenu.jsx` (имя target), `src/App.jsx` (баннер), `src/main.jsx` (провайдер), `src/styles/index.css`.
- **Связанные задачи:** опирается на F-013 (Users) + is_admin() (LAV-BUG-058); admin identity unified (одна сессия).

## [F-013] Admin → Пользователи + безопасный сброс пароля + hardening доступа
- **Описание:** новый раздел Admin «Пользователи» показывает всех зарегистрированных пользователей (имя/full_name, email, короткий ID, дата регистрации, последний вход, число заказов, использований промо, роль, подтверждён ли email) + поиск по имени/email. Источник данных — security-definer RPC **`admin_list_users()`**: сервер проверяет `is_admin()` (единственный source of truth) и возвращает ТОЛЬКО whitelist безопасных полей; `auth.users` из браузера напрямую НЕ читается; пароли/хэши/токены НЕ возвращаются. **Сброс пароля:** кнопка «Сбросить пароль» с inline-подтверждением («Отправить ссылку на user@email.com?») → стандартный Supabase recovery-flow (`resetPasswordForEmail`) → пользователь сам ставит новый пароль на `/reset`. Админ пароль НЕ видит и НЕ задаёт; **service_role во фронте не используется**. **Hardening доступа:** гейт `/admin` server-trusted — RLS всех admin-операций через `is_admin()`; клиент: гость → экран входа, signed-in не-owner → **404** (`NotFoundScreen`, без раскрытия «нет прав»), смена аккаунта реактивно закрывает панель (условный рендер, старые данные не остаются в DOM), + email-OTP. Прямой вызов `admin_list_users()` не-админом (REST/DevTools) → `AUTH_REQUIRED`.
- **Дата:** 2026-08-21
- **Изменённые файлы:** `supabase/admin-users-module.sql` (new, idempotent — OWNER выполняет), `src/admin/db.js` (`listUsers`, `sendUserPasswordReset`), `src/pages/AdminPage.jsx` (таб + `UsersPanel`), `src/styles/index.css` (`.admin-users`).
- **Связанные задачи:** переиспользует `is_admin()` (admin-lockdown.sql), профили/orders/promo_redemptions; RLS/security не ослаблены.
- **Admin auth: OTP сохранён, но owner-check вынесен ПЕРЕД OTP (2026-08-21).** Порядок гейта `/admin`: (1) anon → обычный вход (Google/пароль), без OTP и без owner email; (2) authenticated → фронт спрашивает сервер `adminSupabase.rpc('is_admin')` — **не-owner → сразу обычный 404** (без OTP, без owner email, без admin-формы, без загрузки admin-данных, не может инициировать OTP); (3) подтверждённый сервером owner → прежний полноценный `EmailOtpScreen` (код на `alekberov.ceyhun2002@gmail.com`, `signInWithOtp`/`verifyOtp`, cooldown/resend, TTL 15м в sessionStorage `elva-admin-otp-verified`) → полная Admin Panel со всеми модулями. Основная авторизация — серверная `is_admin()` (immutable owner UUID + role + email) + RLS/RPC; OTP — доп. слой поверх сессии, НЕ единственная защита. Смена аккаунта: `onAuthStateChange` → пересчёт `is_admin()` → мгновенный unmount + `otpVerified=false` (+ `clearAdminOtpVerification` при выходе); возврат на owner — в пределах TTL без повторного OTP. Убран `isOwnerEmail`-пре-чек и `login_hint` в LoginScreen (owner email не раскрывается не-owner'ам). LIVE: anon `is_admin()`→false; guest `/admin` → login без OTP, owner email не в DOM.

## [F-012] Wheel coupon на checkout — самостоятельная награда (не зависит от окна колеса)
- **Описание:** выигранный на колесе купон теперь живёт как самостоятельная награда аккаунта до `expires_at` или использования — независимо от того, открыто ли окно колеса. На **mobile** checkout, если у аккаунта есть действующий неиспользованный wheel-купон, показывается компактная карточка «🎁 Sizin endirim kuponunuz var» с кодом (`WHEEL-XXXXXX`), процентом («5% endirim») и остатком срока («N saat ərzində…»). Источник истины — сервер (`get_wheel_status.active_reward`), НЕ sessionStorage: купон восстанавливается после refresh/relogin и на другом устройстве. Пользователь сам решает применять — тумблер «Kupondan istifadə et» (без авто-применения): ON → trusted `validate_promo` → скидка в Order Summary; OFF → скидка снимается. Стекинга нет: включение купона заменяет ранее введённый ручной промокод (единый `appliedPromo`). Истёкший купон не показывается (сервер отдаёт только active/не-погашенные); если истёк на странице — скидка снимается и показывается «Kuponun istifadə müddəti bitib» (сервер тоже отклонит при заказе). После успешного заказа `promo_redemptions` фиксируется server-side → на следующем checkout купон не предлагается. Ручное поле промокода не тронуто.
- **Дата:** 2026-08-20
- **Изменённые файлы:** `src/pages/CheckoutPage.jsx` (server-driven `wheelReward`, `toggleCoupon`, expiry-guard, карточка; удалён sessionStorage-автоаппл), `src/i18n/translations.js` (AZ/RU/EN `wheel_coupon_*`, обновлён `wheel_reward_hint`), `src/styles/index.css` (`.wheel-coupon-card`).
- **Связанные задачи:** опирается на F-010/F-011; SQL не требуется (использует существующий `get_wheel_status` + promo-движок); security/RLS без изменений.

## [F-011] Wheel of Fortune — полная админ-конфигурация секторов (status + показ замка)
- **Описание:** Admin полностью управляет колесом из панели. Каждый сектор награды теперь имеет явные поля `status` (`active` / `display_only`) и `show_lock` (показывать иконку замка), помимо `percent` и `weight`. **ACTIVE** — сектор виден и участвует в розыгрыше (нужен `weight>0`). **DISPLAY ONLY** — сектор виден, но сервер (`spin_wheel`) его НИКОГДА не выбирает, даже при ошибочном `weight>0` (витрина обойти не может). **Показывать замок** — управляется Admin явно (не выводится из `weight=0`); для ACTIVE недоступно. Кнопка «Добавить скидку» добавляет новый сектор; удаление через корзину. Валидация: пустой/`≤0`/`>100` процент, отрицательный вес, дубли процентов, ACTIVE без веса, конфиг без хотя бы одного ACTIVE — блокируются с понятным сообщением. Колесо на витрине строится динамически из `get_wheel_public_config.sectors` (`{percent, active, show_lock}`, без весов); замок рисуется аккуратной SVG-иконкой `IconLock` (не emoji). Конфиг перечитывается на витрине периодически (60с + visibility), поэтому правки Admin появляются без ручного refresh. RLS/security не ослаблены: только admin меняет `wheel_config`, результат выбирает сервер.
- **Дата:** 2026-08-20
- **Изменённые файлы:** `supabase/wheel-config-status-lock.sql` (new, idempotent), `src/pages/AdminPage.jsx` (WheelPanel: status/lock/валидация), `src/components/WheelOfFortune.jsx` (sectors show_lock + live-конфиг + IconLock), `src/components/Icons.jsx` (IconLock), `src/styles/index.css` (сетка строки + `.wheel-lock-ico`).
- **Связанные задачи:** продолжение F-010; OWNER должен выполнить `supabase/wheel-config-status-lock.sql`.
- **UX-доработка (2026-08-20):** вес сам управляет статусом сектора — ввод веса `0` автоматически переводит сектор в DISPLAY ONLY (виден, но сервер не выбирает), ввод веса `> 0` — в ACTIVE (замок снимается). Убрано «Save не проходит» при ACTIVE+weight0. Поле «Вес» всегда редактируемо; статус по-прежнему можно переключить вручную (ACTIVE ставит дефолтный вес 10). Отрицательный вес отклоняется валидацией. Файл: `src/pages/AdminPage.jsx` (WheelPanel `setWeight`).

## [F-010] Промокоды + Wheel of Fortune на едином discount-движке (Phase 2)
- **Описание:** система скидок с единой trusted-моделью (DECISIONS #D-007).
  **Промокоды:** campaign (общий, лимит на аккаунт) и individual (привязан к клиенту); checkout-блок «Promokod» на mobile (Apply/Remove, пересчёт Order Summary, скидка на merchandise subtotal, доставка отдельно); i18n всех состояний (не найден/неактивен/просрочен/не начался/чужой аккаунт/уже использован/лимит/мин. сумма). Скидку считает и фиксирует сервер (`validate_promo` preview + 8-арг `place_order`); клиент шлёт только код. Использование пишется в `promo_redemptions` только при успешном заказе; double-use блокируется `SELECT FOR UPDATE`. **Admin:** вкладка «Промокоды» (CRUD, campaign/individual, Generate через RPC, привязка к клиенту из списка заказов, лимиты/даты/мин.сумма) + вкладка «Колесо фортуны» (вкл/выкл, окна, timezone, проценты+веса, expiry, спинов на окно). **Wheel (mobile):** приглашение «Şansını sına» в окне (Asia/Baku, ±5м), результат выбирает сервер (weighted), один спин на окно (`UNIQUE(account_id,window_key)`), выигрыш = account-bound individual-промокод (source=wheel), применяется тем же checkout-движком; reroll через reload/DevTools невозможен (сервер enforce). Заказ хранит `discount_amount/promo_code/discount_source`; Telegram-уведомление включает строку скидки.
- **Дата:** 2026-08-15
- **Изменённые файлы:** `supabase/promo-and-wheel.sql`; `src/lib/promo.js`, `src/lib/wheel.js` (new); `src/lib/orders.js`; `src/pages/CheckoutPage.jsx`; `src/pages/AdminPage.jsx`, `src/admin/db.js`; `src/components/WheelOfFortune.jsx` (new), `src/App.jsx`; `src/i18n/translations.js`; `src/styles/index.css`.
- **Связанные задачи:** DECISIONS #D-007; TODO Phase 2. Проверено: build; REST trusted-RPC/RLS (anon→AUTH_REQUIRED, веса скрыты, промо не читаются/не создаются анонимом); Playwright wiring (RPC 200, консоль чистая). Финальная авторизованная проверка на устройстве во временном окне — за владельцем.

## [F-009] Admin → Storefront live-sync + честные цвета товара + структура fallback поиска (Phase 1)
- **Описание:** пакет из 3 задач.
  1. **Realtime-синхронизация каталога.** Открытый пользовательский сайт получает изменения admin-панели (name, price, discount/old_price, stock/in_stock, sizes, colors, images, availability, is_featured и т.д.) **без ручного refresh и без full-page reload**. Реализовано через Supabase Realtime (`postgres_changes` на `products` и `categories`) → тихая ревалидация состояния каталога → React rerender. Ordering-guard (`dataSeq`) гарантирует, что поздний ответ не перезапишет более свежий (нет stale-cache гонки). Один канал, cleanup при размонтировании, debounce 300ms, авто-reconnect (supabase-realtime).
  2. **Цвета товара = реальные данные.** Product Page больше не показывает декоративную палитру `colors` как набор «выбираемых» цветов. Реальные цвет-варианты (`variants` — строки с общим кодом и `color_name`) показываются как раньше; одноцветный товар показывает ровно ОДИН настоящий swatch (`color_hex`, иначе основной тон палитры). Никаких фиктивных дополнительных цветов.
  3. **Структура fallback поиска (mobile).** Объединённая фраза разбита на компактный alert «Dəqiq nəticə tapılmadı.» + отдельный заголовок секции «Oxşar məhsullar» + product grid.
- **Дата:** 2026-08-15
- **Изменённые файлы:** `src/context/CatalogContext.jsx` (Realtime + ordering-guard + shared revalidate), `src/pages/ProductPage.jsx` (singleColor), `src/pages/CatalogPage.jsx` + `src/i18n/translations.js` (`no_exact_matches_short`) + `src/styles/index.css` (структура fallback), `supabase/realtime-catalog.sql` (включение publication — за владельцем).
- **Связанные задачи:** DECISIONS #D-006; BUGS #LAV-BUG-053. Ограничение: Realtime требует добавить таблицы в `supabase_realtime` publication (SQL готов, запускает владелец); e2e admin→storefront не прогонялся во избежание правки боевых данных.

## [F-008] Выбор способа доставки на Checkout (Стандарт / Экспресс)
- **Описание:** на оформлении заказа — выбор способа доставки красивыми radio-cards в стиле LaVenta: **Стандартная** (0 ₼, 1–3 рабочих дня, по умолчанию) и **Экспресс** (+5 ₼, до 6 часов). Order Summary пересчитывается автоматически (Товары + Доставка = Итого); inline-итог над кнопкой тоже учитывает доплату. Выбранный способ сохраняется вместе с заказом и попадает в Telegram-уведомление — через поле `note` (серверная RPC `place_order` кладёт `note` в заказ и в сообщение как «Qeyd: …»), без изменения схемы БД. i18n AZ/RU/EN.
- **Дата:** 2026-08-07
- **Изменённые файлы:** `src/pages/CheckoutPage.jsx` (state `delivery`, пересчёт, radio-cards, note-композиция), `src/i18n/translations.js` (delivery_*), `src/styles/index.css` (`.delivery-card`).
- **Связанные задачи:** пакет LAV-BUG-040..044; примечание: серверный total заказа в БД считается по ценам товаров (онлайн-оплаты нет) — доплата экспресса передаётся в note/Telegram; при желании владелец может расширить RPC отдельным полем доставки.

## [F-007] Умный поиск товаров + приоритетные товары
- **Описание:** «умный» поиск как в современных e-commerce: не только точное, но и частичное/префиксное/подстрочное совпадение и толерантность к опечаткам (Левенштейн); ищет по названию (AZ/RU/EN), категории, коду/артикулу, бренду, тегу и описанию; нормализация с фолдингом азербайджанских букв (ə/ı/ş/ç/ğ/ö/ü) и диакритик, поддержка кириллицы. Ранжирование по релевантности с весами полей (код›название›категория›бренд›тег›описание); при отсутствии точного совпадения показываются максимально релевантные похожие. **Приоритетные товары** (флаг «⭐ Приоритетный товар» в админке, БД-поле `is_featured`) поднимаются выше остальных релевантных результатов поиска; несколько приоритетных сортируются между собой по релевантности; если приоритетных нет — обычная сортировка по релевантности.
- **Дата:** 2026-08-07
- **Изменённые файлы:** `src/lib/search.js` (новый — движок поиска/ранжирования), `src/pages/CatalogPage.jsx` (интеграция + featured-буст), `src/context/CatalogContext.jsx` + `src/admin/db.js` (`is_featured` read/write, graceful degrade), `src/pages/AdminPage.jsx` (тоггл в редакторе), `supabase/product-featured.sql` (миграция — **владелец запускает в SQL Editor**).
- **Связанные задачи:** unit-тест движка (частичное/код/RU/фолдинг/опечатка/featured-буст) + live end-to-end на реальных данных Supabase.

## [F-006] Заказ для любого вошедшего пользователя
- **Описание:** оформление заказа доступно любому авторизованному (email или Google), не только Google.
- **Дата:** 2026-08-01
- **Изменённые файлы:** `src/lib/orders.js`, `src/pages/CheckoutPage.jsx`, `supabase/fix-order-any-auth.sql`.
- **Связанные задачи:** `535338b`; BUGS #B-006; DECISIONS #D-004. (SQL применяется владельцем вручную.)

## [F-005] Стабилизация памяти cart/favorites
- **Описание:** cart и favorites надёжно привязаны к аккаунту, защищены от гонок при смене аккаунтов и устаревших async-ответов.
- **Дата:** 2026-08-01
- **Изменённые файлы:** `src/context/ShopContext.jsx`, `src/pages/ProductPage.jsx`.
- **Связанные задачи:** `11a751e`, `6c63dd4`, `ff8037f`, `d68681a`; BUGS #B-004, #B-005; DECISIONS #D-005.

## [F-004] Email-регистрация и вход
- **Описание:** регистрация/вход по email+паролю в дополнение к Google, с ошибками на 3 языках и сбросом пароля.
- **Дата:** 2026-07-31
- **Изменённые файлы:** `src/context/AuthContext`, компоненты входа/регистрации.
- **Связанные задачи:** `24721be`, `d063dc9`; методы `signUp`/`signInWithPassword`/`sendPasswordReset`.

## [F-003] Цветовые варианты товара
- **Описание:** один артикул в нескольких цветах; каждый цвет — своя строка с фото, ценой, размерами и наличием. Каталог схлопывает группу в карточку; на странице товара образцы переключают фото/цену/размеры.
- **Дата:** 2026-07-31
- **Изменённые файлы:** `supabase/product-variants.sql`, админка вариантов, `src/pages/CatalogPage.jsx`, `src/pages/ProductPage.jsx`.
- **Связанные задачи:** `dc5e894`, `d7b1d68`, `12565c2`, `82c7e8a`, `47ceef9`; DECISIONS #D-002, #D-003; BUGS #B-002.

## [F-002] Мобильная переработка интерфейса
- **Описание:** нижний таббар со счётчиками и safe-area, каталог в 2 колонки, фильтры в bottom-sheet, липкая панель покупки, свайп-галерея, похожие товары лентой; code-splitting маршрутов через `React.lazy`.
- **Дата:** 2026-07-30
- **Изменённые файлы:** `src/components/Header.jsx`, `src/styles/index.css`, страницы каталога и товара, роутинг.
- **Связанные задачи:** `5cce0d3`, `0b0dae1`, `b69d177`, `bbfdcb0`; BUGS #B-001.

## [F-001] Локальный просмотр системных логов
- **Описание:** терминальный live-tail `system_logs` напрямую из Supabase, минуя сайт и админку.
- **Дата:** 2026-07-27
- **Изменённые файлы:** `tools/log-tail.mjs`, `ЛОГИ.bat`.
- **Связанные задачи:** премиум-редизайн и починка загрузки каталога того же периода.
