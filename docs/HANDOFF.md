# LaVenta — Handoff

## Current Status

**UI: полноэкранная 404 для non-owner /admin.** Маленькая карточка заменена на брендовую fullscreen-страницу `src/components/NotFoundPage.jsx` (position:fixed;inset:0;z-index:3000 — перекрывает storefront header/footer/tabbar): лого Elva LaVenta сверху-слева, гигантский serif «404» (--plum), «Not Found»/`nf_heading`, подтекст, pill-кнопка «На главную»→`/`, мягкие розовые лепестки (inline-SVG). i18n AZ/RU/EN (`nf_heading`/`nf_text`/`nf_home`). Security-UX: без «нет прав»/owner email/OTP/admin-данных — обычная 404, не раскрывает админку. Owner-флоу (OTP→панель) и вся auth/RLS/RPC логика НЕ тронуты. Verified: build+`npm test` 21/21; desktop 1440 и mobile 390 — без overflow, storefront layout перекрыт; guest /admin → login (реальный гейт); 0 console errors. Файлы: `NotFoundPage.jsx` (new), `AdminPage.jsx` (замена + удалён старый NotFoundScreen), `translations.js`, `index.css`.

**(пред.) 🔴 Admin identity mismatch — ИСПРАВЛЕН (настоящий root cause).** Симптом: под витринным аккаунтом `elvalaventa@gmail.com` /admin показывал owner-OTP для alekberov. Причина: **две независимые сессии** — `adminSupabase` (storage `elva-laventa-admin-auth`) держала устаревший owner-токен alekberov, а `is_admin()` вызывался на НЕЙ, а не на текущей витринной сессии. Фикс (минимальный): `adminSupabase = supabase` (единая identity) в `src/lib/supabase.js` + одноразовая очистка осиротевшего `elva-laventa-admin-auth`. Теперь owner-eligibility решает ТЕКУЩИЙ витринный аккаунт (его JWT в `is_admin()`), смена аккаунта на витрине мгновенно пересчитывает admin-доступ, устаревшая admin-сессия исключена. Диагностика `admin-gate {uid,isAdmin}` в `window.__lavDiag()`. LIVE (preview): единственный ключ сессии `elva-laventa-store-auth`, `elva-laventa-admin-auth` отсутствует; guest /admin → login без OTP; 0 console errors; build+`npm test` 21/21. Owner→OTP→panel и elvalaventa→404 под реальными логинами — подтверждает владелец. Файлы: `src/lib/supabase.js`, `src/pages/AdminPage.jsx`.

**(пред.) Admin auth: гейт-порядок + OTP server-guard.** Проверено: production реально отдаёт этот код (чанк содержит `rpc('is_admin')` + OTP), гейт = `checking → session → isAdmin(server rpc) → otp → panel`. Non-owner admin-сессия → `is_admin()`=false → 404 ДО OTP. Добавлен server-guard `assertOwner()` на `sendCode`/`verify` (не-owner не инициирует/не подтверждает OTP даже из DevTools). Если владелец видит OTP под «другим аккаунтом» — причина: (а) закэшированный старый бандл (нужен hard-refresh) или (б) отдельная admin-сессия (`adminSupabase`, `elva-laventa-admin-auth`) всё ещё alekberov (owner) → OTP корректен; «Выйти» очищает admin-сессию. anon `is_admin()`→false; owner в `fix-admin-owner.sql`=alekberov. build+`npm test` 21/21.

**(пред.) Admin auth: OTP восстановлен, owner-check ПЕРЕД OTP.** Гейт `/admin`: anon → обычный вход (Google/пароль); authenticated → сервер `rpc('is_admin')`: не-owner → **сразу 404** (без OTP/owner email/admin-формы/данных, не может инициировать OTP); owner → прежний `EmailOtpScreen` (код на alekberov, verifyOtp, cooldown/resend, TTL sessionStorage) → полная Admin Panel (все модули на месте). Основная защита серверная (is_admin + RLS/RPC); OTP — доп. слой. Смена аккаунта → пересчёт is_admin → unmount + otpVerified сброшен; возврат на owner в пределах TTL без повторного OTP. Убран owner-email из LoginScreen (isOwnerEmail/login_hint). build OK; `npm test` 21/21; guest `/admin` → login без OTP, owner email не в DOM, 0 console errors; anon `is_admin()`→false. Owner OTP→Panel — за владельцем (OAuth). Изменён только `src/pages/AdminPage.jsx`.

