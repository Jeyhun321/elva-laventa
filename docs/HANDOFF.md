# LaVenta — Handoff

## Current Status

**Task complete (код + build + тесты зелёные): UI-fix модуля Admin → Закупки — dropdown действий строки (⋯) больше не обрезается таблицей.** Чисто UI/UX, backend НЕ тронут. Поверх ранее сделанного «Закупки — Архив/Восстановление/Безопасное удаление (F-019)».

Открытый OWNER ACTION (из прошлой задачи, всё ещё нужен): применить `supabase/procurement-archive-delete.sql` (после `procurement-module.sql` + `procurement-product-flow.sql`) — иначе физическое **Удаление** покажет понятную ошибку; Архив/Восстановление работают через fallback. Прочие owner-actions в TODO: `procurement-product-flow.sql`, `procurement-module.sql`, `delivery-and-individual-promo.sql`, Custom SMTP.

## Current Branch
`main`.

## Last Completed Task

**Fix: меню действий закупки (⋯) обрезалось overflow-контейнером таблицы.**

- **Root cause:** `.proc-menu-list` был `position:absolute` внутри ячейки таблицы (clipping ancestor с overflow) → нижние пункты меню, включая «Удалить», скрывались, появлялся внутренний скролл.
- **Устранение clipping:** список действий рендерится в **портал** (`createPortal` → `document.body`) с `position:fixed` и координатами из чистой функции `src/lib/popover.js` → `popoverPosition({btn, viewport, menuW, menuH})`. Портал вне любого overflow-предка, поэтому не обрезается и не создаёт horizontal scroll.
- **Positioning:** правым краем меню выравнивается по кнопке ⋯; если снизу мало места, а сверху больше — **авто-флип вверх** (`placeUp`); клэмп по правому/левому/нижнему/верхнему краю viewport (отступ 8px); `z-index:1200`; `max-height:calc(100vh-16px)` + внутренний скролл только как крайняя защита. Пересчёт на `scroll` (capture — любой скролл-контейнер) и `resize`, пока меню открыто.
- **Interaction:** клик по ⋯ → toggle; клик вне (btn+menu) → закрыть; `Esc` → закрыть; выбор действия → закрыть; смена фильтра/страницы = mousedown вне → закрывает (stale-меню не остаётся).
- **Меню (без изменений состава):** активная несвязанная — Изменить / Добавить в Товары / Архивировать / Удалить; связанная — Изменить / Открыть товар / Архивировать / Удалить; архивная — Изменить / Восстановить / Удалить (без «Добавить в Товары» до восстановления). «Удалить» — последний пункт, danger-стиль. Confirmation-модалка и серверные delete-правила НЕ менялись.

## Files Changed
- `src/lib/popover.js` (new) — чистая `popoverPosition` (viewport-aware, флип/клэмп), без DOM → юнит-тестируема.
- `src/components/admin/ProcurementPanel.jsx` — `RowMenu` переведён на портал: `btnRef`/`menuRef`, `useLayoutEffect` первичный расчёт, listeners (mousedown/keydown Esc/resize/scroll-capture), `createPortal`.
- `src/styles/index.css` — `.proc-menu-list` без `position:absolute` (inline fixed), `z-index:1200`, `width:200px`, `max-height`+`overflow-y`; удалено мобильное `right:0`.
- `tests/popover.test.mjs` (new, 7 кейсов) + `package.json` (добавлен в `test`).

## Current Architecture Notes
- Меню действий строки — portal-popover: единственный источник позиции = `popoverPosition` (pure). UI-слой только читает `getBoundingClientRect()` и вешает listeners.
- Backend Закупок без изменений: `archive_/restore_/delete_procurement` RPC (SECURITY DEFINER + is_admin), `procurement_analytics` (включает архив), product transfer, RLS — как в прошлой задаче.
- Порядок миграций (не менялся): `procurement-module.sql` → `procurement-product-flow.sql` → `procurement-archive-delete.sql`.

## Known Issues / Risks
- Живой admin-прогон меню под owner (OTP/Google) — вне окружения; логика позиционирования покрыта юнит-тестами (top→вниз, bottom→вверх, right-edge, narrow, vertical clamp, mobile), но визуальный прогон на устройстве за владельцем.
- `procurement-archive-delete.sql` всё ещё НЕ применён (owner action) — без него физическое Удаление недоступно (понятная ошибка), Архив/Восстановление — через fallback без серверного аудита delete.

