# LaVenta — Handoff

## Current Status

**Phase 1 (пакет из 3 задач) завершён в рабочем дереве.** Mobile UI scope; desktop не переделывался.

1. **Realtime Admin → Storefront (F-009 / D-006):** открытый пользовательский сайт получает изменения admin-панели без ручного refresh и без full-page reload. Supabase Realtime (`postgres_changes` на `products`/`categories`) → тихая ревалидация каталога → React rerender. Ordering-guard `dataSeq` исключает stale-перезапись.
2. **Реальные цвета товара (LAV-BUG-053):** Product Page больше не показывает декоративную палитру `colors` как несколько «выбираемых» цветов. Реальные `variants` (>1) — как раньше; одноцветный товар → ровно 1 настоящий swatch.
3. **Структура fallback поиска (mobile):** «Dəqiq nəticə tapılmadı.» (компактный alert) + отдельный заголовок «Oxşar məhsullar» + product grid.

**Требует владельца:** запустить `supabase/realtime-catalog.sql` (добавляет `products`/`categories` в `supabase_realtime` publication — без этого Realtime-подписка успешна, но событий нет). Плюс из прошлых задач: `supabase/order-stock-guard.sql` (LAV-BUG-050).

## Current Branch

`main`

## Last Completed Task

### Phase 1 — live-sync + честные цвета + структура fallback поиска

- **Файлы:**
  - `src/context/CatalogContext.jsx` — Supabase Realtime канал (`catalog-sync`) на `products`/`categories` c debounce 300ms и cleanup; общий `revalidate` (тихий, без `loading`); ordering-guard `dataSeq` в `load`+`revalidate`; `applyData` — единая точка записи state.
  - `src/pages/ProductPage.jsx` — `singleColor = product.colorHex || product.colors?.[0]`; ветка декоративной палитры заменена на один реальный swatch.
  - `src/pages/CatalogPage.jsx` — fallback разбит: `p.search-similar-note` (short alert) + `h2.search-similar-title` (`related`) + grid.
  - `src/i18n/translations.js` — новый ключ `no_exact_matches_short` (AZ/RU/EN).
  - `src/styles/index.css` — `.search-similar-note` компактный inline-block; новый `.search-similar-title`; mobile-media обновлён.
  - `supabase/realtime-catalog.sql` — идемпотентное включение publication (запускает владелец).
- **Не менялось:** desktop-логика; auth/cart/favorites/checkout/поиск-алгоритм/exact-code/категории/сортировка/i18n; поле `colors` сохранено (используется `ProductImage` как gradient fallback).

## Last Verified Checks

- `npm run build` — **успешно**.
- **Playwright (playwright-mobile MCP, эмуляция Pixel 10 / 360×732, собранный бандл через `vite preview`):**
  - Task 1: товар 2001 (один цвет) → **1** swatch (`#f7b7d2`), 0 variant-dots; товар 2006 (реальные варианты) → **2** variant-dots. Регрессии цвет-вариантов нет.
  - Task 2: поиск `q=200` → DOM-порядок `p.search-similar-note` («Dəqiq nəticə tapılmadı.») → `h2.search-similar-title` («Oxşar məhsullar») → `product-grid` (12 карточек); alert — компактный inline-block; горизонтального оверфлоу нет на 360px. Скриншот подтверждает.
  - Console — 0 ошибок от изменений; REST `products`/`categories` — 200.
- **NOT VERIFIED (ограничения / за владельцем):**
  - Realtime end-to-end (admin-мутация → storefront live update) — не прогонялся: требует включённой publication + admin-доступа к боевым данным (правка production-данных вне безопасного scope). WebSocket-handshake сетевой инструмент Playwright не логирует; хук на `WebSocket` вставал позже маунта. Код подписки — стандартный supabase channel API, console чистый.
  - `supabase/realtime-catalog.sql` и `supabase/order-stock-guard.sql` — запуск за владельцем.
  - Desktop-вид (логически не менялся) — визуально за владельцем.

## Current Architecture Notes

- **Каталог live-data:** `CatalogContext` — единая точка записи `applyData(prods,cats,seq)`; `dataSeq` (монотонный) гарантирует «последний запрос побеждает» для трёх путей: initial `load` (с `loading`), `revalidate` (тихий: visibility-возврат + realtime), realtime-канал. Товары не кэшируются в localStorage (state в памяти + локальный файл-fallback) → stale-cache гонки нет.
- **Realtime:** один канал `catalog-sync`, `postgres_changes` `*` на `public.products` и `public.categories`, debounce 300ms, `supabase.removeChannel` в cleanup; провайдер смонтирован один раз (root) → дублей листенеров нет; auth-refresh провайдер не ремонтирует; supabase-realtime сам reconnect-ит.
- **Цвета товара:** реальные варианты = строки с общим `code` + `color_name` (`groupVariants` → `variants`); декоративная палитра `colors` — только для gradient-плейсхолдера `ProductImage`. Product Page: `variants>1` → селектор вариантов; иначе 1 swatch (`colorHex||colors[0]`).
- Прочее без изменений: LAV-BUG-052 (auth-resume редирект), catalog sort 051, stock guards 050 (сервер ждёт миграции), touch-ленты 049, gallery 048, ScrollManager 036.

