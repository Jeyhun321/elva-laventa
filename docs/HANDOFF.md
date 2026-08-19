# LaVenta — Handoff

## Current Status

**Wheel of Fortune — финальная админ-конфигурация секторов реализована (клиент+SQL).** Admin теперь полностью управляет колесом: проценты, веса, статус (ACTIVE / DISPLAY ONLY), видимость сектора и **явный** показ иконки замка. Требуется применить одну идемпотентную SQL-миграцию на боевом Supabase.

- **Клиентская часть — СОБРАНА и загружается без ошибок** (vite build OK; storefront boot на 390px — console 0 errors).
- **Серверная часть — готова в `supabase/wheel-config-status-lock.sql`, ТРЕБУЕТ запуска владельцем.** Расширяет `wheel_config.rewards` полями `status`/`show_lock`; `spin_wheel` выбирает только `status='active' AND weight>0`; `get_wheel_public_config.sectors` отдаёт `{percent, active, show_lock}`.
- **Ранее (не тронуто):** `supabase/promo-validate-fix.sql` (фикс 42702) — если ещё не применён владельцем, применить тоже.

**OWNER ACTION REQUIRED:** выполнить **`supabase/wheel-config-status-lock.sql`** в Supabase → SQL Editor → Run. Скрипт идемпотентен: сохраняет текущие 7 секторов и веса, добавляя `status`/`show_lock` (5/10/15 → active; 20/30/40/50 → display_only с замком). До применения фича не считается полностью live: витрина не получит `show_lock` (frontend временно сохраняет прежнее поведение — замок у неактивных).

## Current Branch

`main`

## Last Completed Task

### Wheel: полная админ-конфигурация секторов (status ACTIVE/DISPLAY ONLY + явный показ замка)

- **Data model:** каждый reward = `{ percent, weight, status, show_lock }`. `status='active'` (участвует, нужен weight>0) или `display_only` (виден, сервер не выбирает). `show_lock` — Admin явно управляет иконкой замка (не из weight).
- **Admin (WheelPanel):** строка сектора = Скидка % / Вес / Статус (select ACTIVE·DISPLAY ONLY) / Замок (toggle, скрыт=disabled для ACTIVE) / удалить. Кнопка «Добавить скидку». Валидация перед сохранением (percent 1..100, вес ≥0, без дублей, ACTIVE→weight>0, ≥1 ACTIVE).
- **Server:** `spin_wheel` суммирует/выбирает только active+weight>0 (display_only исключён всегда, даже при weight>0). `get_wheel_public_config` отдаёт `sectors:[{percent,active,show_lock}]` без весов. Обратная совместимость для старых наград без полей.
- **Storefront (mobile):** сектора строятся полностью из серверного конфига; замок = аккуратная SVG `IconLock` (не emoji); конфиг перечитывается 60с + on visibility (правки Admin без manual refresh, без `location.reload()`).
- **Файлы:** `supabase/wheel-config-status-lock.sql` (new), `src/pages/AdminPage.jsx`, `src/components/WheelOfFortune.jsx`, `src/components/Icons.jsx`, `src/styles/index.css`.

## Last Verified Checks

- **Build:** `npm run build` — успешно (133 модуля, 0 ошибок).
- **Storefront boot (playwright-mobile, 390px, dev):** главная грузится, console **0 errors** (2 warning — предсуществующие React Router future-flag, к задаче не относятся).
- **Lint:** скрипта lint в проекте нет (в `package.json` только dev/build/preview/logs) — не запускался.
- **NOT VERIFIED (нужна применённая SQL + активное окно + admin-сессия):** live-спин с учётом status; появление/исчезновение сектора после Save в Admin; live-показ/скрытие замка через `show_lock`; переход ACTIVE↔DISPLAY ONLY на реальном `spin_wheel`. Заблокировано зависимостью от OWNER-SQL и временного окна колеса.

## Current Architecture Notes

- Одна система скидок; результат колеса только на сервере (weighted `random()`, `UNIQUE(account_id,window_key)`), reward = individual one-use промокод (source=wheel) через общий promo-движок.
- Reward config: `wheel_config.rewards` jsonb = массив `{percent,weight,status,show_lock}`. Активность сектора = `status='active' AND weight>0`. Замок = `show_lock` (Admin), на витрине показывается только у неактивных.
- Публичный конфиг: `get_wheel_public_config.sectors` = `{percent,active,show_lock}` (без весов); `rewards` = только достижимые проценты (совместимость).
- Auto-open, one-spin-per-window, reward persistence, checkout promo engine, RLS — не менялись.

