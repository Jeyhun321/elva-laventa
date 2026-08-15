# LaVenta — Handoff

## Current Status

**Phase 2 ПОЛНОСТЬЮ реализована** (промокоды + Wheel of Fortune на едином discount-движке). SQL (`supabase/promo-and-wheel.sql`) выполнен владельцем в Supabase (подтверждено). Клиент (Stage 2–6) реализован, собран и запушен.

- **Промокоды:** campaign + individual; checkout-блок «Promokod» (mobile) с preview и пересчётом; скидка server-trusted (`validate_promo` + 8-арг `place_order`); использование фиксируется только при заказе (`promo_redemptions`); double-use защищён `SELECT FOR UPDATE`.
- **Wheel:** приглашение «Şansını sına» в окне (Asia/Baku), результат выбирает сервер (weighted), один спин на окно (`UNIQUE(account_id,window_key)`), выигрыш = account-bound individual-промокод (source=wheel) через общий движок; reroll через reload/DevTools невозможен.
- **Admin:** вкладки «Промокоды» (CRUD, Generate, привязка к клиенту) и «Колесо фортуны» (окна, timezone, проценты+веса, expiry, спины/окно).

**Проверено:** build OK; REST — trusted-RPC/RLS (anon→`AUTH_REQUIRED`; веса колеса скрыты; `promo_codes` анониму недоступны на чтение/запись); Playwright — колесо подключено (RPC 200), консоль чистая, вне окна приглашение корректно скрыто.

**Осталось за владельцем (не блокирует деплой):** финальная авторизованная проверка на реальном телефоне — применить промокод на checkout и один спин колеса во временном окне. Playwright не может авторизоваться (Google) и форсировать окно.

## Current Branch

`main`

## Last Completed Task

### Phase 2 Stage 2–6 — клиент промокодов + колеса

- **Файлы:** `src/lib/promo.js`, `src/lib/wheel.js`, `src/components/WheelOfFortune.jsx` (new); `src/lib/orders.js` (8-арг place_order); `src/pages/CheckoutPage.jsx` (promo UI + пересчёт + авто-применение reward колеса); `src/pages/AdminPage.jsx` + `src/admin/db.js` (PromoPanel + WheelPanel + db-функции); `src/App.jsx` (монтаж колеса); `src/i18n/translations.js` (promo_* / wheel_*); `src/styles/index.css` (promo/admin/wheel).
- **Не менялось по существу:** desktop-логика; колесо рендерится только на mobile (`useMediaQuery(max-width:900px)`); существующий 7-арг `place_order` не используется клиентом (перешли на 8-арг), но сохранён в БД.

## Last Verified Checks

- `npm run build` — **успешно**.
- **REST (anon-ключ):** `validate_promo`/`spin_wheel`/`place_order`(8) → `AUTH_REQUIRED`; `get_wheel_public_config` → `{enabled,rewards:[5,10,15],windows,Asia/Baku,tolerance 5,expiry 24}` (веса скрыты); `get_wheel_status` → `signed_in:false,in_window:false`; anon SELECT `promo_codes` → `[]`; anon INSERT `promo_codes` → RLS violation.
- **Playwright (mobile 360):** home грузится, `get_wheel_public_config`+`get_wheel_status` → 200, приглашение колеса скрыто (сейчас вне окна — корректно), console 0 ошибок.
- **NOT VERIFIED (ограничения эмуляции):** реальное применение промокода на checkout и spin колеса требуют Google-сессии и активного окна — за владельцем на устройстве. Playwright не авторизуется и не форсирует серверное окно.

## Current Architecture Notes

- **Единый discount-движок (D-007):** и промо, и выигрыш колеса — записи в `promo_codes`; применение — только через `place_order`; учёт — `promo_redemptions`. Скидка на merchandise subtotal; доставка отдельно. Один промо на заказ (stacking запрещён — checkout хранит один `appliedPromo`, замена очищает предыдущий).
- **Клиентские RPC-обёртки:** `src/lib/promo.js` (`validatePromo`, `promoErrorKey`, `previewDiscount`), `src/lib/wheel.js` (`getWheelConfig`, `getWheelStatus`, `spinWheel`).
- **Wheel reward → checkout:** после выигрыша код кладётся в `sessionStorage['elva_wheel_reward']`; CheckoutPage авто-применяет его один раз (безопасно: reward account-bound + one-use в БД, фарм невозможен). Очищается после успешного заказа/Remove.
- Прочее без изменений: Phase 1 (Realtime D-006, честные цвета, fallback поиска), LAV-BUG-052.