## Verification Done
- `npm run build` — OK (~2.72s).
- `npm test` — зелёные: auth-recovery + inactivity + delivery 16/16 + money 19/19 + **popover 7/7**.
- Диф вычитан: только UI-файлы + тест + package.json; DB/RPC/SQL не тронуты.

## Next Recommended Step
Владелец (после применения `procurement-archive-delete.sql`) под owner-сессией: открыть Закупки, у верхней строки ⋯ → меню полностью видно (вниз); у нижней строки/на mobile → меню открывается вверх и целиком; «Удалить» всегда доступно; клик вне и Esc закрывают; проверить Archive/Restore/Delete/Add-to-Products/Open-Product/Edit и фильтры Активные/Архив/Все.

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию sidebar/procurement/impersonation/delivery/promo/wheel. Claude — главный инженер.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260822-040704

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite магазин одежды на GitHub Pages (base `/elva-laventa/`) + Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** завершён точечный UI-fix: меню действий строки (⋯) в Admin → Закупки больше не обрезается overflow таблицы (переведено на портал). Код готов, build OK, тесты зелёные (+popover 7/7). Backend не тронут. Открыт прежний owner action — применить `supabase/procurement-archive-delete.sql`.
4. **Что реализовано (этот таск):** dropdown действий закупки рендерится в портал (`createPortal` → `document.body`, `position:fixed`), позицию считает чистая `src/lib/popover.js` → `popoverPosition` (правое выравнивание по кнопке, авто-флип вверх при нехватке места снизу, клэмп по краям viewport, пересчёт на scroll-capture/resize). Закрытие: клик по ⋯ toggle / клик вне / Esc / выбор действия. Состав меню и серверные правила не менялись; «Удалить» — последний, danger. Ранее: Закупки Архив/Восстановление/Удаление (F-019), Procurement-first lifecycle (F-018), sidebar+модули (F-017), доставка (F-015), промо по User ID (F-016), impersonation (DONE), wheel (F-011/F-012).
5. **Что сделано в последней задаче:** см. Last Completed Task и Files Changed выше.
6. **Изменённые файлы:** `src/lib/popover.js` (new), `src/components/admin/ProcurementPanel.jsx`, `src/styles/index.css`, `tests/popover.test.mjs` (new), `package.json`, docs (HANDOFF/FEATURES/DAILY).
7. **Выполненные проверки:** `npm run build` OK; `npm test` зелёные (delivery 16/16, money 19/19, popover 7/7); диф вычитан — только UI+тест; DB/RPC/SQL не тронуты. Живой admin-UI прогон под owner — owner-manual.
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; service_role НИКОГДА во фронте; procurement/suppliers/аналитика/архив/удаление — только is_admin; сервер — source of truth для hard delete (фронт не решает); архив НЕ убирает закупку из исторической аналитики; не ослаблять RLS; не трогать is_admin/OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront; не менять DB/RPC/SQL, если проблема чисто UI; один пуш на таск.
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** владелец применяет `supabase/procurement-archive-delete.sql`; затем живой прогон меню (top→вниз, bottom/mobile→вверх, Удалить доступно, клик-вне/Esc закрывают) + Archive/Restore/Delete/Add-to-Products/Open-Product/Edit/фильтры. Прочие owner-actions (`procurement-product-flow.sql`, `procurement-module.sql`, SMTP). Будущее: Sales Analytics; числовые зависимости в delete при появлении inventory/sales.
11. **Первый следующий шаг:** под owner-сессией открыть Закупки и проверить, что меню ⋯ у верхней и нижней строк (и на mobile) видно полностью и «Удалить» доступно; параллельно применить `procurement-archive-delete.sql`, если ещё не применён.
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ FEATURES/DAILY/TODO), `git status`, `npm run build` + `npm test`, коммит+пуш, старт GitHub Pages deploy (не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: UI-fix — меню действий закупки (⋯) через портал, не обрезается таблицей — DONE (код). Открыт owner SQL apply из прошлой задачи.
Expected modified files:
  - src/lib/popover.js (new)
  - src/components/admin/ProcurementPanel.jsx
  - src/styles/index.css
  - tests/popover.test.mjs (new)
  - package.json
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DAILY.md
Git status summary: рабочие изменения готовятся к commit+push этой сессией
Documentation updated: YES
Last verified build: OK (npm run build, built ~2.72s)
Last verified tests: green (delivery 16/16, money 19/19, popover 7/7)
Recovery confidence: HIGH
```
