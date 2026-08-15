# LaVenta — Handoff

## Current Status

**Wheel of Fortune — LIVE-подтверждён на боевом Supabase** (spin работает). При финальной live-проверке найден и исправлен **второй баг** в применении промокодов.

- **LAV-BUG-054 (Wheel spin) — FIXED & LIVE VERIFIED.** `wheel-spin-fix.sql` применён владельцем. Реальный `spin_wheel` → 200, вернул 5% (активная награда); mobile auto-open в активном окне (Asia/Baku 16:25) сработал сам; win «5% endirim qazandınız»; reward сохранён (expiry +24ч); второй spin → `WHEEL_ALREADY_SPUN`; refresh не даёт reroll; console 0 ошибок; 42883 больше нет; 7 секторов (5/10/15 active, 20/30/40/50 🔒 locked).
- **LAV-BUG-055 (Promo apply) — FIXED в SQL, ТРЕБУЕТ запуска владельцем.** Live-тест с реальной наградой вскрыл `42702 column reference "promo_id" is ambiguous` в `_validate_promo` (OUT-колонка `promo_id` vs `promo_redemptions.promo_id`). Ломает применение ЛЮБОГО валидного промо/награды на checkout. Фикс — алиас `pr.` в `supabase/promo-validate-fix.sql` (клиент не меняется).

**OWNER ACTION REQUIRED (1 шаг):** выполнить **`supabase/promo-validate-fix.sql`** в Supabase → SQL Editor. После этого checkout со скидкой заработает; окно колеса для проверки НЕ требуется (награды `WHEEL-*` уже выданы, валидны 24ч).

## Current Branch

`main`

## Last Completed Task

### Финальная LIVE-проверка Wheel + фикс promo 42702

- **Файлы:** `supabase/promo-validate-fix.sql` (new — фикс `_validate_promo`); docs: `BUGS.md` (054 → LIVE VERIFIED, new 055), `TODO.md`, `HANDOFF.md`. **Клиентский код НЕ менялся** (баг чисто серверный).
- Предыдущий фикс `supabase/wheel-spin-fix.sql` — применён и live-подтверждён.

## Last Verified Checks (LIVE, боевой Supabase, без стабов)

- **SQL fix активен:** `generate_promo_code('WHEEL')` → `WHEEL-ZUPHT3` (200), 42883 нет.
- **7 секторов:** `get_wheel_public_config` → sectors 5/10/15 active, 20/30/40/50 active:false; веса скрыты.
- **Реальный spin:** REST `spin_wheel` (account A) → 5%, `active_reward` сохранён, expiry +24ч; второй spin → `WHEEL_ALREADY_SPUN`. Mobile UI (account B, playwright): auto-open в окне → FIRLAT → `spin_wheel` 200 → win «5% endirim qazandınız»; refresh → без reroll (показ награды, спина нет); console 0 ошибок.
- **Только 5/10/15 выпадают:** конфиг 20/30/40/50 active:false (weight 0); сервер выбирает только weight>0.
- **Security (LIVE):** anon spin → AUTH_REQUIRED; non-admin UPDATE wheel_config (self 50%) → RLS 0 строк; non-admin INSERT promo → 42501; wheel_config select → [] (веса скрыты).
- **НАЙДЕН БАГ 42702** (validate_promo/place_order на валидном коде) → исправлен в `promo-validate-fix.sql`.
- **NOT VERIFIED (до запуска promo-validate-fix.sql):** checkout со скидкой + order discount persistence + reuse-blocked через реальный заказ — заблокированы багом 42702; проверю сразу после применения фикса (окно не нужно).

## Current Architecture Notes

- Wheel: окно/результат/один-спин — сервер (Asia/Baku, weighted `random()`, `UNIQUE(account_id,window_key)`). Reward = individual one-use промокод (`source=wheel`, expiry `reward_expiry_hours`) через общий promo-движок.
- 7 секторов: `wheel_config.rewards` = 5/10/15/20/30/40/50; ACTIVE weight>0, LOCKED weight=0. `get_wheel_public_config.sectors` без весов. Frontend fallback `[5,10,15,20,30,40,50]`.
- Auto-open: `WheelOfFortune` (mobile-only), статус раз в 60с + visibility; открывается при `in_window&&signed_in&&!already_spun`, не переоткрывается для dismissed-окна.
- Promo: `validate_promo` (preview) + `place_order(...,p_promo_code)` (trusted, atomic redemption). Скидка на merchandise subtotal.

## Known Issues

- **PENDING OWNER:** `supabase/promo-validate-fix.sql` (иначе checkout со скидкой падает 42702). Ранее — `realtime-catalog.sql` / `product-featured.sql` (опц.).

## Risks

- До применения `promo-validate-fix.sql` любой валидный промокод/награда на checkout не применяется (42702). После — заработает (клиент готов).

## Next Recommended Step

1. **Владельцу:** выполнить `supabase/promo-validate-fix.sql`. Проверка: `select * from public.validate_promo('<WHEEL-код из get_wheel_status>', 49);` → вернёт discount без 42702.
2. **После этого (я или владелец):** checkout с wheel-наградой → скидка 5% в summary, заказ хранит `discount_amount/promo_code/discount_source='wheel'`, повторное применение → `PROMO_ALREADY_USED`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-164500

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (`/elva-laventa/`).
2. **Описание:** магазин: каталог, корзина, checkout (`place_order`+Telegram), admin, AZ/RU/EN, промокоды + Wheel of Fortune (единый discount-движок).
3. **Текущее состояние:** Wheel LIVE-подтверждён (spin 5%). Найден+исправлен promo-баг 42702 → `supabase/promo-validate-fix.sql` (OWNER должен выполнить). Клиент не менялся в этом шаге.
4. **Что реализовано:** фикс `_validate_promo` (алиас `pr.`); ранее — wheel-spin-fix (random(), 7 секторов), клиент колеса (auto-open, sectors, land, i18n).
5. **Последняя задача:** финальная LIVE-проверка + LAV-BUG-055.
6. **Изменённые файлы:** `supabase/promo-validate-fix.sql` (new); docs HANDOFF/BUGS/TODO.
7. **Проверки:** LIVE spin/auto-open/security — VERIFIED; checkout discount — NOT VERIFIED до применения promo-validate-fix.sql.
8. **Ограничения:** mobile scope; desktop не трогать; одна система скидок; результат колеса только server-side; не ослаблять RLS; нет service_role во фронте; не `?forceWheel=`.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** OWNER — `promo-validate-fix.sql`; затем LIVE checkout со скидкой.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit+push; deploy (Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Wheel LIVE verified (spin OK); found+fixed promo 42702 (_validate_promo) — OWNER must run supabase/promo-validate-fix.sql, затем checkout-скидка проверяется
Expected modified files:
  - supabase/promo-validate-fix.sql (new)
  - docs/HANDOFF.md, docs/BUGS.md (054 live, 055 new), docs/TODO.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: клиент не менялся; предыдущий vite build — успешно
Last verified tests: LIVE — spin 5%, auto-open, 7 sectors, security (RLS), console 0. Checkout-скидка — NOT VERIFIED до promo-validate-fix.sql
Recovery confidence: HIGH
```
