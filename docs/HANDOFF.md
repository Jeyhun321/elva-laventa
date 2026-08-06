# LaVenta — Handoff

## Current Status

Переработан мобильный header (убрана верхняя кнопка «Kataloq», поиск на всю ширину, в 1-й строке 4 единые круглые иконки Account/Favorites/Cart/Language, крупнее Account), на странице каталога убран дублирующий заголовок «Hamısı» и добавлена back-кнопка `←`, добавлен inactivity-timeout (возврат на главную после ≥30 мин отсутствия без потери корзины/сессии). Desktop без регрессий. Изменения закоммичены и запушены в `main`; деплой на GitHub Pages запущен автоматически (push-триггер). SHA — см. `SESSION CHECKSUM`.

## Current Branch

`main`

## Last Completed Task

### Mobile header + catalog back + inactivity timeout (LAV-BUG-023/024/025)

- **Mobile header (LAV-BUG-023, только CSS):** `.cat-wrap` («Kataloq») скрыт на мобиле → поиск `flex:1 1 100%` занимает всю ширину 2-й строки. В 1-й строке справа 4 элемента через `order`: Account → Favorites → Cart → Language. Account/Favorites/Cart приведены к единым круглым outline-кнопкам 44px (svg 22px), Account-аватар 30px; счётчики в углу круга. `≤360px` — доп. компактность (логотип/иконки/язык), помещается на 320px без гориз. скролла. Desktop не тронут (Kataloq + dropdown сохранены). Placeholder поиска статичен (marquee убран ранее, LAV-BUG-022).
- **Catalog back + heading (LAV-BUG-024):** добавлена `back-btn` `←` (`navigate(-1)`, fallback `/` при прямом входе; без циклов). Заголовок `.page-title` оставлен для desktop, но скрыт на мобиле (дублировал активный чип). Чипы/фильтры не тронуты. i18n: `back`.
- **Inactivity timeout (LAV-BUG-025):** новый хук `useInactivityRedirect` в `App`. `lv_last_activity` в localStorage (throttle 30с), обновляется на смене маршрута и по pointer/key/touch/click/scroll. Проверка на mount (значение захватывается на render до перезаписи), `visibilitychange` (visible), `pageshow` (bfcache): если прошло ≥30 мин и путь ≠ `/` → `navigate('/', {replace})` без reload. Корзина/избранное/авторизация/язык/Supabase-сессия НЕ очищаются. Защита от циклов (`redirectingRef` + проверка пути + обновление метки перед навигацией).

## Last Verified Checks

- `npm run build` — успешно (`✓ built in 2.68s`).
- **Inactivity live QA** (vite preview): A (10 мин) → остаётся; C (≥30 мин, pageshow и полная перезагрузка `/catalog`→`/`) → главная; D (свежая метка) → остаётся; первый визит без метки → редиректа нет; boot-редирект работает. `visibilitychange` при видимой вкладке в автоматизации не проверить (авто-вкладка `visibilityState=hidden`), но код требует `visible` и подтверждён через `pageshow`.
- **Desktop live QA:** `.cat-wrap` display:block (Kataloq виден), favorites/cart display:flex, `.back-btn` display:none, `.page-title` display:block, нет гориз. скролла (innerWidth 1536) — регрессий нет.
- **Mobile live рендер узкого viewport:** снять не удалось (browser-extension не эмулирует мобильную ширину); мобильные CSS-правила проверены по DOM/структуре и сборке. **Живая проверка на телефоне (320/360/375/390, Safari/Chrome) — за владельцем (NOT VERIFIED live).**

## Current Architecture Notes

- Elva LaVenta — React/Vite storefront, Supabase (Frankfurt), деплой GitHub Pages (`.github/workflows/deploy.yml`, триггер `push:[main]` + `workflow_dispatch`).
- Header: desktop — логотип + Kataloq(dropdown) + поиск + actions; mobile — строка1 [логотип][Account][Favorites][Cart][Language], строка2 [поиск][кнопка]. Bottom nav (`TabBar`) — 5 пунктов, mobile.
- Inactivity: `src/hooks/useInactivityRedirect.js` (30 мин), подключён в `App`. Каталог: `back-btn` + `goBack` (navigate(-1)/fallback `/`).
- Конфиги: `src/data/homeNav.js` (`quickCategories`), `src/data/promos.js`. Хуки: `useMediaQuery`, `useInactivityRedirect`.

