# LaVenta — Handoff

## Current Status

**Фикс мобильного вертикального скролла на HomePage (LAV-BUG-049): страница снова скроллится, даже если вертикальный свайп начат с карточки/фото/названия/цены товара или с кружка категории.** Первопричина — прямое следствие прошлых правок: у горизонтальных лент `.hscroll` (Popular/Yeni/Endirimlər) и `.cats-row` (категории) стояло `touch-action: pan-x` (введено в LAV-BUG-032/047 ради мгновенного tap). Комментарии в коде ошибочно утверждали, что `pan-x` «пропускает вертикальный скролл» — на самом деле `pan-x` разрешает браузеру ТОЛЬКО горизонтальный пан и **блокирует вертикальный page-scroll**. Т.к. `.product-card` (`manipulation`) — потомок `.hscroll`, эффективный touch-action = пересечение с предком = `pan-x` → вертикаль мертва над всей лентой. Фикс: `.hscroll` и `.cats-row` → `touch-action: pan-x pan-y` (горизонтальный пан ленты + вертикальный скролл страницы + tap без zoom-задержки). JS не трогался. `vite build` — успешно; значения проверены на собранном preview чтением реальных CSSRule. Живой нативный touch на телефоне — за владельцем. Готово к commit → push → deploy.

**Предыдущее (LAV-BUG-048):** тот же класс бага на Product Page — галерея `.gallery-main` с `pan-y` блокировала вертикальный скролл на некоторых мобильных браузерах; исправлено на `touch-action: manipulation` + JS-арбитраж жеста (native non-passive `touchmove`: вертикаль никогда не preventDefault, горизонталь → preventDefault + листание). `.related-grid` (Oxşar məhsullar) в правке не нуждается (`touch-action: auto`).

**Ранее (актуальный контекст):**
- **LAV-BUG-047:** один тап по карточке открывает товар (`.hscroll{touch-action:pan-x}` [теперь `pan-x pan-y`], `.product-card{touch-action:manipulation}`, stretched-link на всю карточку).
- **LAV-BUG-046/045:** мобильный header товара (2 строки, крупный логотип), единый badge «Pulsuz çatdırılma».
- **LAV-BUG-040..044 + F-008:** галерея без цикла + chevron-стрелки, поиск по коду exact-only, sticky-валидация размера, доставка на Checkout (radio-cards, `note`).

> ⚠️ **Действие владельца по F-007 (не связано):** выполнить `supabase/product-featured.sql`.

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026).

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-049 — mobile HomePage: вертикальный скролл блокировался над горизонтальными лентами

- **Файл:** `src/styles/index.css` — `.cats-row` (внутри `@media (max-width: 900px)`) и `.hscroll` (базовое правило): `touch-action: pan-x` → `touch-action: pan-x pan-y`. Комментарии переписаны на корректные.
- **Почему `pan-x pan-y`:** горизонтальный жест панит ленту (pan-x + `overflow-x:auto`), вертикальный — скроллит страницу (pan-y), pinch/double-tap-zoom выключены → tap мгновенный и не глотается. Пересечение с картой (`manipulation`): `manipulation ∩ (pan-x pan-y) = pan-x pan-y`.
- **Модель подтверждена** `.related-grid` (product page): там `touch-action` не задан (`auto`) и вертикаль всегда работала.
- Никаких JS-изменений, без `pointer-events`/`preventDefault`/самодельного скролла.

## Last Verified Checks

- `npm run build` — **успешно** (ProductPage 11.52 kB, CSS ~99.5 kB).
- **Live preview собранного билда (Chrome), чтение реальных CSSRule:** `.hscroll`=`pan-x pan-y`, `.cats-row @(max-width:900px)`=`pan-x pan-y`, `.product-card`=`manipulation`, `.gallery-main`=`manipulation`; ссылка карточки цела (`/product/20`); `overflow-x:auto` лент не тронут. PASSED (уровень CSS-правил).
- **NOT VERIFIED вживую (за владельцем):** реальный нативный touch-скролл на iPhone/Android (инструмент не эмулирует нативный touch-скролл — только синтетические события + computed/CSSRule-значения).

## Current Architecture Notes

