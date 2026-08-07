# LaVenta — Handoff

## Current Status

**Header товара перекомпонован по макету (LAV-BUG-045): 1-я строка — крупный логотип + Profile/Fav/Cart, 2-я строка — `[←]` Back + поиск.** Поверх пакета из 6 задач (галерея, поиск, валидация размера, доставка). Код в рабочем дереве, `vite build` — успешно; desktop проверен live (header без регрессий). Готово к commit → push → deploy.

**Что сделано (последнее — TASK 7):**
- **TASK 7 (LAV-BUG-045):** мобильный header товара — 2 строки. 1-я: КРУПНЫЙ логотип (полный мобильный размер 166/140px) + Profile/Fav/Cart. 2-я: `[←]` Back слева + поиск (укорочен только слева на ширину Back; правый край и 🔍 не двигались). Back теперь ВНУТРИ `.header-search-row` (на desktop/не-product обёртка `display:contents` → layout не меняется). Пересматривает компоновку LAV-BUG-040 (одна строка со сжатым логотипом).

**Пакет из 6 задач (предыдущий, уже включён):**
- **TASK 1 (LAV-BUG-040):** (заменён TASK 7) — было `[Back][Logo] … actions` в одну строку со сжатым логотипом.
- **TASK 2 (LAV-BUG-041):** галерея больше не зациклена. Убран modulo-wrap → ограниченный индекс; на границах стрелка не листает. Swipe — та же логика.
- **TASK 3 (LAV-BUG-042):** новые стрелки — `IconChevron`, белый полупрозрачный круг + blur + тонкий border + тень; `:disabled` (opacity:0) на границе; при одном фото стрелок нет.
- **TASK 4 (LAV-BUG-043):** Product Code — только точное совпадение (убран `code.includes`); имя — по-прежнему partial.
- **TASK 5 (LAV-BUG-044):** валидация размера показывается у sticky Add-to-cart (`.pd-buybar-warn`) + подсветка/shake селектора; без alert/scroll; исчезает при выборе размера.
- **TASK 6 (F-008):** Checkout — radio-cards доставки (Стандарт 0₼ по умолчанию / Экспресс +5₼); Order Summary и inline-итог пересчитываются; способ доставки сохраняется в заказ и Telegram через `note` (без DDL).

> ⚠️ **Действие владельца по F-007 остаётся (не связано):** выполнить `supabase/product-featured.sql`.

**Про деплой:** один пуш на задачу (второй «docs: SHA» коммит отменял деплой — LAV-BUG-026).

## Current Branch

`main`

## Last Completed Task

### Пакет LAV-BUG-040..044 + F-008 (delivery)

- **Файлы:** `src/components/Icons.jsx` (`IconChevron`), `src/lib/search.js` (code exact-only), `src/pages/ProductPage.jsx` (gallery clamp + arrow disabled + buybar warn + size warn class), `src/pages/CheckoutPage.jsx` (delivery state/пересчёт/radio-cards/note), `src/i18n/translations.js` (delivery_* keys), `src/styles/index.css` (header-product mobile, gallery-nav, pd-buybar-warn, size-options.warn, delivery-card).
- **Header:** `.header.header-product` (mobile, специфичность > старого правила) — логотип сжимаемый, Back/actions фикс → одна строка на 320–430px. Desktop не тронут.
- **Gallery:** `switchGalleryImage` — `nextIndex = currentIndex + direction; guard границ; return` (без modulo). `atFirst/atLast` → `disabled` на стрелках. Swipe вызывает ту же функцию.
- **Search:** в `scoreFields` для кода осталось только `fields.code === rawQueryNorm` (+500); partial (`includes`, +250) удалён. Имя/бренд/категория/тег/описание — без изменений.
- **Add-to-cart:** `handleAdd` порядок не изменён (auth → size). Для вошедшего без размера `setWarn(true)` → `.pd-buybar-warn` + `.size-options.warn`. Сброс при выборе размера.
- **Checkout delivery:** `delivery` state ('standard'|'express', default standard), `EXPRESS_FEE=5`; `deliveryFee`/`grandTotal`; radio-cards; summary (Товары + Доставка + Итого) + inline total = grandTotal; `note` = буyer note + `Çatdırılma: Standart|Ekspress (+5 ₼)` → в заказ + Telegram (RPC `place_order` включает note).

## Last Verified Checks

- `npm run build` — **успешно** (ProductPage 10.91kB, CheckoutPage 9.15kB).
- **Search unit-тест (node, реальный движок):** name-partial `Qı`/`qirm` → PASS; code `LV`/`LV23`/`LV238`/`200` → НЕ находит; `LV2381`/`lv2381`/`2002` → находит. Все PASSED.
- **Gallery live (desktop, `/product/20`, 3 фото):** первая → prev disabled/next active; после 2× next → последняя, next disabled/prev active; повторный next на последней → индекс не меняется (2); dots(3) синхронны. PASSED. Нет горизонтального overflow.
- **Add-to-cart (гость):** tap → auth-модалка (подтверждает вызов `handleAdd`). Для вошедшего без размера — warn (логика по коду; live-мобиль за владельцем).
- **NOT VERIFIED вживую (за владельцем):** мобильный узкий viewport — header одной строкой (320–430px), sticky warn, delivery-cards на телефоне; Checkout end-to-end (нужен вход + непустая корзина); Telegram-сообщение с доставкой (нужен реальный заказ). Инструмент рендерит desktop-viewport 1536px.

