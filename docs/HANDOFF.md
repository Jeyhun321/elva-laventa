# LaVenta — Handoff

## Current Status

**Wheel coupon на checkout — выигрыш стал самостоятельной наградой аккаунта (F-012).** Купон живёт до `expires_at`/использования независимо от окна колеса; на mobile checkout показывается карточка с кодом/процентом/сроком и тумблером «Использовать» (без авто-применения). SQL не требуется — используется существующий `get_wheel_status.active_reward` + promo-движок; security/RLS не тронуты.

- **Реализовано (client-only):** server-driven `wheelReward` (source of truth — сервер, не sessionStorage), `toggleCoupon`, expiry-guard, карточка купона; удалён старый sessionStorage-автоаппл. i18n AZ/RU/EN `wheel_coupon_*`. CSS `.wheel-coupon-card`.
- **Проверено:** build OK; детерминированный тест логики карточки — **14/14** (показ/скрытие по валидности и expiry, hoursLeft, toggle ON/OFF пересчёт, no-stack замена ручного промо, expiry-guard); storefront (playwright-mobile 390) — checkout-модуль монтируется, console 0 errors; главная 360/390/430 без overflow.
- **NOT VERIFIED (нет автоматизации):** видимая карточка + apply/redeem под реальной авторизованной mobile-сессией — блокировано OAuth (+ корзина требует логина). Серверные one-use/expiry/redemption/RLS не менялись и LIVE-подтверждены ранее.

Предыдущее (актуально): **Wheel admin config (F-011)** — SQL `wheel-config-status-lock.sql` применён и LIVE-верифицирован (контракт 10/10, security 4/4).

## Current Branch

`main`

## Last Completed Task

### Wheel coupon на checkout — самостоятельная награда, независимая от окна колеса (F-012)

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

- **Build:** `npm run build` — успешно (0 ошибок).
- **Логика купон-карточки (детерминированный тест, реальный `previewDiscount`) — 14/14:** показ при валидном купоне / скрытие при отсутствии и при expiry; `hoursLeft` (24ч и 2ч); toggle ON→couponApplied+скидка (5% от 49 = 2.45, total 46.55); toggle OFF→скидка 0, total 49; no-stack (ручной промо → включение купона заменяет, скидка = купон); expiry-guard (истёк+применён → снятие + `wheel_coupon_expired`).
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

Recovery ID: R-20260820-021402

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (`/elva-laventa/`).
2. **Описание:** магазин: каталог, корзина, checkout (`place_order`+Telegram), admin-панель, AZ/RU/EN, промокоды + Wheel of Fortune на едином discount-движке.
3. **Текущее состояние:** wheel-купон на checkout стал самостоятельной наградой (F-012) — client-only, SQL не требуется. Ранее: admin-конфиг секторов (F-011) реализован, SQL применён, LIVE-верифицирован.
4. **Что реализовано (эта сессия):** на mobile checkout карточка выигранного купона из `get_wheel_status.active_reward` (server source of truth, не sessionStorage), независимая от окна колеса; тумблер применения (без авто-аппл); no-stack (замена ручного промо); expiry-guard; после заказа redemption фиксируется → купон не предлагается. i18n `wheel_coupon_*`, CSS `.wheel-coupon-card`.
5. **Последняя задача:** UX выигранного wheel-купона на checkout.
6. **Изменённые файлы (этой сессии):** `src/pages/CheckoutPage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`, docs. SQL не менялся.
7. **Проверки:** build OK; логика купон-карточки 14/14 (show/hide, expiry, hoursLeft, toggle пересчёт, no-stack, expiry-guard); checkout монтируется, console 0 errors; главная 360/390/430 без overflow. NOT VERIFIED: видимая карточка + apply/redeem под авторизацией (OAuth недоступен; корзина требует логина).
8. **Ограничения:** mobile scope; desktop не ломать; одна система скидок; результат колеса только server-side; frontend не выбирает reward и не считает итоговую скидку; купон account-bound/one-use/expiry — сервер; не ослаблять RLS; нет service_role во фронте.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** опц. — владельцу проверить карточку купона на mobile под своей сессией (выиграть купон → закрыть окно → checkout → тумблер применить); решить судьбу тестового окна `16:55`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit+push; deploy (GitHub Actions не ждать и не pollить).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Wheel coupon на checkout — самостоятельная награда (server-driven get_wheel_status.active_reward), тумблер применения, no-stack, expiry-guard. Client-only, SQL не нужен.
Expected modified files:
  - src/pages/CheckoutPage.jsx
  - src/i18n/translations.js
  - src/styles/index.css
  - docs/HANDOFF.md, docs/DAILY.md, docs/FEATURES.md
Git status summary: 3 файла кода + docs изменены; будет закоммичено и запушено этой сессией
Documentation updated: YES
Last verified build: vite build — успешно (0 ошибок)
Last verified tests: логика купон-карточки — 14/14 (show/hide, expiry, hoursLeft, toggle ON/OFF пересчёт, no-stack замена, expiry-guard); checkout-модуль монтируется, console 0 errors (playwright-mobile 390); главная 360/390/430 без overflow. Видимая карточка + apply/redeem под авторизацией — NOT VERIFIED (OAuth недоступен).
Recovery confidence: HIGH
```
