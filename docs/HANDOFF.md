# LaVenta — Handoff

## Current Status

**Wheel of Fortune доработан и исправлен** (Phase 2). Главный баг FIRLAT → «Xəta baş verdi» — **root cause найден и устранён**.

- **BUG (LAV-BUG-054):** `spin_wheel`/`generate_promo_code` вызывали `gen_random_bytes` (pgcrypto) при `search_path=public`; в Supabase pgcrypto в схеме `extensions` → рантайм-ошибка `42883 function gen_random_bytes(integer) does not exist`. Подтверждено фактически через REST. **Фикс:** переход на встроенный `random()` (без pgcrypto).
- **7 секторов:** колесо показывает 5/10/15/20/30/40/50; ACTIVE = 5/10/15 (weight>0, реально выпадают), LOCKED = 20/30/40/50 (weight=0, 🔒, сервер их НИКОГДА не возвращает). `get_wheel_public_config` отдаёт `sectors:[{percent,active}]` без весов.
- **Auto-open:** в активном окне (Asia/Baku, серверное время) модал открывается сам (в т.ч. если пользователь уже был на сайте — сработает на следующем 60-сек refresh статуса/visibility), без refresh. Закрытие крестиком запоминает окно → не переоткрывается (нет infinite popup). CTA «Şansını sına» остаётся вторичной точкой входа, поднят над таббаром.
- **Animation → server result:** посадка колеса вычисляется из серверного процента (`landOn(percent)`); win-текст из того же значения → расхождение невозможно.
- **i18n бизнес-ошибок:** WHEEL_ALREADY_SPUN / WHEEL_CLOSED / AUTH_REQUIRED — понятные локализованные сообщения; generic только для реально неизвестной ошибки.
- **Admin:** в «Колесо фортуны» каждый сектор помечен ACTIVE/LOCKED (weight>0 / =0) + пояснение.

**OWNER ACTION REQUIRED:** выполнить **`supabase/wheel-spin-fix.sql`** в Supabase → SQL Editor. Идемпотентно; сохраняет текущие веса 5/10/15, добавляет locked 20/30/40/50. До этого FIRLAT будет падать.

## Current Branch

`main`

## Last Completed Task

### Wheel fix + 7 секторов (active/locked) + auto-open + i18n ошибок

- **Файлы:** `supabase/wheel-spin-fix.sql` (new — фикс RPC + sectors + seed); `src/components/WheelOfFortune.jsx` (auto-open/dismissal/7-секторов/land/i18n); `src/lib/wheel.js` (без изменений контракта — использует sectors); `src/pages/AdminPage.jsx` (ACTIVE/LOCKED бейджи); `src/i18n/translations.js` (`wheel_closed`, `wheel_locked`); `src/styles/index.css` (CTA-отступ/z-index, метки 7 секторов, locked-стиль, grid admin).
- **Не менялось:** promo checkout, place_order, orders, delivery, cart, auth, realtime, предыдущие mobile-фиксы — не тронуты.

## Last Verified Checks

- **Root cause:** REST `generate_promo_code` → `42883 gen_random_bytes does not exist` (фактическое подтверждение).
- `npm run build` — успешно.
- **Playwright (mobile 360, стаб RPC для рендера):** auto-open в окне ✓; 7 секторов ✓ (5/10/15 ACTIVE, 20/30/40/50 🔒 LOCKED); FIRLAT → «10% endirim qazandınız» ✓; dismissal (X) → нет повторного popup ✓; modal в вьюпорте, без гориз. оверфлоу ✓; CTA поднят над таббаром ✓; console 0 ошибок ✓.
- **Security regression (REST):** anon/authed-non-admin не создают промо, не меняют wheel_config (попытка 50%/weight100 → RLS 0 строк); spin вне окна → WHEEL_CLOSED. RLS не ослаблен.
- **NOT VERIFIED (ограничения эмуляции + OWNER SQL):** реальный server-spin (после `wheel-spin-fix.sql`, под Google-auth, в активном окне) — Playwright не логинится в Google и не форсирует серверное окно; стаб проверяет только клиентский UI/анимацию.

## Current Architecture Notes