## Current Architecture Notes

- **Header товара:** мобильные правила под `.header.header-product` (0,3,0) перекрывают базовые `.header .brand-logo`; логотип сжимаемый, Back/actions фиксированы; всё в `@media(max-width:900px)` → desktop не затронут.
- **Gallery:** ограниченная навигация (`atFirst/atLast`), стрелки `disabled` на границах, chevron-стиль; swipe и стрелки — одна функция `switchGalleryImage`.
- **Search:** `src/lib/search.js` — код только exact; имя/бренд/категория/тег/описание — partial/fuzzy как раньше.
- **Checkout доставка:** способ передаётся в заказ через `note` (без изменения RPC `place_order`/схемы БД). Серверный total заказа считается по ценам товаров; доплата экспресса отражается в UI-итоге и в note/Telegram. Онлайн-оплаты нет (ручное выполнение).
- Прочее: Product Page mobile (LAV-BUG-039), HomePage mobile (038), ScrollManager (036), inactivity 30м, язык в Settings.

## Known Issues

Нет новых подтверждённых багов. Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.

## Risks

- Мобильные пункты (header одной строкой, sticky warn, delivery-cards) проверены на desktop-viewport + build; живой телефон — за владельцем.
- Checkout delivery: серверный total в БД не включает +5₼ экспресса (нет онлайн-оплаты); доплата — в UI-итоге и в note/Telegram. При желании владелец расширяет RPC отдельным полем доставки (DDL — владелец).
- `is_featured`-миграция (F-007) — за владельцем.

## Next Recommended Step

1. **Владельцу:** Fix Verification на телефоне — header товара (320–430px одной строкой), галерея (границы, swipe), поиск по коду/имени, sticky-валидация размера (вошедшим), Checkout доставка (пересчёт + Telegram).
2. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260807-210756

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages.
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (заказ через серверную RPC `place_order` + Telegram-уведомление), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** выполнен пакет из 6 задач (header товара, галерея без цикла + новые стрелки, поиск по коду exact, UX-валидация размера, выбор доставки на Checkout). Код в рабочем дереве, `vite build` успешен, search unit-тест PASSED, галерея live-проверена (desktop). Живой мобильный/checkout end-to-end — за владельцем.
4. **Что реализовано (этот пакет):** сжимаемый логотип в header товара (одна строка); ограниченная галерея + chevron-стрелки с disabled; код — только точное совпадение; sticky-валидация размера; radio-cards доставки Standard/Express с пересчётом Order Summary и записью способа в note (заказ + Telegram). Плюс прежнее: Product Page mobile (039), HomePage mobile (038), умный поиск, ScrollManager, is_featured (graceful degrade), inactivity 30м, язык в Settings.
5. **Последняя задача:** LAV-BUG-045 (перекомпоновка header товара: крупный логотип в 1-й строке, Back+поиск во 2-й) поверх пакета LAV-BUG-040..044 + F-008.
6. **Изменённые файлы (последняя задача):** `src/components/Header.jsx` (обёртка `.header-search-row` + Back внутри), `src/styles/index.css` (`.header-search-row` contents/flex). Ранее в этой сессии: `src/components/Icons.jsx`, `src/lib/search.js`, `src/pages/ProductPage.jsx`, `src/pages/CheckoutPage.jsx`, `src/i18n/translations.js`, `docs/BUGS.md`, `docs/FEATURES.md`, `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно; search unit-тест (node) — PASSED; gallery live (desktop `/product/20`) — границы/disabled/no-wrap PASSED; нет горизонтального overflow. Мобильный/Checkout end-to-end/Telegram — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop НЕ переделывать (только регрессии); не удалять функциональность; не менять схему БД/RPC `place_order` (DDL — владелец); способ доставки — через note (без DDL); i18n AZ/RU/EN; не хардкодить турецкие строки; один пуш на задачу; не коммитить секреты.
9. **Обязательные документы:** `docs/HANDOFF.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — Fix Verification на телефоне (пакет 040..044 + доставка); из F-007 — `supabase/product-featured.sql`. Опционально: отдельное поле доставки в RPC/схеме (сейчас через note).
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; затем — Fix Verification.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-045 (перекомпоновка header товара) поверх LAV-BUG-040..044 + F-008 — завершено в рабочем дереве; commit/push/deploy — следующий шаг
Expected modified files:
  - src/components/Icons.jsx (IconChevron)
  - src/lib/search.js (code exact-only)
  - src/pages/ProductPage.jsx (gallery clamp + arrow disabled + size validation)
  - src/pages/CheckoutPage.jsx (delivery method + recalculation + note)
  - src/i18n/translations.js (delivery_* keys)
  - src/styles/index.css (header-product, gallery-nav, pd-buybar-warn, size-options.warn, delivery-card)
  - docs/BUGS.md (LAV-BUG-040..044), docs/FEATURES.md (F-008), docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-07
Last verified tests: нет test-скриптов проекта; search — unit-тест (node) PASSED; gallery — live desktop PASSED. Мобильный/Checkout end-to-end/Telegram — NOT VERIFIED (за владельцем)
Recovery confidence: MEDIUM
```