## Known Issues

- **PENDING OWNER:** `supabase/realtime-catalog.sql` (иначе Realtime без событий); `supabase/order-stock-guard.sql` (LAV-BUG-050); `supabase/product-featured.sql` (F-007).
- Смежное (вне scope): при auth null-скачке `ShopContext` кратко опустошает корзину (см. LAV-BUG-052 Notes).

## Risks

- Структура fallback поиска изменилась в DOM и на desktop (два элемента вместо одного) — это структурная корректность, не редизайн; desktop-стиль `.search-similar-title` умеренный.
- Realtime добавляет постоянный WebSocket к Supabase на всех клиентских вкладках — нагрузка минимальна (один канал, debounce). Без publication деградирует до прежней visibility-ревалидации.

## Next Recommended Step

1. **Владельцу:** запустить `supabase/realtime-catalog.sql` (SQL Editor), затем проверить e2e: открыть сайт на телефоне, изменить тестовый товар в admin (цена/наличие/цвет), убедиться, что storefront обновился без refresh; вернуть тестовые данные.
2. **Владельцу:** `supabase/order-stock-guard.sql` (LAV-BUG-050), `supabase/product-featured.sql` (F-007).

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260815-133520

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** Phase 1 завершён в рабочем дереве и (после этого шага) закоммичен/запушен. `vite build` успешен, playwright-mobile проверка Task 1/Task 2 зелёная. Ждёт запуска владельцем `supabase/realtime-catalog.sql` (для Realtime) и `supabase/order-stock-guard.sql` (LAV-BUG-050).
4. **Что реализовано (Phase 1):** (1) Supabase Realtime синхронизация каталога Admin→Storefront без reload (CatalogContext: канал `catalog-sync` на products/categories, debounce, cleanup, ordering-guard `dataSeq`, общий тихий `revalidate`, единый `applyData`); (2) реальные цвета на Product Page (`singleColor=colorHex||colors[0]`, декоративная палитра больше не рендерится как несколько цветов); (3) структура fallback поиска (alert `no_exact_matches_short` + заголовок `related` + grid) с CSS.
5. **Последняя задача:** Phase 1 (3 задачи выше).
6. **Изменённые файлы:** `src/context/CatalogContext.jsx`, `src/pages/ProductPage.jsx`, `src/pages/CatalogPage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`, `supabase/realtime-catalog.sql` (new); docs: `HANDOFF.md`, `FEATURES.md` (F-009), `DECISIONS.md` (D-006), `BUGS.md` (LAV-BUG-053).
7. **Проверки:** `vite build` — успешно; playwright-mobile: Task1 (1 цвет→1 swatch, варианты→2 dots), Task2 (alert+заголовок+grid, без оверфлоу на 360px), console без ошибок. Realtime e2e — NOT VERIFIED (нужна publication + admin-мутация боевых данных; вне безопасного scope).
8. **Ограничения:** desktop не переделывать; не удалять функциональность; не менять схему БД без необходимости; наличие — boolean `in_stock`; i18n AZ/RU/EN без хардкода; один пуш на задачу; не коммитить секреты; НЕ решать sync через reload/периодический refresh; не создавать второй механизм данных; не ломать поиск/exact-code/категории/сортировку/корзину/избранное/галерею/checkout/auth.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/DECISIONS.md`.
10. **Что осталось:** владельцу — `supabase/realtime-catalog.sql` + e2e-проверка realtime на устройстве; `supabase/order-stock-guard.sql`; `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `FEATURES/DECISIONS/BUGS`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: Phase 1 (realtime admin→storefront sync + real product colors + mobile search fallback structure) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/context/CatalogContext.jsx (Realtime + ordering-guard + revalidate)
  - src/pages/ProductPage.jsx (singleColor)
  - src/pages/CatalogPage.jsx, src/i18n/translations.js, src/styles/index.css (fallback structure)
  - supabase/realtime-catalog.sql (new)
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DECISIONS.md, docs/BUGS.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-15
Last verified tests: test/lint-скриптов нет (только build). playwright-mobile: Task1/Task2 зелёные. Realtime e2e — NOT VERIFIED (нужна publication + admin-мутация; вне scope)
Recovery confidence: HIGH
```
