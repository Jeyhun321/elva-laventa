# LaVenta — Handoff

## Current Status

**Поиск v2 (LAV-BUG-035): живой поиск при вводе + разделение matches/similar + релевантность>priority.** Поверх F-007 (умный поиск + приоритетные товары). Код в рабочем дереве, `vite build` — успешно; движок покрыт unit-тестом, поведение проверено вживую end-to-end на реальных данных Supabase. Готово к commit → push → deploy.

**Что нового (LAV-BUG-035):** debounce-поиск в Header (~300ms, обновляет URL `?q=`, клиентский — без Supabase-запросов на символ, race-safe trailing-таймер + guard по фокусу); мин. длина 2 (`SEARCH_MIN`); при наличии совпадений — только они; при отсутствии — блок «похожие» с i18n-заголовком `no_exact_matches` (AZ/RU/EN); сортировка `score → featured → rating` (priority лишь тай-брейкер, нерелевантный featured не всплывает); кнопка ✕ сбрасывает поиск; `ScrollManager` не скроллит на REPLACE (нет прыжка при вводе); фокус инпута сохраняется.

> ⚠️ **Действие владельца по F-007 остаётся:** выполнить `supabase/product-featured.sql` (колонка `is_featured`) — до этого приоритет не действует, но всё работает (read→false, graceful degrade в saveProduct).

> ⚠️ **ТРЕБУЕТСЯ ДЕЙСТВИЕ ВЛАДЕЛЬЦА (БД-миграция):** выполнить `supabase/product-featured.sql` в Supabase → SQL Editor (добавляет колонку `products.is_featured boolean not null default false`). До запуска миграции приоритет просто не сохраняется/не действует — приложение **не ломается** (код читает отсутствующую колонку как `false`, а сохранение товара в админке сделано с graceful-degrade: при ошибке «нет колонки» повторяет запись без `is_featured`). После миграции флаг «⭐ Приоритетный товар» начинает работать.

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026, `cancel-in-progress`).

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-035 — Поиск v2: живой ввод + matches/similar + релевантность>priority

- **Live search:** `Header.jsx` — debounce ~300ms → URL `?q=`; клиентский поиск (товары в памяти CatalogContext, Supabase не дёргается на символ); race-safe (trailing-таймер = latest-wins) + sync URL→input под guard'ом фокуса; `SEARCH_MIN=2`; лупа/Enter — необязательный submit; ✕ — сброс.
- **matches vs similar:** `CatalogPage.jsx` — при совпадениях показываем только их; иначе `similarProducts` + i18n-заголовок `no_exact_matches`.
- **Релевантность>priority:** сортировка `score → featured → rating`; тировка score (имя точн.>префикс>частично>код>категория/тег/бренд) в `src/lib/search.js`.
- **UX:** `App.jsx` `ScrollManager` — вверх только на PUSH, на REPLACE позиция сохраняется (нет прыжка при вводе); Header persist → фокус/клавиатура сохраняются.
- **Верификация:** unit (node) + live end-to-end на реальных данных — см. Last Verified Checks.

### F-007 — Умный поиск + приоритетные товары (база)

1. **Умный поиск (`src/lib/search.js`, новый):**
   - Нормализация: lowercase + фолдинг AZ-букв (ə→e, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u) + снятие диакритик; кириллица сохраняется. `tokenize` — по `\p{L}\p{N}` (unicode), чтобы RU-запросы не терялись.
   - Матчинг на токен: точное слово → префикс → подстрока → опечатка (Левенштейн ≤1, для длинных ≥7 ≤2; только в «мысловых» полях name/category/brand).
   - Веса полей: code 100 (+300 за полное совпадение кода), name 42, category 24, brand 18, tag 14, description 6.
   - `searchScores(products, query, getCategoryText)` → `Map<id, score>` (score>0) + `active`.
2. **Интеграция (`CatalogPage.jsx`):** при непустом `q` поиск **глобальный** (категория-фильтр не применяется), список = товары со score>0; сортировка: **featured первыми**, затем score, затем rating. Без `q` — прежняя сортировка (sort-dropdown/URL). Категория-текст для матчинга берётся из `categories` (все языки label). Пустой результат → существующий empty-state.
3. **Приоритет (`is_featured`):** флаг в админке (`AdminPage.jsx` — чекбокс «⭐ Приоритетный товар», + в `emptyProduct`); read/write в `admin/db.js` (`fromRow`/`toRow`) и read в `context/CatalogContext.jsx` (`isFeatured: r.is_featured === true`); `saveProduct` — graceful degrade при отсутствии колонки. Миграция — `supabase/product-featured.sql`.

## Last Verified Checks

- `npm run build` — **успешно** (129 модулей).
- **Unit-тест движка (node, `src/lib/search.js`):** min-len (1 симв → active=false); тировка (точное имя 1000+, префикс, частично, код 500, категория); **featured тай-брейкер** (при равном score featured выше, но менее релевантный featured НЕ выше более релевантного — релевантность>priority); `similarProducts` (мягкий fuzzy + топ-рейтинг fallback). Все PASSED.
- **Live end-to-end (dev, реальные данные Supabase):** «Max»→10 релевантных (Maxi в топе, не весь каталог 14); «2002»→1 (код); «cicekli»→2; «qwxzk»(нет совпад.)→12 similar + заголовок «Dəqiq nəticə tapılmadı…»; «M»(1 симв)→не ищет; ✕→14 (полный каталог); быстрый ввод M→Ma→Max→результат для «Max» (latest-wins); фокус инпута сохранён; scroll 398→398 при доп. вводе (REPLACE не скроллит).
- **NOT VERIFIED вживую:** featured-буст на реальной проде (нужна колонка `is_featured` — миграция за владельцем); мобильный узкий viewport/тач (инструмент рендерит desktop) — за владельцем.