## Known Issues

- Финальная авторизованная e2e-проверка promo/wheel — за владельцем (устройство + окно).
- Ранее применённые/ожидающие миграции: `promo-and-wheel.sql` (применён, включает stock-guard); `realtime-catalog.sql` (Phase 1, если ещё не применён — для Realtime каталога); `product-featured.sql` (F-007, опционально).

## Risks

- Wheel-приглашение появляется только внутри окна Asia/Baku (по серверному времени) — вне окна это ожидаемо «пусто», не баг.
- `validate_promo` доступен любому авторизованному (нужно для preview); для individual-кодов чужим отдаёт `PROMO_ACCOUNT_MISMATCH` (скидка не раскрывается). Низкий риск enumeration для random-кодов — приемлемо.

## Next Recommended Step

1. **Владельцу:** на телефоне под Google — создать в админке campaign-код (напр. SUMMER2026, 20%, 1/аккаунт), применить на checkout, оформить заказ; проверить, что скидка в заказе и Telegram. Затем во временном окне крутнуть колесо и применить выигрыш.
2. (Опц.) Настроить веса/проценты колеса и окна в админке под кампанию.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-153000

1. **Проект:** Elva LaVenta — React/Vite storefront (женская одежда), Supabase (Frankfurt), GitHub Pages (base `/elva-laventa/`).
2. **Описание:** магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, AZ/RU/EN.
3. **Текущее состояние:** Phase 2 полностью реализована и запушена; SQL применён владельцем. Build OK; trusted-слой проверен по REST; Playwright wiring зелёный. Осталась авторизованная проверка на устройстве.
4. **Что реализовано (Phase 2 клиент):** promo lib + wheel lib; checkout promo UI (mobile) + переход на 8-арг `place_order` + `validate_promo`; i18n promo_*/wheel_*; Admin PromoPanel (CRUD/Generate/привязка) + WheelPanel (конфиг); mobile WheelOfFortune (server-decided spin, one-per-window, reward через promo-движок); orders.js discount info; стили.
5. **Последняя задача:** Phase 2 Stage 2–6.
6. **Изменённые файлы:** `src/lib/promo.js`,`src/lib/wheel.js`,`src/components/WheelOfFortune.jsx` (new); `src/lib/orders.js`,`src/pages/CheckoutPage.jsx`,`src/pages/AdminPage.jsx`,`src/admin/db.js`,`src/App.jsx`,`src/i18n/translations.js`,`src/styles/index.css`; docs: HANDOFF/FEATURES(F-010)/TODO. SQL: `supabase/promo-and-wheel.sql` (уже был закоммичен в Stage 1).
7. **Проверки:** build OK; REST trusted-RPC/RLS; Playwright wiring (RPC 200, консоль чистая). Авторизованный e2e — NOT VERIFIED (за владельцем).
8. **Ограничения:** одна система скидок; discount только server-trusted; ограничения аккаунта — в БД/RPC/RLS; не ослаблять RLS; security-critical не в localStorage; desktop не переделывать; storefront scope mobile; без лишних зависимостей; не ломать cart/checkout/express delivery/order/Telegram/auth/Realtime/favorites/навигацию/сток/цены; нет `?forceWheel=`.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** владельцу — авторизованная проверка promo/wheel на устройстве во временном окне; при желании настроить веса/окна колеса.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновлять `docs/HANDOFF.md` и профильные доки; commit + push; deploy (Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Phase 2 (promo codes + Wheel of Fortune) — реализована полностью, запушена; осталась авторизованная проверка владельцем на устройстве
Expected modified files:
  - src/lib/promo.js, src/lib/wheel.js, src/components/WheelOfFortune.jsx (new)
  - src/lib/orders.js, src/pages/CheckoutPage.jsx, src/pages/AdminPage.jsx, src/admin/db.js, src/App.jsx
  - src/i18n/translations.js, src/styles/index.css
  - docs/HANDOFF.md, docs/FEATURES.md (F-010), docs/TODO.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-15
Last verified tests: REST trusted-RPC/RLS + Playwright wiring — зелёные. Авторизованный e2e promo/wheel — NOT VERIFIED (за владельцем: устройство + окно)
Recovery confidence: HIGH
```
