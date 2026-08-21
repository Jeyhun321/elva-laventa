# LaVenta — Handoff

## Current Status

**Task complete (код + build + тесты зелёные): Admin переведён на вертикальный sidebar + добавлены модули Закупки / Поставщики / Аналитика.** Требуется одно ручное действие владельца — применить `supabase/procurement-module.sql` (идемпотентно, аддитивно). До применения sidebar и вся текущая админка работают; новые модули Закупки/Поставщики/Аналитика показывают дружелюбную подсказку «выполните procurement-module.sql» и НЕ падают.

Предыдущие owner-actions остаются в силе (см. TODO): `supabase/delivery-and-individual-promo.sql`, Custom SMTP для password-reset, и старые SQL из TODO.

## Current Branch
`main`.

## Last Completed Task

**1) Навигация Admin → вертикальный left sidebar (SaaS-стиль).**
- `src/pages/AdminPage.jsx`: горизонтальные `admin-tabs` заменены на `AdminSidebar` (модули с иконками, active/hover, «Настройки» внизу → storefront `/settings`) + `admin-main` с собственным topbar (гамбургер + бренд + «Администратор» + На сайт/Выйти). Мобильный drawer (гамбургер, backdrop). Порядок модулей: Товары, Заказы, Промокоды, Колесо фортуны, Пользователи, Закупки, Поставщики, Аналитика, Системные логи.
- `src/App.jsx`: на `/admin` витринные `Header`/`Footer`/`TabBar` больше не рендерятся (`isAdminRoute`) — админка самостоятельный дашборд. Все прежние панели (Products/Orders/Promo/Wheel/Users/Logs) работают как раньше внутри новой оболочки.

**2) Модуль Закупки (`ProcurementPanel`).** Summary-карточки (сегодня закупок / сумма за период / ожид. прибыль / товаров в пути), поиск (товар/SKU/поставщик/точка), фильтры (период/поставщик/статус/категория), сортировка, пагинация (8/стр), таблица (mobile → карточки, без h-overflow), drawer add/edit с live-расчётом. Статусы: purchased/in_transit/in_stock/sold_out/cancelled. Архивирование (soft-delete).

**3) Модуль Поставщики (`SuppliersPanel`).** CRUD поставщиков + их точек (1..N), раскрытие карточки, статистика по реальным закупкам, деактивация вместо удаления. Dependent dropdown точек по поставщику (сервер тоже проверяет принадлежность).

**4) Модуль Аналитика (`AnalyticsPanel`).** Период + пресеты, метрики через `procurement_analytics` (is_admin RPC), разбивки по поставщику/товару из реальных записей. «Ожидаемая» vs «Фактическая» прибыль разделены; ограничение (нет FIFO) задокументировано в UI и D-009.

**Формулы — единый `src/lib/money.js`; БД дублирует GENERATED-колонками (авторитет — БД):**
`purchase_total = закуп×кол-во`, `expected_revenue = продажа×кол-во`, `expected_profit = (продажа−закуп)×кол-во`, `margin% = прибыль/выручка×100`, `markup% = прибыль/себестоимость×100`, `remaining = кол-во−продано`, `actual_profit = (продажа−закуп)×продано`.

## Files Changed
- `supabase/procurement-module.sql` (new) — suppliers/supplier_points/procurements + RLS(is_admin) + generated-суммы + триггер принадлежности точки + `procurement_analytics`.
- `src/lib/money.js` (new) + `tests/money.test.mjs` (new, 14) + `package.json`.
- `src/admin/procurement.js` (new) — CRUD/analytics data-layer + аудит.
- `src/components/admin/ProcurementPanel.jsx` / `SuppliersPanel.jsx` / `AnalyticsPanel.jsx` (new).
- `src/pages/AdminPage.jsx` — sidebar shell (`AdminSidebar`, `ADMIN_MODULES`, topbar, drawer), новые табы.
- `src/App.jsx` — скрытие витринного Header/Footer/TabBar на `/admin`.
- `src/styles/index.css` — admin dashboard/sidebar/procurement/suppliers/analytics + responsive.
- docs: FEATURES (F-017), DECISIONS (D-009), TODO, HANDOFF.

## Current Architecture Notes
- GH Pages SPA, base `/elva-laventa/`, BrowserRouter basename. Единая Supabase auth-сессия (`adminSupabase = supabase`).
- Admin-права — только `is_admin()` (owner UUID alekberov + role + email). Закупки/поставщики/аналитика — RLS `is_admin()`; аналитика — SECURITY DEFINER + is_admin.
- Денежные суммы — GENERATED в БД (клиент не присылает и не подделывает). service_role во фронте нет; второй auth-клиент не создавался.

## Known Issues / Risks
- Пока `supabase/procurement-module.sql` НЕ применён: модули Закупки/Поставщики/Аналитика показывают подсказку (таблиц/RPC ещё нет); остальная админка не затронута.
- «Фактическая прибыль» — по вручную отмеченному `quantity_sold`, НЕ по автосписанию заказов (FIFO отложен, задокументировано).
- Чеки — только URL-поле (публичный бакет товаров не используется для приватных чеков).
- Клиент (`money.js`) и БД (generated) держат одинаковые формулы — при правке менять оба места; авторитет — БД.
- Живой прогон нового Admin-дашборда под owner-OTP/Google — выполняет владелец (среда не может пройти owner-аутентификацию).