## Known Issues

Нет новых подтверждённых багов. LAV-BUG-018…025 — FIXED (Fix Verification на телефоне за владельцем).

## Risks

- Живой мобильный рендер/inactivity на реальных устройствах NOT VERIFIED (проверено build + preview + DOM). Риск низкий.
- Favorites/Cart теперь и в header, и в нижней навигации (намеренно, по ТЗ). UI-заглушки без backend: Settings (кроме языка), Parfüm-категория.

## Next Recommended Step

Владельцу — Fix Verification LAV-BUG-023/024/025 на телефоне (320/360/375/390, Safari/Chrome: блокировка на 31 мин → главная; корзина/язык/вход сохранены) и desktop по чек-листам в `docs/BUGS.md`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260806-150636

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин с каталогом, избранным, корзиной, checkout через WhatsApp, admin-панелью, тремя языками AZ/RU/EN.
3. **Текущее состояние:** мобильный header переработан, добавлены back-кнопка каталога и inactivity-timeout; изменения закоммичены и запушены в `main`, деплой запущен push-триггером. После коммита дерево чистое.
4. **Что реализовано:** компактная mobile-first главная; mobile header с 4 быстрыми действиями и полноширинным поиском; каталог с back-кнопкой и без дублирующего заголовка; авто-возврат на главную после ≥30 мин отсутствия (без потери корзины/сессии); Settings-страница (UI + язык), нижняя навигация 5 пунктов.
5. **Последняя задача:** LAV-BUG-023 (mobile header: убран «Kataloq», поиск на всю ширину, 4 круглые иконки Account/Favorites/Cart/Language, крупнее Account), LAV-BUG-024 (catalog back-кнопка + скрыт дублирующий заголовок на мобиле), LAV-BUG-025 (inactivity 30 мин → главная).
6. **Изменённые файлы:** новый `src/hooks/useInactivityRedirect.js`; изменены `src/App.jsx`, `src/components/Header.jsx` (ранее marquee удалён), `src/components/Icons.jsx` (IconArrowLeft), `src/pages/CatalogPage.jsx`, `src/i18n/translations.js`, `src/styles/index.css`, `docs/BUGS.md`, `docs/HANDOFF.md`.
7. **Проверки:** `npm run build` — успешно. Inactivity сценарии A/C/D + boot + «первый визит» — проверены в preview. Desktop — без регрессий. Mobile live рендер — NOT VERIFIED (инструмент не эмулирует узкий viewport).
8. **Ограничения:** не менять бизнес-логику поиска/фильтров/карточек/корзины/избранного/авторизации/checkout/БД/нижней навигации/Settings; сохранять палитру/логотип/типографику; не хардкодить тексты — i18n/конфиги с AZ/RU/EN; при inactivity НЕ очищать корзину/избранное/сессию/язык; не редиректить во время активного submit; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `START.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`.
10. **Что осталось:** Fix Verification LAV-BUG-023/024/025 (владелец, реальные устройства); подключение backend к UI-заглушкам (Settings, будущие категории).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`, затем взять задачу владельца.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости остальные `docs/`, commit + push в `main`.

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-023/024/025 — mobile header + catalog back + inactivity timeout (завершено, закоммичено, запушено)
Expected modified files:
  - src/hooks/useInactivityRedirect.js (new)
  - src/App.jsx
  - src/components/Icons.jsx
  - src/pages/CatalogPage.jsx
  - src/i18n/translations.js
  - src/styles/index.css
  - docs/BUGS.md
  - docs/HANDOFF.md
Git status summary: committed & pushed to main; SHA — см. git log -1
Documentation updated: YES
Last verified build: npm run build — успешно, 2026-08-06
Last verified tests: нет test-скриптов; inactivity + desktop live QA — PASSED; mobile live рендер — NOT VERIFIED
Recovery confidence: MEDIUM
```
