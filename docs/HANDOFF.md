# LaVenta — Handoff

## Current Status

**LAV-BUG-050 — системный аудит purchase-chain и укрепление stock/availability по всей цепочке Admin → БД → Catalog → Search → Product → Favorites → Cart → Checkout → Order.**

Найдена корневая причина сообщённого симптома («out-of-stock всё ещё можно заказать»): наличие (`in_stock`) не проверялось **нигде** в цепочке покупки — ни на фронте (add-to-cart / checkout), ни на авторитетном сервере `place_order` (RPC проверяла только `is_active`, серверную цену и размер). Симптом «кнопка Add to Cart» был вершиной проблемы.

Исправлено эшелонированно (UI → единая точка фронта → сервер-авторитет):
- **Сервер (авторитет, закрывает весь класс stale-state):** `supabase/order-stock-guard.sql` — `place_order` дополнен проверкой `in_stock` → `PRODUCT_UNAVAILABLE`. Остальное (любой вошедший, серверная цена, размер, Telegram, очистка корзины) — без изменений. **Требует запуска владельцем в Supabase SQL Editor.**
- **Единая точка фронта:** `ShopContext.addToCart` резолвит товар через `getProduct` и отклоняет `!product || inStock===false` — все кнопки «добавить» (карточка, product page, «купить сейчас») проходят через неё. `setQty` запрещает увеличение кол-ва недоступного товара.
- **UI:** ProductPage (Add/Buy/buybar disabled + «Нет в наличии»), ProductCard (add-btn disabled + notice), CartPage (пометка позиции + блок перехода к оформлению), CheckoutPage (submit disabled + блок отправки до сервера).
- **Устаревшие вкладки:** CatalogContext — тихая ревалидация каталога по `visibilitychange` (без флага loading).

Цена и раньше бралась live из каталога (Cart/Checkout не доверяли старой цене) + серверная цена в заказе — инвариант цены соблюдён. Изоляция аккаунтов, double-submit (busy-lock), защита от ложного успеха — уже были корректны, подтверждены аудитом.

**Про деплой:** один пуш на задачу.

## Current Branch

`main`

## Last Completed Task

### LAV-BUG-050 — E2E business-logic audit & stock hardening

- **Файлы (working tree):**
  - `src/context/ShopContext.jsx` — центральный stock-guard в `addToCart`; `setQty` не даёт увеличивать qty недоступного товара; deps обновлены.
  - `src/pages/ProductPage.jsx` — `outOfStock`; блок `handleAdd/handleBuy`; кнопки Add/Buy/buybar `disabled`.
  - `src/components/ProductCard.jsx` — `outOfStock`; блок `quickAdd` + notice; add-btn `disabled`.
  - `src/pages/CartPage.jsx` — пометка недоступной позиции, блок перехода к оформлению.
  - `src/pages/CheckoutPage.jsx` — блок submit при недоступных позициях (UI + до сервера).
  - `src/context/CatalogContext.jsx` — тихая ревалидация каталога по `visibilitychange`.
  - `src/i18n/translations.js` — ключ `cart_unavailable_notice` (AZ/RU/EN).
  - `src/styles/index.css` — `.cart-line.unavailable`, `.cart-line-oos`, `.cart-unavailable-notice`.
  - `supabase/order-stock-guard.sql` — **новая миграция** `place_order` c проверкой `in_stock` (запуск за владельцем).
  - `docs/ECOMMERCE_E2E_QA.md` — новая постоянная QA-документация; `docs/BUGS.md` — LAV-BUG-050; `docs/HANDOFF.md`.

## Last Verified Checks

- `npm run build` — **успешно** (в проекте нет test/lint-скриптов, только `vite build`).
- **NOT VERIFIED (за владельцем):** запуск `supabase/order-stock-guard.sql` в Supabase; живой E2E-прогон на устройстве после миграции.

## Current Architecture Notes

- **Source of truth покупки** — Supabase `products` + RPC `place_order`. `UI state ≠ proof of validity`: наличие/цена/размер повторно проверяются сервером при создании заказа.
- **Единая точка добавления в корзину** — `ShopContext.addToCart` (сюда сходятся все кнопки); stock-guard живёт здесь, а не в 20 компонентах.
- **Модель наличия** — boolean `in_stock` (без числовых остатков и per-size stock). Каждый цвет — отдельная строка со своим `in_stock`. «Доступный размер» = размер есть в `products.sizes`.
- Прочее без изменений: touch-модель лент 049, product-gallery 048, header 045/046, поиск 043 (exact code), валидация размера 044, Checkout delivery F-008, ScrollManager 036, inactivity 30м, i18n AZ/RU/EN.

## Known Issues

- **PENDING OWNER:** миграция `supabase/order-stock-guard.sql` — без неё серверная проверка `in_stock` не активна (фронт уже защищён, но авторитетная граница ждёт запуска).
- Ограничение F-007: приоритет не действует до `supabase/product-featured.sql`.
- Нет числовых остатков → `qty > available` не ограничено кол-вом (сознательная boolean-модель).

## Risks

- Серверная проверка активна только после запуска `order-stock-guard.sql`. До этого stale-вкладка/ручная правка localStorage теоретически прошла бы сервер (фронт-гарды закрывают обычные пути).
- E2E проверены логикой + build; живой прогон на устройстве — за владельцем.
- `is_featured`-миграция (F-007) — за владельцем.

