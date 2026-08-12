# LaVenta — Handoff

## Current Status

**Фикс мобильного скролла на Product Page (LAV-BUG-048): страница снова скроллится, даже если вертикальный свайп начат прямо с фото/галереи.** Первопричина: разделение «вертикаль=скролл / горизонталь=свайп галереи» держалось ТОЛЬКО на CSS `touch-action: pan-y` у `.gallery-main`, а JS жест не арбитрировал (никогда не звал `preventDefault`). На Chrome/Android `pan-y` вертикаль разрешает (подтверждено на live), но на iOS Safari / webview Instagram/Telegram трактуется слишком строго и блокирует вертикальный скролл над фото → «залипание». Фикс: `.gallery-main { touch-action: manipulation }` (все браузеры читают как «вертикальный скролл разрешён») + арбитраж жеста в JS через native-слушатели (`touchmove` non-passive): вертикаль НИКОГДА не `preventDefault` (скролл свободен), только подтверждённый горизонтальный жест гасится и листает галерею (границы/без wrap сохранены). `vite build` — успешно; поведение проверено на собранном preview синтетическими TouchEvents (см. ниже). Живой touch на реальном iPhone — за владельцем. Готово к commit → push → deploy.

**Предыдущее (LAV-BUG-047):** один тап по карточке товара на мобиле открывает её сразу (`.hscroll{touch-action:pan-x}`, `.product-card{touch-action:manipulation}`, вся карточка кликабельна через stretched-link).

**Ранее в проекте (актуальный контекст):**
- **LAV-BUG-046:** один тёмный badge «Pulsuz / çatdırılma» (2 строки + иконка), логотип в header крупнее.
- **LAV-BUG-045:** мобильный header товара — 2 строки (крупный логотип + actions; Back на строке поиска).
- **LAV-BUG-040..044 + F-008:** header товара, галерея без цикла + chevron-стрелки с disabled, поиск по коду exact-only, sticky-валидация размера, выбор доставки на Checkout (radio-cards, пересчёт, способ в `note` заказа/Telegram).

> ⚠️ **Действие владельца по F-007 остаётся (не связано):** выполнить `supabase/product-featured.sql`.

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026).

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-048 — mobile page scroll блокировался при свайпе с фото галереи

- **Файлы:**
  - `src/pages/ProductPage.jsx` — удалены React `onTouchStart/Move/End` и `touch` ref; добавлен `useEffect` с native touch-слушателями на `.gallery-main` (ref `galleryRef`): `touchstart/end/cancel` — passive, `touchmove` — **non-passive**. Направление жеста фиксируется один раз (порог 10px); вертикаль → без `preventDefault`; подтверждённая горизонталь (при >1 фото) → `preventDefault` + на `touchend` `switchGalleryImage` (порог 40px). Актуальные `gallery.length` и `switchGalleryImage` пробрасываются в слушатель через `galleryLenRef`/`switchRef` (обновляются каждый рендер). `<div className="gallery-main" ref={galleryRef}>`.
  - `src/styles/index.css` — `.gallery-main` (ДВА объявления, строки ~2178 и ~3863) `touch-action: pan-y` → `touch-action: manipulation`.
- **Почему manipulation, а не pan-y:** `manipulation` надёжно поддержан всеми мобильными браузерами (iOS Safari, in-app webview) и означает «pan во всех осях + pinch, без double-tap-zoom» → вертикальный скролл гарантированно разрешён. Горизонталь теперь ловит JS, а не CSS.
- **Границы галереи (LAV-BUG-041) сохранены:** `switchGalleryImage` по-прежнему clamp без wrap; стрелки disabled на границах.

## Last Verified Checks

- `npm run build` — **успешно** (ProductPage 11.52 kB, CSS 99.46 kB).
- **Live preview собранного билда (Chrome, `http://localhost:.../product/20`, 3 фото), синтетические TouchEvents:**
  - computed `touch-action` у `.gallery-main` = `manipulation`;
  - вертикальный жест (вверх) → `defaultPrevented=false` (скролл свободен), индекс фото не меняется;
  - горизонтальный жест влево → `defaultPrevented=true`, фото 0→1;
  - навигация 0→1→2, на границе (последнее) next → остаётся 2 (**без wrap**), prev 2→1;
  - клики стрелок (1→2→1) и `.pd-fab` (избранное) — работают. Всё PASSED.
- **NOT VERIFIED вживую (за владельцем):** реальный нативный touch-скролл на iPhone / встроенном webview (инструмент не эмулирует нативный touch-скролл, только синтетические события + computed-стили).

## Current Architecture Notes

