# LaVenta — Handoff

## Current Status

**Phase 2 / Stage 1 (DB-фундамент единого discount-движка) — ГОТОВ в рабочем дереве.** Это SQL-only инкремент: приложение не меняется, пока владелец не выполнит скрипт И не выйдут клиентские стадии. Ничего существующего не сломано.

Реализован общий движок скидок для **промокодов** (campaign + individual) и **Wheel of Fortune** поверх ОДНОЙ trusted-модели (см. DECISIONS #D-007):
- Таблицы: `promo_codes`, `promo_redemptions`, `wheel_config` (singleton), `wheel_spins`.
- Trusted-RPC: `validate_promo` (preview для checkout, только чтение), `place_order(...,p_promo_code)` (8-арг: атомарная валидация + фиксация redemption + скидка в заказе; 7-арг делегирует с промо=null), `spin_wheel` (результат определяет сервер, weighted), `get_wheel_public_config`/`get_wheel_status`, `generate_promo_code`.
- Безопасность: прямого доступа клиента к таблицам скидок нет (только через security-definer RPC); RLS admin-only через `is_admin()`; веса колеса на сервере; время окна — `Asia/Baku` по серверным часам; один спин на окно через `UNIQUE(account_id, window_key)`; двойное использование промо блокируется `SELECT ... FOR UPDATE`.

**ТРЕБУЕТ ВЛАДЕЛЬЦА (обязательно, иначе Stage 2+ не заработает):** выполнить `supabase/promo-and-wheel.sql` в Supabase → SQL Editor. Скрипт идемпотентен; заодно активирует stock-guard (LAV-BUG-050), т.к. включает in_stock-проверку в `place_order`.

Плюс из Phase 1: `supabase/realtime-catalog.sql` (Realtime каталога) — тоже за владельцем.

## Current Branch

`main`

## Last Completed Task

### Phase 2 / Stage 1 — единый discount-движок (SQL foundation)

- **Файлы:**
  - `supabase/promo-and-wheel.sql` — новый, вся схема + RPC + RLS + интеграция в `place_order`.
  - `docs/DECISIONS.md` (#D-007), `docs/TODO.md` (стадии Phase 2), `docs/HANDOFF.md`.
- **Не менялось:** клиентский код НЕ трогался (Stage 1 — только SQL + docs). Существующий 7-арг `place_order` сохранён (делегирует), поэтому текущий checkout продолжает работать до Stage 2.

## Last Verified Checks

- SQL написан против реальной схемы (audit: `place-order-rpc.sql`, `order-stock-guard.sql`, `accounts-orders.sql`, `marketplace-foundation.sql`, `schema.sql`, `admin-lockdown.sql`). Интеграция скидки согласована с существующим триггером `recalc_order_total` (теперь вычитает `discount_amount`).
- **NOT VERIFIED (по природе задачи):** SQL не выполнялся — его запускает владелец в Supabase (нет service_role/DDL-доступа из клиента). До выполнения скрипта и выхода Stage 2 фича НЕ live. Playwright-проверка promo/wheel возможна только после Stage 1 SQL + при наличии тест-аккаунта.

## Current Architecture Notes

- **Единый discount-движок (D-007):** и промокод, и выигрыш колеса — записи в `promo_codes`; применение к заказу — только через `place_order`; факт использования — `promo_redemptions` (per-account/total лимиты считаются оттуда). Скидка — на merchandise subtotal; доставка в БД-итог не входит (экспресс-доплата в note/Telegram, как и раньше). `orders`: новые `discount_amount/promo_code/discount_source`.
- **Коды ошибок промо (для i18n в Stage 2):** `PROMO_NOT_FOUND`, `PROMO_INACTIVE`, `PROMO_EXPIRED`, `PROMO_NOT_STARTED`, `PROMO_ACCOUNT_MISMATCH`, `PROMO_ALREADY_USED`, `PROMO_LIMIT_REACHED`, `PROMO_MIN_ORDER`, `AUTH_REQUIRED`.
- **Коды колеса:** `WHEEL_DISABLED`, `WHEEL_CLOSED` (вне окна), `WHEEL_ALREADY_SPUN`, `WHEEL_NO_REWARDS`, `AUTH_REQUIRED`.
- **Контракты RPC для Stage 2 клиента:**
  - `validate_promo(p_code text, p_subtotal numeric)` → `{discount_type, discount_value, discount_amount}` (только достижимая скидка; НЕ фиксирует использование).
  - `place_order(name,phone,phone_call,email,address,note,items,p_promo_code)` — checkout должен перейти на эту 8-арг версию, передавая применённый код.
  - `get_wheel_public_config()` → `{enabled,timezone,windows,tolerance_minutes,reward_expiry_hours,rewards:[percent...]}` (без весов).
  - `get_wheel_status()` → `{enabled,signed_in,in_window,window,already_spun,active_reward}`.
  - `spin_wheel()` → `{percent, code, expires_at}`.
- Прочее без изменений: Phase 1 (Realtime каталога D-006, честные цвета LAV-BUG-053, fallback поиска), LAV-BUG-052 (auth-resume).

## Known Issues

- **PENDING OWNER:** `supabase/promo-and-wheel.sql` (Phase 2 spine); `supabase/realtime-catalog.sql` (Phase 1 Realtime); ранее — `supabase/order-stock-guard.sql` (перекрывается новым place_order из promo-and-wheel), `supabase/product-featured.sql` (F-007).
- Phase 2 клиент (Stage 2–6) ещё не реализован — см. TODO.

## Risks

- `place_order` переопределяется скриптом Phase 2 (обе арности). Логика повторяет order-stock-guard (in_stock + auth.uid) и добавляет промо; при применении важно выполнить файл целиком. Обратная совместимость: 7-арг сохранён → текущий клиент не ломается.
- Фича НЕ должна считаться live до выполнения SQL владельцем и выхода клиентских стадий.

## Next Recommended Step

1. **Владельцу:** выполнить `supabase/promo-and-wheel.sql` (SQL Editor). Проверка: `select * from public.validate_promo('SUMMER2026', 100);` после вставки тест-кода; `select public.get_wheel_status();`.
2. **Разработчику (Stage 2):** Checkout promo UI (mobile) + перевод клиента на 8-арг `place_order` + `validate_promo` preview + i18n кодов ошибок. Затем Stage 3–6 (см. TODO).

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-143659

1. **Проект:** Elva LaVenta — React/Vite storefront (магазин женской одежды), Supabase (Frankfurt), GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, AZ/RU/EN.
3. **Текущее состояние:** Phase 2 Stage 1 (DB-фундамент единого discount-движка) готов в рабочем дереве и закоммичен как SQL+docs (приложение не изменено). Ждёт запуска владельцем `supabase/promo-and-wheel.sql`. Клиентские стадии 2–6 ещё не сделаны.
4. **Что реализовано (Stage 1):** `supabase/promo-and-wheel.sql` — таблицы `promo_codes/promo_redemptions/wheel_config/wheel_spins`; RPC `validate_promo`, `place_order`(7 и 8 арг), `spin_wheel`, `get_wheel_public_config`, `get_wheel_status`, `generate_promo_code`, `_validate_promo`, `_wheel_current_window`; `orders.discount_amount/promo_code/discount_source`; `recalc_order_total` вычитает скидку; RLS admin-only; Realtime для promo_codes/wheel_config. Единая модель: выигрыш колеса = individual-промокод (source=wheel), применяется тем же движком.
5. **Последняя задача:** Phase 2 Stage 1.
6. **Изменённые файлы:** `supabase/promo-and-wheel.sql` (new); docs: `HANDOFF.md`, `DECISIONS.md` (D-007), `TODO.md`.
7. **Проверки:** SQL написан по аудиту реальной схемы; НЕ выполнялся (запускает владелец). Клиент не менялся, build не затронут. Фича НЕ live до SQL + Stage 2.
8. **Ограничения:** не делать две системы скидок; discount только server-trusted (клиент не считает total); ограничения по аккаунту — в БД/RPC/RLS, не только в localStorage; не ослаблять RLS; не хранить security-critical в localStorage; desktop не переделывать; storefront scope — mobile; Admin можно расширять; не добавлять зависимости без нужды; не ломать cart/checkout/express delivery/order/Telegram/auth/Realtime/favorites/навигацию/сток/цены; НЕ отправлять `?forceWheel=true` в прод.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** владельцу — выполнить `promo-and-wheel.sql`. Разработчику — Stage 2 (checkout promo UI + 8-арг place_order + validate_promo + i18n), Stage 3 (Admin promo-модуль), Stage 4 (Admin wheel-конфиг), Stage 5 (mobile wheel UI), Stage 6 (playwright + build + deploy). Контракты RPC — в разделе «Current Architecture Notes» этого файла.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем Stage 2 (checkout).
12. **После работы:** обновить `docs/HANDOFF.md` (полностью), при необходимости `FEATURES/BUGS/DECISIONS/TODO`, commit + push, запустить deploy (Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Phase 2 Stage 1 — единый discount-движок (SQL foundation) — готов в рабочем дереве и закоммичен; следующий шаг — владелец запускает SQL, затем Stage 2 (клиент)
Expected modified files:
  - supabase/promo-and-wheel.sql (new)
  - docs/HANDOFF.md, docs/DECISIONS.md (D-007), docs/TODO.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: не затронут (клиент не менялся); SQL — NOT EXECUTED (запускает владелец)
Last verified tests: N/A на Stage 1 (SQL-only). Playwright promo/wheel — после Stage 1 SQL + Stage 2 клиента
Recovery confidence: HIGH
```