- **Touch-модель лент (LAV-BUG-049):** горизонтальные scroll-контейнеры (`.hscroll`, `.cats-row`) используют `touch-action: pan-x pan-y` — обе оси нативны, зум выключен. НИКОГДА не использовать одиночный `pan-x` на вертикально-скроллящихся страницах: он блокирует page-scroll и «залипает» из-за пересечения touch-action с детьми.
- **Product gallery gesture (LAV-BUG-048):** арбитраж жеста — в JS (native non-passive `touchmove` на `.gallery-main`), `touch-action: manipulation` только гарантирует вертикальный скролл. Вертикаль → нативный скролл; горизонталь → `preventDefault` + `switchGalleryImage` (границы без wrap).
- Прочее без изменений: галерея 041/042, header 045/046, поиск 043, валидация размера 044, Checkout delivery F-008, Product Page mobile 039, HomePage mobile 038, ScrollManager 036, inactivity 30м, язык в Settings.

## Known Issues

Нет новых подтверждённых багов. Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.

## Risks

- LAV-BUG-049/048 проверены на собранном preview (CSSRule/синтетические события) + build; живой нативный touch-скролл на реальном телефоне — за владельцем.
- Checkout delivery: серверный total в БД не включает +5₼ экспресса; доплата — в UI-итоге и note/Telegram.
- `is_featured`-миграция (F-007) — за владельцем.

## Next Recommended Step

1. **Владельцу:** Fix Verification LAV-BUG-049 на реальном телефоне — вертикальный свайп с фото/тела карточки и с категории прокручивает страницу; горизонтальный свайп лент листает их; tap открывает товар/категорию; favorite/cart — своё действие.
2. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260812-140233

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram-уведомление), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** исправлен мобильный вертикальный скролл на HomePage (LAV-BUG-049) — продолжение LAV-BUG-048 (Product Page). Код в рабочем дереве, `vite build` успешен, CSS-значения проверены на собранном preview. Живой нативный touch на телефоне — за владельцем.
4. **Что реализовано (эта задача):** горизонтальные ленты главной `.hscroll` (Popular/Yeni/Endirimlər) и `.cats-row` (категории) переведены с `touch-action: pan-x` на `touch-action: pan-x pan-y` → вертикальный свайп над лентами снова скроллит страницу, горизонтальный по-прежнему листает ленту, tap мгновенный. Плюс всё прежнее (product-gallery 048, галерея 041/042, header 045/046, поиск 043, валидация 044, доставка F-008, карточки-тап 047, ScrollManager 036, is_featured graceful, inactivity 30м).
5. **Последняя задача:** LAV-BUG-049 — на мобильной главной вертикальный свайп, начатый с карточки/фото/категории, не скроллил страницу. Причина: `.hscroll`/`.cats-row` имели `touch-action: pan-x` (введён в LAV-BUG-032/047 ради tap), который блокирует вертикальный page-scroll; т.к. `.product-card` (`manipulation`) — потомок `.hscroll`, пересечение touch-action = `pan-x` → вертикаль мертва над всей лентой. Фикс: обе ленты → `touch-action: pan-x pan-y`. JS не трогался.
6. **Изменённые файлы (эта задача):** `src/styles/index.css` (`.cats-row` и `.hscroll` → `touch-action: pan-x pan-y`), `docs/BUGS.md` (LAV-BUG-049), `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно; live preview собранного билда — чтение реальных CSSRule: `.hscroll`/`.cats-row`=`pan-x pan-y`, `.product-card`/`.gallery-main`=`manipulation`, ссылка карточки `/product/20` цела, `overflow-x:auto` не тронут — PASSED (уровень CSS-правил). Живой нативный touch — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop НЕ переделывать (только регрессии); не удалять функциональность; НИКОГДА не использовать одиночный `touch-action: pan-x` на вертикально-скроллящихся лентах (блокирует page-scroll — причина LAV-BUG-049); не менять схему БД/RPC `place_order`; i18n AZ/RU/EN, без хардкода турецких строк; один пуш на задачу; не коммитить секреты; не ломать галерею/свайп/границы/dots/thumbnails/favorite/share/sticky add-to-cart/валидацию размера/горизонтальные ленты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — Fix Verification LAV-BUG-049 на реальном телефоне; из F-007 — `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-049 (mobile HomePage: вертикальный скролл блокировался над горизонтальными лентами — .hscroll/.cats-row pan-x → pan-x pan-y) — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/styles/index.css (.cats-row + .hscroll → touch-action: pan-x pan-y)
  - docs/BUGS.md (LAV-BUG-049), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-12
Last verified tests: нет test/lint-скриптов в проекте; CSS-значения — live preview собранного билда (чтение CSSRule) PASSED. Живой нативный touch на телефоне — NOT VERIFIED (за владельцем)
Recovery confidence: HIGH
```
