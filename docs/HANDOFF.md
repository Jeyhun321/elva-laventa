# LaVenta — Handoff

## Current Status

**LAV-BUG-052 — Mobile: авторизованного покупателя выбрасывает на главную после долгого фона/idle** (тапы по товару «не открывают», навигация «зависает», checkout уходит на home; refresh временно чинит). Root-caused и исправлено в рабочем дереве.

Root cause: `AccountHomeRedirect` в `src/App.jsx` делал `navigate('/', {replace:true})` при любом переходе `previous !== next && next` — включая `null → тот же аккаунт`. На mobile при возврате из фона Supabase (`autoRefreshToken`) обновляет сессию и может кратко отдать `SIGNED_OUT`(user→null)→`SIGNED_IN`(тот же id); этот null-скачок трактовался как «смена аккаунта» → форс-редирект на главную, перетиравший навигацию тапа.

Фикс: редирект только при РЕАЛЬНОЙ смене аккаунта — `previous && nextAccountId && previous !== nextAccountId`. `null → аккаунт` (первый вход и token-refresh скачок) больше не редиректит. Смена аккаунта A→B по-прежнему уводит на главную. Изменён только `src/App.jsx` (одно условие + комментарий).

**Предыдущее (LAV-BUG-050):** серверная миграция `supabase/order-stock-guard.sql` **ждёт запуска владельцем** в Supabase (без неё серверная проверка `in_stock` не активна).

**Про деплой:** один пуш на задачу.

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-052 — mobile: убран ложный редирект на главную при token-refresh после фона

- **Файлы:**
  - `src/App.jsx` — в `AccountHomeRedirect` условие редиректа сужено до реальной смены аккаунта (`previous && nextAccountId && previous !== nextAccountId`); добавлен поясняющий комментарий. `previousAccountId` продолжает трекаться на каждом изменении.
  - `docs/BUGS.md` — запись LAV-BUG-052.
  - `docs/HANDOFF.md` — этот файл.
- **Не менялось:** desktop-поведение (та же логика, тот же смысл «смена аккаунта → домой»); AuthContext/ShopContext/CatalogContext/checkout не тронуты; новых зависимостей нет.

## Last Verified Checks

- `npm run build` — **успешно** (в проекте нет test/lint-скриптов, только `vite build`).
- **Playwright (playwright-mobile MCP, эмуляция Pixel 10 / 360×732):**
  - Guest, production: 12/12 циклов `home→product→back` — товар открывается, 0 редиректов на `/`.
  - Guest, собранный бандл (`vite preview`): 10/10 циклов `home→product→(visibility hidden→visible)→back` — маршрут стабилен, 0 редиректов на `/`, overlay не блокирует тап.
- **NOT VERIFIED (за владельцем):** авторизованный resume-путь на реальном устройстве (реальный OS tab-suspend + Google-сессия Supabase — Playwright это не воспроизводит); запуск `supabase/order-stock-guard.sql` (из LAV-BUG-050).

## Current Architecture Notes

- **`AccountHomeRedirect` (`src/App.jsx`)** — редирект на главную ТОЛЬКО при смене одного реального аккаунта на другой (A→B). Переход `null → аккаунт` (первый вход, восстановление сессии, token refresh после фона) намеренно НЕ редиректит.
- **Auth-модель:** `AuthContext.onAuthStateChange` — единственная точка `setUser`; `user = session?.user ?? null`. Один listener с cleanup (дублей на витрине нет; `adminSupabase`/reset — отдельные клиенты/маршруты).
- **Resume-ревалидация каталога:** `CatalogContext` на `visibilitychange→visible` тихо перечитывает products/categories БЕЗ подъёма `loading` (UI не прыгает). `loading` каталога поднимает только `load()`/`reload()` (последний — только из админки).
- **Inactivity:** `useInactivityRedirect` уводит на главную только при возврате после 30 мин (visibilitychange/pageshow/mount); корзину/сессию не трогает.
- Прочее без изменений: catalog sort 051, purchase-chain stock guards 050 (сервер ждёт миграции), touch-ленты 049, product-gallery 048, header 045/046, поиск 043, валидация размера 044, ScrollManager 036.

