# LaVenta — Handoff

## Current Status

**LAV-BUG-051 — Catalog (mobile): 2 фикса.** (1) Сортировка реально не меняла порядок в режиме поиска и `popular` был no-op; (2) сообщение «Dəqiq nəticə tapılmadı. Oxşar məhsullar» слишком мелкое на mobile.

Root cause сортировки: в `CatalogPage` `result`-useMemo выбранный `sort` применялся **только** в ветке обычного каталога; в режиме поиска и fallback «похожие товары» список шёл только по релевантности, а `sort` игнорировался. Плюс `case 'popular'` отсутствовал (`default: break`). На mobile контрол сортировки доступен только внутри filter-sheet → его чаще меняют при активном поиске, где sort игнорировался.

Фикс: единая `sortList(list, popularCmp)` (сортирует копию, не мутирует state) применяется во всех режимах (каталог / результаты поиска / похожие). `popular` реализован контекстно (каталог: featured+rating+id; поиск: релевантность; похожие: порядок similarProducts). Дефолт сортировки `price_asc → popular` (сохраняет релевантность-по-умолчанию в поиске, делает «Populyar» реальным дефолтом). Сообщение увеличено только на mobile через `@media (max-width:900px)` (desktop не тронут).

**Предыдущее (LAV-BUG-050):** stock/availability hardening по всей purchase-chain — фронт защищён, серверная миграция `supabase/order-stock-guard.sql` **ждёт запуска владельцем** в Supabase (без неё серверная проверка `in_stock` не активна).

**Про деплой:** один пуш на задачу.

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-051 — mobile catalog: sorting fix + enlarged "similar products" message

- **Файлы:**
  - `src/pages/CatalogPage.jsx` — единая `sortList` во всех ветках `result`; реализован `popular`; дефолт сортировки и reset → `popular`.
  - `src/styles/index.css` — mobile-override `.search-similar-note` (`@media (max-width: 900px)`: больше padding/font-size/weight, сохранён фон/цвет/radius). Базовое desktop-правило не изменено.
- **Не менялось:** desktop-логика/вид сортировки сохранена (те же case), exact code search / partial name / categories / filters / cart / favorites / i18n AZ/RU/EN — без изменений.

## Last Verified Checks

- `npm run build` — **успешно** (в проекте нет test/lint-скриптов, только `vite build`).
- **NOT VERIFIED (за владельцем):** живой прогон mobile-сценариев на устройстве; запуск `supabase/order-stock-guard.sql` (из LAV-BUG-050).

## Current Architecture Notes

- **Сортировка каталога** — единая функция `sortList` в `CatalogPage.result`, применяется после search/filter во всех режимах: `products → search/filter → sort → render`. Массив копируется (`[...list]`), state/context не мутируется.
- **`popular`** = контекстная популярность: каталог → `isFeatured` desc, затем `rating` desc, затем `id`; поиск → релевантность (`scores`) + featured/rating; похожие → порядок `similarProducts`. Отдельного поля популярности в модели нет; `created_at` во фронт-модель не мапится (`new` = `b.id - a.id`, id последователен).
- **Дефолт сортировки** — `popular` (был `price_asc`): initial state, URL-fallback и reset.
- Прочее без изменений: purchase-chain stock guards 050 (сервер ждёт миграции), touch-модель лент 049, product-gallery 048, header 045/046, поиск 043 (exact code), валидация размера 044, Checkout delivery F-008, ScrollManager 036, inactivity 30м.

## Known Issues

- **PENDING OWNER (из LAV-BUG-050):** миграция `supabase/order-stock-guard.sql` — без неё авторитетная серверная проверка `in_stock` не активна.
- Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.

## Risks

- Дефолт сортировки каталога изменён с `price_asc` на `popular` — начальный порядок и на desktop, и на mobile теперь featured+rating (сознательно, часть корректной реализации «Populyar»; layout/дизайн desktop не тронут).
- Mobile-сценарии проверены логикой + build; живой прогон на устройстве — за владельцем.

## Next Recommended Step

1. **Владельцу:** прогнать mobile TEST SCENARIOS 1–11 (сортировки, поиск+сортировка, partial code → похожие, category/price + sort, вид сообщения на 320–430px).
2. **Владельцу (из LAV-BUG-050):** запустить `supabase/order-stock-guard.sql`.
3. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260814-015859

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** завершён mobile-фикс каталога (LAV-BUG-051): сортировка теперь реально применяется во всех режимах (каталог/поиск/похожие), `popular` реализован, сообщение «похожие товары» увеличено на mobile. `vite build` успешен. Код в рабочем дереве. Отдельно ждёт запуска владельцем серверная миграция `supabase/order-stock-guard.sql` (из LAV-BUG-050).
4. **Что реализовано (эта задача):** в `CatalogPage` вынесена единая `sortList(list, popularCmp)`, применяется во ВСЕХ ветках `result`-useMemo; `popular` реализован контекстно (каталог featured+rating+id, поиск relevance, похожие — порядок similarProducts); дефолт сортировки и reset переведены `price_asc → popular`; массив сортируется копией (без мутации state). CSS: mobile-override `.search-similar-note` в `@media (max-width:900px)` (больше padding/font/weight, фон/цвет/radius сохранены), desktop не тронут.
5. **Последняя задача:** LAV-BUG-051 — на mobile выбор сортировки не менял порядок (sort применялся только в ветке обычного каталога; в поиске/похожих игнорировался; `popular` был no-op) + мелкое сообщение о похожих товарах.
6. **Изменённые файлы (эта задача):** `src/pages/CatalogPage.jsx`, `src/styles/index.css`, `docs/BUGS.md` (LAV-BUG-051), `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно. Test/lint-скриптов в проекте нет. Живой прогон на устройстве — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop не переделывать (только регрессии); не удалять функциональность; не менять схему БД без необходимости; модель наличия — boolean `in_stock`; i18n AZ/RU/EN без хардкода турецких строк; один пуш на задачу; не коммитить секреты; не ломать exact code search / partial name / categories / filters / cart / favorites / галерею / свайп / ленты / Telegram-заказ / auth.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — прогнать mobile-сценарии сортировки/поиска; запустить `supabase/order-stock-guard.sql` (LAV-BUG-050); из F-007 — `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-051 (mobile catalog: sorting applies in all modes + enlarged "similar products" message) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/pages/CatalogPage.jsx (единая sortList во всех ветках + дефолт popular)
  - src/styles/index.css (mobile-override .search-similar-note)
  - docs/BUGS.md (LAV-BUG-051), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-14
Last verified tests: test/lint-скриптов в проекте нет (только build). Живой прогон на устройстве — NOT VERIFIED (за владельцем)
Recovery confidence: HIGH
```
