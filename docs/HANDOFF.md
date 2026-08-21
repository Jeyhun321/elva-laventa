# LaVenta — Handoff

## Current Status

**Task complete (код + build + тесты зелёные): Procurement-first Product lifecycle + UX-переработка модуля Закупки.** Требуется ручное действие владельца — применить `supabase/procurement-product-flow.sql` (после ранее применённого `procurement-module.sql`). До применения sidebar и остальная админка работают; форма/панель закупок покажут подсказку «выполните procurement-product-flow.sql» и не падают.

Прежние owner-actions в силе (TODO): `supabase/procurement-module.sql`, `supabase/delivery-and-individual-promo.sql`, Custom SMTP для password-reset и др.

## Current Branch
`main`.

## Last Completed Task

**Концепция: Supplier → Закупка → ЧЕРНОВИК Товара → публикация.**

**1) UX модуля Закупки.**
- Кнопка «Добавить закупку» — вверху рядом с заголовком (section-head AdminPage, справа на desktop; открывает модал через ref-сигнал `procAddRef`).
- Форма — **центральный modal** (`.admin-modal`/`.admin-modal-box.proc-modal`: backdrop, max-height, скролл внутри; mobile почти full-screen) вместо правого drawer.
- Удалены поля: Магазин/точка, Способ оплаты, Статус, Ссылка на чек/URL (+подпись), Продано. Убран фильтр статусов; из поиска/описания убрана «точка» (placeholder «Поиск по товару, коду, поставщику…», sub «…у поставщиков»).
- Summary-карточки: Сегодня закупок / Сумма закупок / **Закуплено единиц** / Ожидаемая прибыль (— если нет план. цены).
- Таблица: Фото, Товар, SKU, Поставщик, Дата, Кол-во, Закуп., Сумма, **статус переноса** (В Товарах / Не добавлен) + действия (Изм./Добавить в Товары | Открыть товар/Архив).

**2) Полноценные данные товара в закупке.** Поля Part 4: Поставщик*, Дата*, Время, SKU*, Название*, Закуп. цена*, Количество*; + Категория (опц.), связать с существующим товаром (опц.), план. цена продажи (опц.). **Фото товара** — переиспользован общий product image uploader (`uploadImage`, бакет product-images): 1..N, preview, reorder, primary, удалить. **Варианты** — цвет (+hex) → размеры с количеством; количество считается из вариантов.

**3) Перенос «Добавить в Товары».** Серверный `promote_procurement_to_product` (SECURITY DEFINER + is_admin, row lock): если `product_id` уже задан → возвращает его; если есть товар с тем же SKU (основной цвет) → **линкует**; иначе создаёт **ЧЕРНОВИК** товара (`is_active=false`, `in_stock=true`, `price=0`, name/images/colors/sizes из закупки). Закуп. цена в товар НЕ переносится. Идемпотентно (защита от дублей/двойного клика). Кнопка становится «Открыть товар» после связи.

**4) Аналитика — только закупки.** `procurement_analytics` обновлён: партии/единицы/расходы/средняя закуп. цена/ожидаемые выручка+прибыль (expected, где задана план. цена) + разбивки по поставщику/товару. Продажи/orders/revenue НЕ подмешиваются. Sales Analytics и Combined Profit Analytics — отдельные будущие модули (TODO/D-010).

**Формулы** — `src/lib/money.js` (margin=profit/revenue, markup=profit/cost); БД дублирует GENERATED-колонками (авторитет — БД). Закуп. цена — confidential (RLS is_admin, не в public product API).

## Files Changed
- `supabase/procurement-product-flow.sql` (new) — `procurements.images/variants/promoted_to_product_at/stock_applied`, `planned_sale_unit_price`→nullable, обновлённый `procurement_analytics`, `promote_procurement_to_product`.
- `src/admin/procurement.js` — images/variants в row, `variantsTotalQty`, `promoteToProduct`, валидация (SKU/title required, planned optional, точка убрана).
- `src/components/admin/ProcurementPanel.jsx` — modal, фото, варианты, перенос, карточки/таблица/фильтры.
- `src/components/admin/AnalyticsPanel.jsx` — procurement-only метрики.
- `src/pages/AdminPage.jsx` — header CTA для закупок (procAddRef) + props (onOpenProduct/onRegisterAdd), sub-текст.
- `src/styles/index.css` — proc-modal (шире), variants editor, thumbs.
- `tests/money.test.mjs` — +5 (reference-кейс аналитики 370/19/250/120).
- docs: FEATURES (F-018), DECISIONS (D-010), TODO, HANDOFF.

## Current Architecture Notes
- Товар: код-variant-группы (одинаковый `code`), `colors[]`/`sizes[]`, `is_active` (черновик=false), склад — булев `in_stock` (числового склада нет), `category_id` NOT NULL, `code` unique.
- Закупка ↔ товар: `procurements.product_id` (nullable до переноса). Перенос атомарный/идемпотентный.
- Procurement/suppliers — RLS только is_admin; аналитика/перенос — SECURITY DEFINER + is_admin. service_role во фронте нет; второй auth-клиент не создавался.