## Verification Done
- `npm run build` — OK (146 модулей).
- `npm test` — все файлы зелёные (auth-recovery 13 + inactivity 8 + delivery 16 + money 14).
- Preview /admin: 0 console errors, нет горизонтального overflow, витринный chrome на /admin скрывается (логика isAdminRoute). Dashboard-sidebar требует owner-сессии → визуальная проверка панелей owner-manual.
- SQL написан идемпотентно/аддитивно, синтаксис вычитан; НЕ применён из окружения (нет production-доступа) → owner action.

## Next Recommended Step
Владелец применяет `supabase/procurement-module.sql`, затем под owner-сессией: добавить поставщика A с точками A1/A2, добавить закупку (qty10/закуп20/продажа35 → 200/350/150/42.86%), проверить summary-карточки и аналитику против записей; убедиться, что обычный пользователь не читает `procurements`.

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию impersonation/admin-security/delivery/promo. Claude — главный инженер.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260822-022841

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite интернет-магазин одежды на GitHub Pages (base `/elva-laventa/`, `https://jeyhun321.github.io/elva-laventa/`) с backend Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** только что завершён таск «Admin sidebar + модули Закупки/Поставщики/Аналитика». Код готов, `npm run build` OK, тесты зелёные (13+8+16+14). Требуется ОДНО действие владельца — применить `supabase/procurement-module.sql`. До применения sidebar и старая админка работают; новые модули показывают подсказку и не падают.
4. **Что реализовано (этот таск):** вертикальный left sidebar в админке (9 модулей + Настройки), скрытие витринного Header/Footer/TabBar на /admin; модуль Закупки (карточки/поиск/фильтры/сортировка/пагинация/таблица→карточки/drawer с live-расчётом/статусы/архив); модуль Поставщики (CRUD + точки, dependent dropdown, статистика); модуль Аналитика (период/метрики/разбивки, expected vs actual, RPC `procurement_analytics`). Формулы в `src/lib/money.js`, БД дублирует generated-колонками. Ранее: доставка (F-015), промо по User ID (F-016), impersonation (F-014, DONE), admin-security, fullscreen 404, password-reset (нужен Custom SMTP).
5. **Что сделано в последней задаче:** см. Last Completed Task и Files Changed выше.
6. **Изменённые файлы:** `supabase/procurement-module.sql` (new), `src/lib/money.js` (new), `tests/money.test.mjs` (new), `package.json`, `src/admin/procurement.js` (new), `src/components/admin/ProcurementPanel.jsx`/`SuppliersPanel.jsx`/`AnalyticsPanel.jsx` (new), `src/pages/AdminPage.jsx`, `src/App.jsx`, `src/styles/index.css`, docs (HANDOFF/FEATURES/DECISIONS/TODO).
7. **Выполненные проверки:** `npm run build` OK; `npm test` все зелёные; preview /admin 0 console errors, нет h-overflow, chrome скрыт. Dashboard-панели визуально — owner-manual (нужна owner-сессия). SQL НЕ применён из окружения.
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; не ослаблять RLS; service_role НИКОГДА во фронте; закупки/поставщики/аналитика — RLS is_admin, суммы считает БД (generated), не доверять raw id от фронта; клиент и БД держат одинаковые формулы; не трогать is_admin/OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront; коммит+пуш после завершённого этапа (один пуш на таск).
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** владелец применяет `supabase/procurement-module.sql`; затем живой прогон закупки/поставщика/аналитики под owner-сессией. Отдельно — прежние owner-actions из TODO (delivery SQL, Custom SMTP, и др.).
11. **Первый следующий шаг:** дождаться применения `supabase/procurement-module.sql`, затем под owner-сессией добавить поставщика+точки и тестовую закупку, сверить суммы/аналитику.
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ FEATURES/DECISIONS/TODO при необходимости), `git status`, `npm run build` + `npm test`, коммит+пуш, старт GitHub Pages deploy (результат не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: Admin sidebar + модули Закупки/Поставщики/Аналитика — DONE (код), требует owner SQL apply
Expected modified files:
  - supabase/procurement-module.sql (new)
  - src/lib/money.js (new)
  - tests/money.test.mjs (new)
  - package.json
  - src/admin/procurement.js (new)
  - src/components/admin/ProcurementPanel.jsx (new)
  - src/components/admin/SuppliersPanel.jsx (new)
  - src/components/admin/AnalyticsPanel.jsx (new)
  - src/pages/AdminPage.jsx
  - src/App.jsx
  - src/styles/index.css
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DECISIONS.md, docs/TODO.md
Git status summary: рабочие изменения готовятся к commit+push этой сессией
Documentation updated: YES
Last verified build: OK (npm run build, 146 модулей, built ~3.1s)
Last verified tests: green (auth-recovery 13 + inactivity 8 + delivery 16 + money 14)
Recovery confidence: HIGH
```