- **Product gallery gesture (LAV-BUG-048):** источник истины для арбитража жеста — JS (native non-passive `touchmove`), а не CSS. `touch-action: manipulation` только гарантирует, что вертикальный скролл нигде не блокируется. Вертикаль → нативный скролл (никогда `preventDefault`); горизонталь → `preventDefault` + `switchGalleryImage`. Слушатели снимаются в cleanup `useEffect`. Desktop не участвует (touch-события не стреляют; hover-tilt через `useTilt` не тронут).
- Прочее без изменений: галерея с ограниченной навигацией (041/042), header товара mobile (045/046), поиск (043), sticky-валидация размера (044), Checkout delivery через `note` (F-008), Product Page mobile (039), HomePage mobile (038), ScrollManager (036), inactivity 30м, язык в Settings.

## Known Issues

Нет новых подтверждённых багов. Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.

## Risks

- LAV-BUG-048 проверен на собранном preview синтетическими TouchEvents + build; живой нативный touch-скролл на реальном iPhone/webview — за владельцем.
- Checkout delivery: серверный total в БД не включает +5₼ экспресса (нет онлайн-оплаты); доплата — в UI-итоге и в note/Telegram.
- `is_featured`-миграция (F-007) — за владельцем.

## Next Recommended Step

1. **Владельцу:** Fix Verification LAV-BUG-048 на реальном телефоне — вертикальный свайп с середины/низа фото прокручивает страницу; горизонтальный свайп листает галерею; стрелки/fav/share/thumbnails/dots — по tap.
2. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260812-133627

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (заказ через серверную RPC `place_order` + Telegram-уведомление), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** исправлен мобильный баг скролла на Product Page (LAV-BUG-048). Код в рабочем дереве, `vite build` успешен, поведение жеста проверено на собранном preview синтетическими TouchEvents. Живой нативный touch на iPhone — за владельцем.
4. **Что реализовано (эта задача):** на Product Page разделение вертикальный-скролл / горизонтальный-свайп-галереи переведено с хрупкого CSS `touch-action: pan-y` на надёжный `touch-action: manipulation` + JS-арбитраж жеста через native non-passive `touchmove`. Вертикаль никогда не `preventDefault` (скролл всегда свободен), горизонталь перехватывается и листает галерею в границах (без wrap). Плюс всё прежнее (галерея 041/042, header 045/046, поиск 043, валидация размера 044, доставка F-008, карточки-тап 047, ScrollManager 036, is_featured graceful, inactivity 30м).
5. **Последняя задача:** LAV-BUG-048 — на мобильном страница не скроллилась, если вертикальный свайп начинался с фото/галереи. Причина: gesture-арбитраж держался только на CSS `pan-y`, который на iOS Safari/webview блокирует вертикальный скролл над элементом; JS жест не арбитрировал. Фикс: `.gallery-main{touch-action:manipulation}` (×2 объявления) + `useEffect` с native-слушателями (`touchmove` non-passive): вертикаль без preventDefault, горизонталь → preventDefault + switchGalleryImage.
6. **Изменённые файлы (эта задача):** `src/pages/ProductPage.jsx` (native touch-слушатели в useEffect, refs `galleryRef`/`galleryLenRef`/`switchRef`, `ref={galleryRef}`, удалены старые onTouch-хендлеры и `touch` ref), `src/styles/index.css` (`.gallery-main` ×2 → `touch-action: manipulation`), `docs/BUGS.md` (LAV-BUG-048), `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно (ProductPage 11.52 kB); live preview собранного билда (`/product/20`, 3 фото), синтетические TouchEvents — вертикаль `defaultPrevented=false`/фото не меняется, горизонталь `defaultPrevented=true`/фото 0→1, границы 0→1→2 без wrap, prev 2→1, стрелки/fav кликабельны — PASSED. Живой touch на iPhone — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop НЕ переделывать (только регрессии); не удалять функциональность; не менять схему БД/RPC `place_order` (DDL — владелец); i18n AZ/RU/EN, без хардкода турецких строк; один пуш на задачу; не коммитить секреты; не ломать галерею/свайп/границы/dots/thumbnails/favorite/share/sticky add-to-cart/валидацию размера.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — Fix Verification LAV-BUG-048 на реальном телефоне; из F-007 — `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-048 (mobile Product Page scroll не работал при свайпе с фото — touch-action manipulation + JS gesture-арбитраж) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/pages/ProductPage.jsx (native touch listeners в useEffect, refs, ref={galleryRef})
  - src/styles/index.css (.gallery-main ×2 → touch-action: manipulation)
  - docs/BUGS.md (LAV-BUG-048), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-12
Last verified tests: нет test/lint-скриптов в проекте; поведение жеста — live preview собранного билда (синтетические TouchEvents) PASSED. Живой нативный touch на iPhone — NOT VERIFIED (за владельцем)
Recovery confidence: HIGH
```