## Known Issues / Risks
- Пока `supabase/procurement-product-flow.sql` НЕ применён: фото/варианты/перенос/новая аналитика не работают (панель показывает подсказку); остальная админка не затронута.
- Склад товара — булев; перенос не инкрементирует числовой склад (его нет). Числовой per-variant inventory — future (флаг `stock_applied` заложен).
- Sales Analytics намеренно НЕ реализована; Procurement Analytics не показывает продажи (по требованию).
- Клиент (`money.js`) и БД (generated) держат одинаковые формулы — менять оба места; авторитет — БД.
- Живой прогон Dashboard/переноса под owner-OTP/Google — owner-manual (среда не проходит owner-аутентификацию; SQL не применён из окружения).

## Verification Done
- `npm run build` — OK (146 модулей).
- `npm test` — зелёные: auth-recovery 13 + inactivity 8 + delivery 16 + money 19 (incl. reference-кейс аналитики 370/19/250/120, margin≠markup).
- SQL идемпотентен/аддитивен, синтаксис вычитан; НЕ применён из окружения → owner action.

## Next Recommended Step
Владелец применяет `supabase/procurement-product-flow.sql`, затем под owner-сессией: закупка с фото+вариантами → «Добавить в Товары» → проверить ЧЕРНОВИК в «Товары» (is_active=false, price 0, фото/цвета/размеры), повторный клик без дублей, закуп. цена не в товаре; аналитика — только закупки.

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию sidebar/procurement/impersonation/delivery/promo. Claude — главный инженер.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260822-030047

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite магазин одежды на GitHub Pages (base `/elva-laventa/`) + Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** завершён таск «Procurement-first Product lifecycle + UX модуля Закупки». Код готов, build OK, тесты зелёные (13+8+16+19). Требуется ОДНО действие владельца — применить `supabase/procurement-product-flow.sql`. До применения sidebar/старая админка работают; новые части закупок показывают подсказку и не падают.
4. **Что реализовано (этот таск):** UX закупок (CTA вверху, центральный modal вместо drawer, удалены точка/оплата/статус/чек-URL/продано, убран фильтр статусов); полноценные данные товара в закупке (фото через общий uploader, варианты цвет→размеры с количеством, SKU/название/категория/план. цена продажи опц.); перенос «Добавить в Товары» → ЧЕРНОВИК товара (is_active=false, price 0, in_stock=true) или линковка к существующему SKU, идемпотентно (RPC `promote_procurement_to_product`, row lock); закуп. цена confidential, в товар не переносится; аналитика — только закупки (без продаж). Ранее: sidebar+модули (F-017), доставка (F-015), промо по User ID (F-016), impersonation (DONE), admin-security, 404, password-reset (нужен SMTP).
5. **Что сделано в последней задаче:** см. Last Completed Task и Files Changed выше.
6. **Изменённые файлы:** `supabase/procurement-product-flow.sql` (new), `src/admin/procurement.js`, `src/components/admin/ProcurementPanel.jsx`, `src/components/admin/AnalyticsPanel.jsx`, `src/pages/AdminPage.jsx`, `src/styles/index.css`, `tests/money.test.mjs`, docs (HANDOFF/FEATURES/DECISIONS/TODO).
7. **Выполненные проверки:** `npm run build` OK; `npm test` зелёные; reference-кейс аналитики покрыт тестом. SQL НЕ применён из окружения; Dashboard/перенос визуально — owner-manual.
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; не ослаблять RLS; service_role НИКОГДА во фронте; procurement/suppliers/аналитика — is_admin; закуп. цена не в public product API; перенос идемпотентен (row lock + product_id), товар-черновик не публиковать автоматически; НЕ смешивать Procurement Analytics с продажами; не вводить числовой склад без анализа; клиент и БД держат одинаковые формулы; не трогать is_admin/OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront; один пуш на таск.
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** владелец применяет `supabase/procurement-product-flow.sql`; затем живой прогон закупка→товар. Будущее: Sales Analytics, Combined Profit Analytics, числовой склад (не сейчас). Прежние owner-actions из TODO.
11. **Первый следующий шаг:** дождаться применения `supabase/procurement-product-flow.sql`, затем под owner-сессией прогнать закупка с фото/вариантами → «Добавить в Товары» → проверить черновик и идемпотентность.
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ FEATURES/DECISIONS/TODO), `git status`, `npm run build` + `npm test`, коммит+пуш, старт GitHub Pages deploy (не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: Procurement-first Product lifecycle + UX модуля Закупки — DONE (код), требует owner SQL apply
Expected modified files:
  - supabase/procurement-product-flow.sql (new)
  - src/admin/procurement.js
  - src/components/admin/ProcurementPanel.jsx
  - src/components/admin/AnalyticsPanel.jsx
  - src/pages/AdminPage.jsx
  - src/styles/index.css
  - tests/money.test.mjs
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DECISIONS.md, docs/TODO.md
Git status summary: рабочие изменения готовятся к commit+push этой сессией
Documentation updated: YES
Last verified build: OK (npm run build, 146 модулей, built ~3.1s)
Last verified tests: green (auth-recovery 13 + inactivity 8 + delivery 16 + money 19)
Recovery confidence: HIGH
```