**LAV-BUG-058 (Admin owner hardening) — owner: единственный владелец = `alekberov.ceyhun2002@gmail.com`** (инфо про olegperov было ошибочным; откачено везде — olegperov не осталось нигде в src/supabase/docs). Реальной privilege-escalation не было (alekberov и есть owner). Полезное упрочнение: `is_admin()` переведён на тройную проверку `auth.uid()=OWNER_UUID (immutable) AND profiles.role='admin' AND jwt email=alekberov`, миграция снимает admin у всех прочих аккаунтов (не удаляя пользователей). Frontend `ADMIN_OTP_EMAIL`=alekberov. **OWNER ACTION REQUIRED:** выполнить `supabase/fix-admin-owner.sql` (owner = alekberov). Build+`npm test` 21/21. Живое подтверждение (alekberov=admin / другой=404+RPC denied) — после применения SQL (окружение блокирует service_role/SQL-write).

**Admin → Пользователи + безопасный сброс пароля + hardening (F-013) — реализовано.** Новый раздел Admin со списком пользователей из security-definer RPC `admin_list_users()` (is_admin gate, whitelist полей, `auth.users` из браузера не читается, паролей/токенов нет); сброс пароля через стандартный recovery-email (`resetPasswordForEmail`, service_role не используется); гейт `/admin` server-trusted (RLS + 404 для не-owner + OTP). **OWNER ACTION REQUIRED:** выполнить `supabase/admin-users-module.sql` (иначе таб «Пользователи» → `AUTH_REQUIRED`/функция не найдена). Build OK; `npm test` 21/21 (13+8); guest `/admin` → login, admin-данные не утекают, 0 console errors; `service_role` в бандле НЕТ.

Предыдущее (в силе): **LAV-BUG-057** — long-idle mobile freeze: НАЙДЕН И ИСПРАВЛЕН настоящий источник (PUSH /product → REPLACE /). По live-инструментации владельца (PUSH /product/21 → REPLACE /) воспроизведена точная сигнатура и найден корень: `useInactivityRedirect` boot-эффект **пере-выполнялся при каждой навигации** (deps содержали `maybeRedirect`, зависящий от `navigate`, чья идентичность меняется на смене маршрута) и повторно стрелял boot-проверку со **stale `bootLastRef`** → при открытии товара после долгого idle мгновенный `replace('/')`. Это НЕ auth (052/056) и НЕ overlay.

- **Fix (client-only, минимальный):** boot-эффект теперь mount-once (`[]`), актуальный `maybeRedirect` через ref; условие вынесено в чистый `shouldRedirectHome()` (`src/lib/inactivity.js`) + unit-тест. Навигация больше не пере-запускает boot-проверку. Намеренное «30 мин idle → home» сохранено (listeners + live `readLast()`).
- **Проверено (playwright-mobile, production build):** ДО — `PUSH /product/20 → REPLACE /` (reason idle-30m); ПОСЛЕ — тап со stale bootLast → только `PUSH /product/20`, **REPLACE нет**, route остаётся `/product/20`; genuine long-idle resume на `/product` → home (сохранено). `npm test`: auth 13/13 + inactivity 8/8; build OK; console 0 errors.
- **NOT VERIFIED:** реальный OS-suspend + авторизация на устройстве (за владельцем).

Предыдущее (в силе): HEALTHY BASELINE и comparison-checklist в `docs/BUGS.md` (LAV-BUG-056); 056-grace транзиентного auth-null. Симптом повторялся после `e0efea1` — теперь корень (LAV-BUG-057) устранён. Проведено 2-е независимое расследование (playwright-mobile): **в эмуляции НЕ воспроизводится** — стресс 60 циклов навигации 60/60, 0 net-утечек listener'ов, 0 таймер-leak; все navigate-guards ведут себя корректно; ProductPage не роняет маршрут; CatalogContext resume-safe. **Второго code-level root cause в SPA не найдено** — остаток это реально-девайсовый фактор (настоящий OS-suspend + авторизация + возможный редеплой + first-tap-wake), недоступный эмулятору.