## Current Architecture Notes

- Поиск: `src/lib/search.js` (чистые функции, без React) → используется в `CatalogPage.visible`. Ранжирование featured-first только при активном `q`.
- `is_featured`: колонка `products` (миграция `supabase/product-featured.sql`); читается `select *` (storefront + admin), пишется из админки (RLS без изменений). Код устойчив к отсутствию колонки (read→false, write→graceful degrade).
- Категория/навигация (прошлые задачи): категория из URL (`?cat=`), секции «Hamısına bax» → `?sort=rating|new` / `?sale=1`; `ScrollManager` (scrollRestoration manual); круги — hover за `@media(hover:hover)`.
- Inactivity 30 мин; нижняя навигация 5 пунктов; язык на `/settings` + desktop inline.

## Known Issues

Нет новых подтверждённых багов. Ограничение: приоритет не действует до применения `supabase/product-featured.sql` (by design, безопасно).

## Risks

- Пока владелец не запустил `product-featured.sql`, флаг приоритета в админке сохранится «вхолостую» (graceful degrade сбрасывает `is_featured` при записи) — после миграции нужно повторно проставить приоритет у нужных товаров.
- Поиск теперь глобальный при `q` (игнорирует категорию) — это намеренно; если владелец ждал «поиск внутри категории», обсудить.
- Фолдинг AZ-букв объединяет некоторые символы — крайне редкие ложные совпадения возможны, но повышают полноту (recall) — стандартный компромисс.

## Next Recommended Step

1. **Владельцу:** выполнить `supabase/product-featured.sql` в Supabase SQL Editor; затем в админке отметить приоритетные товары и проверить, что они выше в поиске.
2. Fix Verification поиска на телефоне (частичное/опечатка/код/RU/AZ), пустой результат.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260807-155728

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout через WhatsApp, admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** реализован умный поиск + приоритетные товары (F-007); код в рабочем дереве, `vite build` успешен, unit + live проверки пройдены. Требуется ручная БД-миграция владельцем (`supabase/product-featured.sql`) — без неё приложение не ломается (read→false, write graceful degrade).
4. **Что реализовано:** движок поиска `src/lib/search.js` (нормализация с AZ-фолдингом + кириллица; частичное/префикс/подстрока/опечатка; веса полей; `searchScores`); интеграция в `CatalogPage` (глобальный поиск при q, сортировка featured→score→rating); флаг `is_featured` (админ-чекбокс, read/write в admin/db + read в CatalogContext, graceful degrade в saveProduct); миграция `supabase/product-featured.sql`. Плюс прежнее: категория из URL, «Hamısına bax» sort-routes, ScrollManager, hover-фикс кругов, inactivity 30м, 5 табов, язык в Settings.
5. **Последняя задача:** LAV-BUG-035 — поиск v2: живой ввод (debounce), matches/similar, релевантность>priority, min-len 2, ✕-сброс, no-scroll-jump. Поверх F-007.
6. **Изменённые файлы:** `src/lib/search.js` (тировка + `similarProducts` + `SEARCH_MIN`), `src/components/Header.jsx` (debounce/X/URL-sync), `src/pages/CatalogPage.jsx` (matches/similar), `src/i18n/translations.js` (`no_exact_matches`), `src/App.jsx` (ScrollManager REPLACE без скролла), `src/styles/index.css` (`.search-clear`, `.search-similar-note`), `docs/BUGS.md`, `docs/HANDOFF.md`. (F-007 ранее: CatalogContext/admin/db/AdminPage/supabase/product-featured.sql.)
7. **Проверки:** `vite build` — успешно; unit-тест движка (node) — PASSED; live end-to-end на реальных данных — PASSED. Featured-буст на проде и админ-тоггл визуально — за владельцем (нужна миграция/вход в /admin).
8. **Ограничения:** не менять бизнес-логику корзины/избранного/авторизации/checkout/структуры БД сверх добавленной колонки; service_role в клиент НЕ добавлять (DDL — только через SQL Editor владельцем); не трогать header/логотип/Account/Favorites/Cart/Language location/inactivity/desktop UI без нужды; i18n AZ/RU/EN; один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `START.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — применить `supabase/product-featured.sql`, проставить приоритет, проверить поиск на устройстве. Опционально — выделенное поле «keywords» в БД (сейчас ключевые слова покрыты тегом + всеми текстовыми полями).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — подтверждение миграции/Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/FEATURES.md`/`BUGS.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-035 поиск v2 (живой ввод + matches/similar + релевантность>priority) поверх F-007 (завершено в рабочем дереве; commit/push/deploy — следующий шаг; БД-миграция is_featured за владельцем)
Expected modified files:
  - src/lib/search.js (тировка + similarProducts + SEARCH_MIN)
  - src/components/Header.jsx (debounce/X/sync)
  - src/pages/CatalogPage.jsx (matches/similar)
  - src/i18n/translations.js (no_exact_matches)
  - src/App.jsx (ScrollManager: REPLACE без скролла)
  - src/styles/index.css (.search-clear, .search-similar-note)
  - docs/BUGS.md, docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи; прод-деплой run #142 = 5f5365f (success, 2026-08-07)
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-07
Last verified tests: нет test-скриптов проекта; движок поиска — unit-тест (node) PASSED; live end-to-end (реальные данные) PASSED; featured-буст на проде — NOT VERIFIED (нужна миграция is_featured)
Recovery confidence: MEDIUM
```
