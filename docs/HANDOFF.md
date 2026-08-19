# LaVenta — Handoff

## Current Status

**Wheel of Fortune — финальная админ-конфигурация секторов: реализовано, SQL применён, LIVE-верифицировано (серверный контракт + security + client).** Admin полностью управляет колесом: проценты, веса, статус (ACTIVE / DISPLAY ONLY), видимость и **явный** показ замка.

- **Миграция `supabase/wheel-config-status-lock.sql` — ПРИМЕНЕНА владельцем и активна.** `get_wheel_public_config()` возвращает `sectors:[{percent,active,show_lock}]` (7 секторов: 5/10/15 active, 20/30/40/50 display_only с `show_lock:true`), achievable `rewards=[5,10,15]`.
- **LIVE-проверено (anon, боевой Supabase):** контракт 10/10 (show_lock присутствует, dynamic count=7, display_only исключён из achievable, веса скрыты); security 4/4 (anon не может spin/select/update wheel_config/insert promo).
- **Клиент:** build OK; storefront boot playwright-mobile на 360/390/430 — console 0 errors, все RPC 200, горизонтального overflow нет; `get_wheel_public_config` фетчится на загрузке + 60с-poll (config update без ручного refresh).
- **Валидация (детерминированный тест логики WheelPanel.save):** дубли процентов, percent≤0/>100, отрицательный вес, ACTIVE с невалидным весом, конфиг без ACTIVE — все отклоняются.

**Кода не менял — реализация корректна. Осталось только UI-driven (нужна admin-сессия) и живой spin (окно закрыто).** См. «Known Issues».

## Current Branch

`main`

## Last Completed Task

### Wheel: полная админ-конфигурация секторов (status ACTIVE/DISPLAY ONLY + явный показ замка)

- **Data model:** каждый reward = `{ percent, weight, status, show_lock }`. `status='active'` (участвует, нужен weight>0) или `display_only` (виден, сервер не выбирает). `show_lock` — Admin явно управляет иконкой замка (не из weight).
- **Admin (WheelPanel):** строка сектора = Скидка % / Вес / Статус (select ACTIVE·DISPLAY ONLY) / Замок (toggle, скрыт=disabled для ACTIVE) / удалить. Кнопка «Добавить скидку». Валидация перед сохранением (percent 1..100, вес ≥0, без дублей, ACTIVE→weight>0, ≥1 ACTIVE).
- **Server:** `spin_wheel` суммирует/выбирает только active+weight>0 (display_only исключён всегда, даже при weight>0). `get_wheel_public_config` отдаёт `sectors:[{percent,active,show_lock}]` без весов. Обратная совместимость для старых наград без полей.
- **Storefront (mobile):** сектора строятся полностью из серверного конфига; замок = аккуратная SVG `IconLock` (не emoji); конфиг перечитывается 60с + on visibility (правки Admin без manual refresh, без `location.reload()`).
- **Файлы:** `supabase/wheel-config-status-lock.sql` (new), `src/pages/AdminPage.jsx`, `src/components/WheelOfFortune.jsx`, `src/components/Icons.jsx`, `src/styles/index.css`.

## Last Verified Checks (LIVE, боевой Supabase, SQL применён)

- **Серверный контракт (anon RPC) — 10/10:** `get_wheel_public_config.sectors` = `{percent,active,show_lock}`; 7 секторов; active=5/10/15, display_only=20/30/40/50 (`show_lock:true`); achievable `rewards=[5,10,15]` (display_only исключён тем же предикатом, что и `spin_wheel`); веса скрыты.
- **Security/RLS — 4/4:** anon `spin_wheel`→AUTH_REQUIRED; anon SELECT `wheel_config`→0 строк; anon UPDATE `wheel_config`→0 строк; anon INSERT `promo_codes`→RLS-запрет.
- **Storefront (playwright-mobile 360/390/430):** console **0 errors**; все RPC 200 (`get_wheel_public_config`, `get_wheel_status`, products/categories); горизонтального overflow нет; config фетчится на загрузке + 60с-poll.
- **Валидация (тест логики WheelPanel.save):** дубли percent, percent≤0/>100, отрицательный вес, ACTIVE с невалидным весом, конфиг без ACTIVE — все отклонены.
- **Build:** `npm run build` — успешно (прошлая сессия). Lint — скрипта нет.
- **NOT VERIFIED (нет автоматизации):** UI-driven admin add/delete/status/weight/showLock round-trip (нужна OAuth admin-сессия; claude-in-chrome не подключён); живой `spin_wheel` (все окна закрыты, Баку 21:26). Живой admin-write в `wheel_config` косвенно подтверждён: владелец добавил окно `16:55`, оно видно в live-конфиге.

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

Recovery ID: R-20260820-013127

1. **Проект:** Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), GitHub Pages (`/elva-laventa/`).
2. **Описание:** магазин: каталог, корзина, checkout (`place_order`+Telegram), admin-панель, AZ/RU/EN, промокоды + Wheel of Fortune на едином discount-движке.
3. **Текущее состояние:** полная админ-конфигурация секторов колеса РЕАЛИЗОВАНА, SQL ПРИМЕНЁН, серверный контракт + security + client LIVE-верифицированы. Кода в этой сессии не менял.
4. **Что реализовано:** data model reward = `{percent,weight,status,show_lock}`; Admin WheelPanel (status-select, lock-toggle, валидация, «Добавить скидку»); `spin_wheel` выбирает только active+weight>0 (display_only исключён даже при weight>0); `get_wheel_public_config.sectors` c `show_lock`; витрина строит сектора из конфига, замок = SVG IconLock, live-конфиг (60с+visibility).
5. **Последняя задача:** LIVE-верификация конфигурации колеса (контракт 10/10, security 4/4, валидация, mobile 360/390/430, console/network чисто).
6. **Изменённые файлы (этой сессии):** только docs (HANDOFF/DAILY). Код — без изменений (реализация корректна). Предыдущий feature-коммит `88b99aa`.
7. **Проверки:** get_wheel_public_config — sectors с show_lock, 7 секторов, achievable=[5,10,15]; anon не может spin/select/update/insert (RLS); storefront 360/390/430 — 0 console errors, RPC 200, нет overflow; валидация отклоняет дубли/percent≤0/>100/neg weight/ACTIVE-без-веса/без-ACTIVE. NOT VERIFIED (нет автоматизации): UI-driven admin add/delete/status/showLock round-trip и живой spin (окна закрыты).
8. **Ограничения:** mobile scope; desktop не ломать; одна система скидок; результат колеса только server-side; frontend не выбирает reward; display_only никогда не выигрывает; не ослаблять RLS; нет service_role во фронте; не `?forceWheel=`.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/*`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`, `docs/TODO.md`.
10. **Что осталось:** опц. UI-driven live-проверка владельцем в Admin; решить судьбу тестового окна `16:55`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить docs; commit+push; deploy (GitHub Actions не ждать и не pollить).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Wheel full admin config — SQL applied & LIVE verified (contract 10/10, security 4/4, validation, mobile 360-430). No code changes this session.
Expected modified files:
  - docs/HANDOFF.md, docs/DAILY.md (docs only; code unchanged)
Git status summary: только docs изменены; код без изменений, будет закоммичено этой сессией
Documentation updated: YES
Last verified build: vite build — успешно (0 ошибок) [прошлая сессия]
Last verified tests: LIVE anon contract 10/10 + security 4/4; storefront 360/390/430 console 0 errors, RPC 200, no overflow; validation logic 10/10. UI-driven admin writes + живой spin — NOT VERIFIED (нет автоматизации/окно закрыто).
Recovery confidence: HIGH
```