## Next Recommended Step

1. **Владельцу:** запустить `supabase/order-stock-guard.sql` в Supabase → SQL Editor.
2. **Владельцу:** прогнать E2E-02..10 из `docs/ECOMMERCE_E2E_QA.md` на реальном устройстве.
3. (Из F-007) применить `supabase/product-featured.sql`.

## Context For Next Session

### RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260814-014332

1. **Проект:** Elva LaVenta — React/Vite storefront магазина женской одежды, Supabase (Frankfurt), деплой GitHub Pages (base `/elva-laventa/`).
2. **Описание:** интернет-магазин: каталог, избранное, корзина, checkout (RPC `place_order` + Telegram), admin-панель, три языка AZ/RU/EN.
3. **Текущее состояние:** завершён системный аудит purchase-chain (LAV-BUG-050). Фронт защищён от покупки недоступного товара; авторитетная серверная проверка `in_stock` подготовлена как миграция и ждёт запуска владельцем. `vite build` успешен. Код в рабочем дереве.
4. **Что реализовано (эта задача):** (а) сервер `supabase/order-stock-guard.sql` — `place_order` теперь отклоняет `in_stock is not true` как PRODUCT_UNAVAILABLE (плюс прежние is_active/цена/размер/Telegram/очистка корзины); (б) `ShopContext.addToCart` — единый stock-guard через `getProduct`; `setQty` не даёт увеличивать qty недоступного; (в) ProductPage/ProductCard — блок и disabled на add/buy; (г) CartPage/CheckoutPage — пометка недоступных позиций и блок оформления; (д) CatalogContext — тихая ревалидация по visibilitychange; (е) i18n `cart_unavailable_notice`, CSS-стили; (ж) docs/ECOMMERCE_E2E_QA.md. Всё прежнее (ленты 049, галерея 048/041/042, header 045/046, поиск 043, валидация 044, доставка F-008, карточки-тап 047) сохранено.
5. **Последняя задача:** LAV-BUG-050 — out-of-stock товар можно было купить, т.к. `in_stock` не проверялся ни на фронте, ни в `place_order`. Корень — отсутствие серверной проверки наличия.
6. **Изменённые файлы (эта задача):** `src/context/ShopContext.jsx`, `src/pages/ProductPage.jsx`, `src/components/ProductCard.jsx`, `src/pages/CartPage.jsx`, `src/pages/CheckoutPage.jsx`, `src/context/CatalogContext.jsx`, `src/i18n/translations.js`, `src/styles/index.css`, `supabase/order-stock-guard.sql` (new), `docs/ECOMMERCE_E2E_QA.md` (new), `docs/BUGS.md`, `docs/HANDOFF.md`.
7. **Проверки:** `vite build` — успешно. Test/lint-скриптов в проекте нет. Запуск SQL-миграции и живой E2E — NOT VERIFIED (за владельцем).
8. **Ограничения:** desktop не переделывать (только регрессии); не удалять функциональность; не менять схему БД без необходимости (миграция только `create or replace place_order` + добавляет проверку, ничего не удаляет); модель наличия — boolean `in_stock`, инвентаризацию не изобретать; i18n AZ/RU/EN без хардкода турецких строк; один пуш на задачу; не коммитить секреты; не ломать галерею/свайп/ленты/поиск/валидацию/доставку/Telegram-заказ/auth/Google-login.
9. **Обязательные документы:** `docs/HANDOFF.md`, `docs/ECOMMERCE_E2E_QA.md`, `START.md`, `CLAUDE.md`, `AGENTS.md`, `AI_WORKFLOW.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`, `docs/BUGS.md`, `docs/FEATURES.md`.
10. **Что осталось:** владельцу — запустить `supabase/order-stock-guard.sql`; прогнать E2E-02..10 на устройстве; из F-007 — `supabase/product-featured.sql`.
11. **Первый шаг:** прочитать `docs/HANDOFF.md`, `git status`, `git log -3`; убедиться, что миграция `order-stock-guard.sql` применена в БД.
12. **После работы:** обновить `docs/HANDOFF.md` (полностью переписать), при необходимости `docs/BUGS.md`/`FEATURES.md`, commit + push в `main`, запустить deploy (GitHub Actions не ждать).

### SESSION CHECKSUM

```
Recovery format: v1
Project: Elva LaVenta (React/Vite + Supabase + GitHub Pages)
Branch: main
Current task: LAV-BUG-050 (E2E stock/availability hardening across purchase chain) — завершено в рабочем дереве; commit/push/deploy — следующий шаг; серверная миграция за владельцем
Expected modified files:
  - src/context/ShopContext.jsx, src/context/CatalogContext.jsx
  - src/pages/ProductPage.jsx, src/pages/CartPage.jsx, src/pages/CheckoutPage.jsx
  - src/components/ProductCard.jsx
  - src/i18n/translations.js, src/styles/index.css
  - supabase/order-stock-guard.sql (new)
  - docs/ECOMMERCE_E2E_QA.md (new), docs/BUGS.md, docs/HANDOFF.md
Git status summary: изменения в рабочем дереве, не закоммичены на момент записи
Documentation updated: YES
Last verified build: vite build — успешно, 2026-08-14
Last verified tests: test/lint-скриптов в проекте нет (только build). SQL-миграция и живой E2E — NOT VERIFIED (за владельцем)
Recovery confidence: HIGH
```