## Known Issues

- **PENDING OWNER (из LAV-BUG-050):** миграция `supabase/order-stock-guard.sql` — без неё авторитетная серверная проверка `in_stock` не активна.
- Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.
- **Смежное с LAV-BUG-052 (вне scope):** при том же null-скачке `ShopContext` кратковременно опустошает корзину — теоретически возможен `checkout → /cart`. Основной источник (home-редирект) устранён; при повторении на устройстве проверить и это.

## Risks

- Изменена семантика `AccountHomeRedirect`: теперь `null → аккаунт` НЕ уводит на главную. Это осознанно (устраняет ложный редирект при token-refresh). Реальная смена аккаунта A→B в рамках одной сессии по-прежнему уводит на главную. Логин-flow через `/auth` сам навигирует на `next`, поэтому регрессии входа нет.
- Авторизованный resume-путь проверен логикой + build + guest-регрессией; живой прогон на реальном телефоне — за владельцем.

## Next Recommended Step

1. **Владельцу (реальное устройство):** войти под Google, открыть товар/checkout, надолго свернуть вкладку/заблокировать телефон, вернуться и сразу тапать по товарам / продолжать checkout — убедиться, что товары открываются и на главную не выбрасывает.
2. **Владельцу (из LAV-BUG-050):** запустить `supabase/order-stock-guard.sql`.
3. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-110023

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** завершён mobile-фикс LAV-BUG-052 — убран ложный редирект на главную при token-refresh Supabase после возврата вкладки из фона. `vite build` успешен, guest-регрессия через playwright-mobile зелёная. Код в рабочем дереве. Отдельно ждёт запуска владельцем миграция `supabase/order-stock-guard.sql` (LAV-BUG-050).
4. **Что реализовано (эта задача):** в `src/App.jsx` компонент `AccountHomeRedirect` теперь редиректит на `/` только при реальной смене аккаунта (`previous && nextAccountId && previous !== nextAccountId`); переход `null → аккаунт` (первый вход и token-refresh скачок «выход→вход» при возврате из фона) больше не редиректит; `previousAccountId` продолжает трекаться на каждом изменении.
5. **Последняя задача:** LAV-BUG-052 — на реальном mobile авторизованного покупателя после долгого фона/idle выбрасывало на главную (тапы по товару «не открывали», checkout уходил на home); refresh временно чинил.
6. **Изменённые файлы (эта задача):** `src/App.jsx`, `docs/BUGS.md` (LAV-BUG-052), `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно. Test/lint-скриптов в проекте нет. Guest-сценарии через playwright-mobile (эмуляция Pixel 10) — зелёные. Авторизованный resume-путь на реальном устройстве — NOT VERIFIED (за владельцем; Playwright не воспроизводит OS-suspend и авторизованную Supabase-сессию).
8. **Ограничения:** desktop не переделывать (только регрессии); не удалять функциональность; не менять схему БД без необходимости; модель наличия — boolean `in_stock`; i18n AZ/RU/EN без хардкода турецких строк; один пуш на задачу; не коммитить секреты; не ломать поиск/каталог/корзину/избранное/галерею/свайп/Telegram-заказ/auth; никаких workaround через reload/visibilitychange-reload.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — real-device проверка resume-пути (LAV-BUG-052); запустить `supabase/order-stock-guard.sql` (LAV-BUG-050); из F-007 — `supabase/product-featured.sql`. Опционально: рассмотреть смежный ShopContext null-скачок корзины (вне scope 052).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-052 (mobile: убран ложный редирект на главную при token-refresh после фона) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/App.jsx (AccountHomeRedirect: редирект только при реальной смене аккаунта)
  - docs/BUGS.md (LAV-BUG-052), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-15
Last verified tests: test/lint-скриптов в проекте нет (только build). Guest playwright-mobile регрессия — зелёная. Авторизованный resume на реальном устройстве — NOT VERIFIED (за владельцем)
Recovery confidence: HIGH
```