## Known Issues

- **PENDING OWNER:** `supabase/wheel-config-status-lock.sql` (иначе витрина не получит `show_lock`, а status не enforced на сервере — сейчас старый `spin_wheel` фильтрует по weight>0, что близко, но display_only с weight>0 не исключается до применения). Также при необходимости — `supabase/promo-validate-fix.sql` (42702), `realtime-catalog.sql` / `product-featured.sql` (опц.).

## Risks

- Переходный период между деплоем клиента и применением SQL: `get_wheel_public_config` ещё без `show_lock` → frontend fallback показывает замок у неактивных секторов (прежнее поведение). После SQL замок управляется Admin. Регрессии нет.

## Next Recommended Step

1. **Владельцу:** выполнить `supabase/wheel-config-status-lock.sql`. Проверка: `select public.get_wheel_public_config();` → в `sectors` появятся `show_lock`.
2. **После этого (я/владелец):** в Admin → Колесо изменить status/замок, Save; на mobile в активном окне проверить: сектор виден/скрыт, замок вкл/выкл, display_only не выпадает, ACTIVE с weight>0 выпадает; console/network чистые; нет горизонтального оверфлоу.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260820-004821

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (`/elva-laventa/`).
2. **Описание:** магазин: каталог, корзина, checkout (`place_order`+Telegram), admin-панель, AZ/RU/EN, промокоды + Wheel of Fortune на едином discount-движке.
3. **Текущее состояние:** реализована полная админ-конфигурация секторов колеса (status ACTIVE/DISPLAY ONLY + явный показ замка). Клиент собран и грузится без ошибок. Серверная миграция `supabase/wheel-config-status-lock.sql` готова, но должна быть выполнена владельцем.
4. **Что реализовано:** data model reward = `{percent,weight,status,show_lock}`; Admin WheelPanel (status-select, lock-toggle, валидация, «Добавить скидку»); `spin_wheel` выбирает только active+weight>0; `get_wheel_public_config.sectors` c `show_lock`; витрина строит сектора из конфига, замок = SVG IconLock, live-конфиг (60с+visibility).
5. **Последняя задача:** финальная доработка конфигурации колеса под управление из Admin.
6. **Изменённые файлы:** `supabase/wheel-config-status-lock.sql` (new); `src/pages/AdminPage.jsx`; `src/components/WheelOfFortune.jsx`; `src/components/Icons.jsx`; `src/styles/index.css`; docs FEATURES/HANDOFF/DAILY.
7. **Проверки:** build — OK; storefront boot (playwright-mobile 390px) — console 0 errors. Lint — нет скрипта. Live-спин/сектора/замок — NOT VERIFIED до применения SQL + активного окна.
8. **Ограничения:** mobile scope; desktop не ломать; одна система скидок; результат колеса только server-side; frontend не выбирает reward; display_only никогда не выигрывает; не ослаблять RLS; нет service_role во фронте; не `?forceWheel=`.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** OWNER — выполнить `supabase/wheel-config-status-lock.sql`; затем live-проверка status/замок/динамики секторов на mobile в активном окне.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit+push; deploy (GitHub Actions не ждать и не pollить).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Wheel full admin config (status ACTIVE/DISPLAY ONLY + explicit show_lock) — client built & booting clean; OWNER must run supabase/wheel-config-status-lock.sql, затем live-проверка
Expected modified files:
  - supabase/wheel-config-status-lock.sql (new)
  - src/pages/AdminPage.jsx
  - src/components/WheelOfFortune.jsx
  - src/components/Icons.jsx
  - src/styles/index.css
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DAILY.md
Git status summary: изменения в рабочем дереве, будут закоммичены и запушены этой сессией
Documentation updated: YES
Last verified build: vite build — успешно (0 ошибок)
Last verified tests: storefront boot playwright-mobile 390px — console 0 errors; live-спин/сектора/замок — NOT VERIFIED до применения SQL + окна
Recovery confidence: HIGH
```