- **Wheel trust:** окно/результат/один-спин — сервер (`spin_wheel`, `_wheel_current_window` Asia/Baku, `UNIQUE(account_id,window_key)`). Результат weighted через `random()` (server-side, не frontend). Клиент только анимирует к готовому результату.
- **Sectors:** `wheel_config.rewards` хранит все 7; ACTIVE=weight>0, LOCKED=weight=0. `get_wheel_public_config.sectors` = все (с флагом active, без весов). Frontend: если `sectors` есть — рисует их; иначе fallback `[5,10,15,20,30,40,50]` (active = из `rewards`).
- **Reward → promo:** individual account-bound, one-use, expiry `reward_expiry_hours`, `source=wheel`; применяется общим checkout promo-движком (единая система).
- **Auto-open:** `WheelOfFortune` (mobile-only, useMediaQuery) — статус раз в 60с + на visibility; открывается при `enabled&&in_window&&signed_in&&!already_spun` и если окно не «dismissed» в этой сессии.

## Known Issues

- **PENDING OWNER:** `supabase/wheel-spin-fix.sql` (иначе FIRLAT падает). Плюс из прошлого — `realtime-catalog.sql` (если ещё не применён), `product-featured.sql` (F-007, опц.).

## Risks

- До запуска `wheel-spin-fix.sql` спин не работает (клиент покажет generic-ошибку на реальный 42883). После запуска — заработает; клиент уже готов (7 секторов рисуются и через fallback, и через server sectors).
- Auto-open реагирует в пределах 60с после начала окна (компромисс «без агрессивного polling»).

## Next Recommended Step

1. **Владельцу:** выполнить `supabase/wheel-spin-fix.sql`. Проверка: `select public.generate_promo_code('WHEEL');` (вернёт код), `select public.get_wheel_public_config();` (7 sectors).
2. **Владельцу (на телефоне):** в активном окне под Google — FIRLAT → выигрыш 5/10/15 → «использовать» → применяется на checkout. Второй спин в том же окне заблокирован; refresh не даёт reroll.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-160500

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (base `/elva-laventa/`).
2. **Описание:** магазин: каталог, избранное, корзина, checkout (`place_order`+Telegram), admin, AZ/RU/EN, промокоды + Wheel of Fortune (единый discount-движок).
3. **Текущее состояние:** Wheel-фикс готов и запушен. Root cause спина (gen_random_bytes/pgcrypto) устранён в `supabase/wheel-spin-fix.sql` (OWNER должен выполнить). Клиент: auto-open, 7 секторов active/locked, посадка на серверный результат, i18n ошибок, admin ACTIVE/LOCKED. Build + playwright(stub) + REST security — зелёные.
4. **Что реализовано:** см. «Last Completed Task».
5. **Последняя задача:** LAV-BUG-054 + доработка колеса (auto-open, 7 секторов, i18n).
6. **Изменённые файлы:** `supabase/wheel-spin-fix.sql` (new); `src/components/WheelOfFortune.jsx`, `src/pages/AdminPage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`; docs: HANDOFF/BUGS(054)/TODO.
7. **Проверки:** root cause (REST 42883); build; playwright stub (auto-open/7 секторов/land/dismiss/layout, console 0); REST security (RLS не ослаблен). Реальный server-spin — NOT VERIFIED до OWNER SQL.
8. **Ограничения:** mobile scope; desktop не трогать; одна система скидок; результат колеса только server-side; не ослаблять RLS; нет service_role во фронте; не `?forceWheel=`; не ломать promo/checkout/orders/delivery/auth/realtime/предыдущие фиксы.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** OWNER — `wheel-spin-fix.sql` + проверка реального спина на телефоне в окне.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit + push; deploy (Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Wheel fix (spin bug root cause) + 7 sectors active/locked + auto-open + i18n — код готов и запушен; OWNER должен выполнить supabase/wheel-spin-fix.sql
Expected modified files:
  - supabase/wheel-spin-fix.sql (new)
  - src/components/WheelOfFortune.jsx, src/pages/AdminPage.jsx, src/i18n/translations.js, src/styles/index.css
  - docs/HANDOFF.md, docs/BUGS.md (LAV-BUG-054), docs/TODO.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-15
Last verified tests: root cause REST(42883); playwright stub (auto-open/7 sectors/land/dismiss, console 0); REST security (RLS intact). Реальный server-spin — NOT VERIFIED до OWNER SQL
Recovery confidence: HIGH
```