- **Действие (per §13):** усилена персистентная диагностика (только инструментация, поведение auth/nav/cart НЕ менялось) — capture тапов (`tap {onProductLink, topReachesCard, overlay, pointerEvents}`), `route`, `nav-redirect {reason}` (account-switch/idle-30m/empty-cart), `catalog-apply {products}`, `shop-loaded {cart}`; новый **`window.__lavDiagDetailed()`** (events + live DOM-снапшот: overlay/wheel-modal/backdrop/overflow/pointer-events). Без секретов, консоль молчит без `localStorage.elva_diag='1'`.
- **Следующий реальный сбой:** владелец открывает DevTools/консоль и присылает `window.__lavDiagDetailed()` — timeline покажет точного виновника (guard-reason / overlay / tap-not-reached / stale state).
- Ранее (056 fix, остаётся в силе): grace для транзиентного auth-null в `AuthContext` (закрыл auth-null половину; на реальном устройстве не подтверждён).

- **Root cause:** `onAuthStateChange` ставил `user=null` на транзиентном `SIGNED_OUT` (resume token-refresh blip) → `accountId A→null→A` → `ShopContext` чистил корзину, `CheckoutPage` редиректил на `/cart`, тапы add-to-cart «съедались». 052 закрыл только `AccountHomeRedirect`, не источник.
- **Fix (минимальный, client-only):** `src/lib/authRecovery.js` (pure, tested) — adopt/clear/**defer** + bounded grace 2000мс; `AuthContext` игнорирует транзиентный null (defer→подтверждение через `getSession`), но мгновенно чистит реальный `logout()` (флаг намерения) и адаптирует смену аккаунта A→B; `WheelOfFortune` авто-закрывает устаревший модал (нет зависшего backdrop); `src/lib/lifecycleDiag.js` — ограниченный ring buffer lifecycle-событий (без секретов) для разбора след. реального инцидента (`window.__lavDiag()`).
- **Проверено:** `vite build` OK; `npm test` regression **13/13** (A→null→A стабилен, реальный logout чистит, expiry→clear, A→B, A→null→B); Playwright mobile long-idle эмуляция (hidden→offline→online→visible→pageshow) — route стабилен, тап достигает карточки (`tapReachesCard=true`, нет invisible overlay/`.wheel-backdrop`), навигация в товар после resume работает, console 0 errors/0 unhandled rejections, 360/390/430 без overflow.
- **NOT VERIFIED:** реальный OS tab-suspension + авторизованная Supabase-сессия — за владельцем (Playwright это не воспроизводит). При следующем реальном инциденте `window.__lavDiag()` даст точный timeline.

Предыдущее (актуально): **Wheel coupon на checkout (F-012)** — client-only, SQL не нужен; **Wheel admin config (F-011)** — SQL применён, LIVE-верифицирован.

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-056 — 2-е расследование (симптом повторился на устройстве): не воспроизведено в эмуляции → усилена диагностика

- **Что сделано:** новое независимое playwright-mobile расследование. Стресс 60 циклов (product↔back + visibility + offline/online) → нав 60/60, 0 net listener-leaks, 0 interval-leaks. Проверены все navigate-guards, ProductPage (не роняет маршрут), CatalogContext (resume-safe silent revalidate), stale-chunk (уже покрыт recovery.js). Второго code-level root cause не найдено.
- **Deliverable:** усиленная персистентная диагностика (tap-capture с overlay-детекцией, route, nav-redirect reason, catalog/cart state, `window.__lavDiagDetailed()` со снапшотом DOM). Только инструментация — поведение не менялось.
- **Файлы:** `src/lib/lifecycleDiag.js`, `src/App.jsx`, `src/hooks/useInactivityRedirect.js`, `src/context/CatalogContext.jsx`, `src/context/ShopContext.jsx`. build+`npm test` 13/13.
- **Статус:** на реальном устройстве НЕ подтверждён исправленным; ждём `window.__lavDiagDetailed()` с реального сбоя.

### (пред.) LAV-BUG-056 — long-idle mobile freeze / broken navigation (root fix of transient auth-null race)

- **Симптом:** после долгого фона тапы по товару не открывают Product Page, checkout уходит на /cart/home, тапы «съедаются»; refresh/активность лечит; свежая сессия не воспроизводит.
- **Root cause:** транзиентный `SIGNED_OUT`→`SIGNED_IN` на resume делал `user` null на миг → `accountId A→null→A` → `ShopContext` опустошал корзину, `CheckoutPage` empty-cart-guard редиректил. Источник в `AuthContext` (052 закрыл только home-redirect половину).
- **Fix (client-only, RLS/RPC/security не тронуты):** grace для транзиентного null в `AuthContext` (pure `src/lib/authRecovery.js` + тесты); реальный logout/смена аккаунта работают; Wheel auto-close устаревшего модала; диагностический ring buffer `src/lib/lifecycleDiag.js`.
- **Файлы:** `src/lib/authRecovery.js` (new), `src/lib/lifecycleDiag.js` (new), `src/context/AuthContext.jsx`, `src/context/ShopContext.jsx`, `src/pages/CheckoutPage.jsx`, `src/components/WheelOfFortune.jsx`, `src/main.jsx`, `tests/auth-recovery.test.mjs` (new), `package.json` (`npm test`). **SQL не требуется.**

### (пред.) Wheel coupon на checkout — самостоятельная награда, независимая от окна колеса (F-012)

- **Проблема:** раньше выигранный купон всплывал только через sessionStorage и авто-применялся; после закрытия окна колеса пользователь не понимал, где купон и действует ли он.
- **Решение (client-only):** на mobile checkout `get_wheel_status.active_reward` (server source of truth) даёт `{code, percent, expires_at}` для account-bound, active, не истёкшего, не погашенного купона — независимо от окна. Карточка показывает код/процент/остаток срока + тумблер «Использовать» (пользователь решает сам, авто-применения нет). ON → `validate_promo` → скидка в Order Summary; OFF → снимается. Стек запрещён (единый `appliedPromo`) — включение купона заменяет ручной промокод. Истёкший не показывается; expiry-guard снимает скидку и показывает сообщение; сервер тоже отклонит. После заказа redemption фиксируется server-side → купон больше не предлагается.
- **Файлы:** `src/pages/CheckoutPage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`. **SQL не требуется.**

### (пред.) Wheel: полная админ-конфигурация секторов (status ACTIVE/DISPLAY ONLY + явный показ замка)

- **Data model:** каждый reward = `{ percent, weight, status, show_lock }`. `status='active'` (участвует, нужен weight>0) или `display_only` (виден, сервер не выбирает). `show_lock` — Admin явно управляет иконкой замка (не из weight).
- **Admin (WheelPanel):** строка сектора = Скидка % / Вес / Статус (select ACTIVE·DISPLAY ONLY) / Замок (toggle, скрыт=disabled для ACTIVE) / удалить. Кнопка «Добавить скидку». Валидация перед сохранением (percent 1..100, вес ≥0, без дублей, ACTIVE→weight>0, ≥1 ACTIVE).
- **Server:** `spin_wheel` суммирует/выбирает только active+weight>0 (display_only исключён всегда, даже при weight>0). `get_wheel_public_config` отдаёт `sectors:[{percent,active,show_lock}]` без весов. Обратная совместимость для старых наград без полей.
- **Storefront (mobile):** сектора строятся полностью из серверного конфига; замок = аккуратная SVG `IconLock` (не emoji); конфиг перечитывается 60с + on visibility (правки Admin без manual refresh, без `location.reload()`).
- **UX-доработка (client-only):** в WheelPanel вес сам управляет статусом — ввод `0` → авто DISPLAY ONLY, ввод `> 0` → авто ACTIVE (замок снимается); поле «Вес» всегда редактируемо; убрано «Save не проходит» при ACTIVE+weight0; отрицательный вес отклоняется валидацией (`setWeight` в `src/pages/AdminPage.jsx`).
- **Файлы:** `supabase/wheel-config-status-lock.sql` (new), `src/pages/AdminPage.jsx`, `src/components/WheelOfFortune.jsx`, `src/components/Icons.jsx`, `src/styles/index.css`.

## Last Verified Checks

- **Build:** `npm run build` — успешно (0 ошибок). **`npm test`** (regression `tests/auth-recovery.test.mjs`) — **13/13**.
- **LAV-BUG-056 (Playwright mobile, эмуляция long-idle):** цикл `hidden→offline→online→visible→pageshow` + rapid double-resume на /catalog и /product → route стабилен; `elementFromPoint` над карточкой = `A.product-name`, `tapReachesCard=true` (нет invisible overlay); клик по товару после resume → `/product/34`; нет `.wheel-backdrop`; console **0 errors**, **0 unhandled rejections**; diag ring пишет timeline (`window.__lavDiag`), без секретов; 360/390/430 без overflow.
- **(пред.) Логика купон-карточки (детерминированный тест, реальный `previewDiscount`) — 14/14:** показ при валидном купоне / скрытие при отсутствии и при expiry; `hoursLeft` (24ч и 2ч); toggle ON→couponApplied+скидка (5% от 49 = 2.45, total 46.55); toggle OFF→скидка 0, total 49; no-stack (ручной промо → включение купона заменяет, скидка = купон); expiry-guard (истёк+применён → снятие + `wheel_coupon_expired`).
- **Storefront (playwright-mobile 390):** checkout-модуль монтируется, console **0 errors**; главная 360/390/430 — без горизонтального overflow, 0 errors. Для гостя карточка не показывается (нет `active_reward`), ручное поле промо не тронуто.
- **NOT VERIFIED (нет автоматизации):** видимая карточка + apply/toggle/redeem под реальной авторизованной mobile-сессией — блокировано OAuth (+ корзина требует логина). Серверные account-binding/one-use/expiry/redemption/RLS не менялись и LIVE-подтверждены ранее (F-010/F-011).
- **(пред. LIVE, актуально):** контракт колеса 10/10, security/RLS 4/4.

## Current Architecture Notes

- Одна система скидок; результат колеса только на сервере (weighted `random()`, `UNIQUE(account_id,window_key)`), reward = individual one-use промокод (source=wheel) через общий promo-движок.
- Reward config: `wheel_config.rewards` jsonb = массив `{percent,weight,status,show_lock}`. Активность сектора = `status='active' AND weight>0`. Замок = `show_lock` (Admin), на витрине показывается только у неактивных.
- Публичный конфиг: `get_wheel_public_config.sectors` = `{percent,active,show_lock}` (без весов); `rewards` = только достижимые проценты (совместимость).
- Auto-open, one-spin-per-window, reward persistence, checkout promo engine, RLS — не менялись.

## Known Issues

- **НЕ БЛОКЕР, требует ручной проверки владельцем (нет автоматизации):** UI-driven операции Admin (add/delete/status/weight/showLock, реальный round-trip Save→storefront) не прогнаны автоматически — claude-in-chrome extension не подключён, а admin вход = Google OAuth. Сам факт admin-записи в `wheel_config` уже доказан живьём (владелец добавил окно `16:55`, и оно видно в `get_wheel_public_config`). Живой spin не проверялся — все окна закрыты (Баку 21:26; окна 10:00/13:00/16:55/21:00 ±5).
- **Тестовое окно `16:55`** добавлено владельцем в `windows` — если оно было только для теста, его стоит убрать (иначе колесо будет авто-открываться у реальных mobile-пользователей в 16:55 Asia/Baku).
- Ранее опц.: `supabase/promo-validate-fix.sql` (42702), `realtime-catalog.sql` / `product-featured.sql`.

## Risks

- Нет. Серверный контракт и security подтверждены live; клиент собран и грузится чисто. Реализация не менялась в этой сессии.

## Next Recommended Step

1. **Владельцу (опционально, для 100% live-визуала):** в Admin → Колесо добавить сектор, сменить status/замок/вес, Save; на mobile в активном окне убедиться, что сектор появляется/исчезает, замок вкл/выкл, display_only не выпадает. Либо принять контракт-уровень (write+propagate уже доказаны).
2. **Решить судьбу тестового окна `16:55`** в конфиге колеса.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260821-003820

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (`/elva-laventa/`).
2. **Описание:** магазин: каталог, корзина, checkout (`place_order`+Telegram), admin-панель, AZ/RU/EN, промокоды + Wheel of Fortune на едином discount-движке.
3. **Текущее состояние:** LAV-BUG-056 (long-idle mobile freeze) исправлен в корне — client-only, SQL не требуется. Ранее: F-012 (wheel-купон на checkout), F-011 (admin-конфиг секторов, SQL применён).
4. **Что реализовано (эта сессия):** grace для транзиентного auth-null в `AuthContext` (pure `src/lib/authRecovery.js` + regression-тест) — транзиентный `SIGNED_OUT` на resume больше не роняет `user` → корзина/checkout не ломаются; реальный `logout()`/смена аккаунта A→B работают; `WheelOfFortune` авто-закрывает устаревший модал; `src/lib/lifecycleDiag.js` — bounded ring buffer lifecycle-событий (без секретов, `window.__lavDiag()`).
5. **Последняя задача:** LAV-BUG-056 — long-idle mobile freeze / broken navigation, root fix.
6. **Изменённые файлы (этой сессии):** `src/lib/authRecovery.js` (new), `src/lib/lifecycleDiag.js` (new), `src/context/AuthContext.jsx`, `src/context/ShopContext.jsx`, `src/pages/CheckoutPage.jsx`, `src/components/WheelOfFortune.jsx`, `src/main.jsx`, `tests/auth-recovery.test.mjs` (new), `package.json`, docs. SQL не менялся.
7. **Проверки:** build OK; `npm test` 13/13; Playwright mobile long-idle эмуляция — route стабилен, tapReachesCard=true (нет overlay), навигация в товар после resume OK, нет `.wheel-backdrop`, console 0 errors/0 unhandled rejections, 360/390/430 без overflow. NOT VERIFIED: реальный OS-suspend + авторизованная сессия (за владельцем; timeline даст `window.__lavDiag()`).
8. **Ограничения:** mobile scope; desktop не ломать; НЕ ослаблять auth/RLS/RPC/security; реальный logout и смена аккаунта A→B должны работать; frontend не выбирает reward; нет service_role во фронте; grace-окно bounded (не создавать бесконечный лимбо).
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** финальное подтверждение LAV-BUG-056 на реальном устройстве (авторизованный, реальный OS-suspend → возврат → тап по товару/checkout); при инциденте снять `window.__lavDiag()`. Опц.: карточка купона F-012 под mobile-сессией; судьба тестового окна `16:55`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit+push; deploy (GitHub Actions не ждать и не pollить).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-058 — owner уточнён = alekberov.ceyhun2002@gmail.com (olegperov было ошибкой, откачено везде). Hardening: is_admin() = auth.uid()=OWNER_UUID(immutable)+role+email; supabase/fix-admin-owner.sql снимает admin у всех прочих. Frontend ADMIN_OTP_EMAIL=alekberov. OWNER: выполнить fix-admin-owner.sql. Также ранее: admin-users-module.sql (F-013).
Expected modified files:
  - supabase/admin-users-module.sql (new)
  - src/admin/db.js (listUsers, sendUserPasswordReset)
  - src/pages/AdminPage.jsx (таб + UsersPanel), src/styles/index.css
  - docs/FEATURES.md, docs/HANDOFF.md, docs/TODO.md
Git status summary: код + SQL + docs; будет закоммичено и запушено этой сессией
Documentation updated: YES
Last verified build: vite build — успешно (0 ошибок)
Last verified tests: npm test — auth 13/13 + inactivity 8/8; build OK; guest /admin → login (нет admin-табов/данных, нет утечки RPC/service_role в DOM), 0 console errors; service_role в бандле НЕТ. Users-панель под реальным admin (OAuth+OTP) и RPC после применения SQL — за владельцем.
Recovery confidence: HIGH — код проверен; admin_list_users требует применения SQL владельцем (OWNER ACTION REQUIRED)
```
