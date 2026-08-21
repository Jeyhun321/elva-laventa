# LaVenta — Handoff

## Current Status

**Task complete (код + build + тесты зелёные): Закупки — Архив / Восстановление / Безопасное удаление (F-019).** Точечное улучшение модуля Admin → Закупки поверх ранее сделанного Procurement-first flow. Требуется ручное действие владельца — применить `supabase/procurement-archive-delete.sql` (после `procurement-module.sql` + `procurement-product-flow.sql`). До применения: физическое **Удаление** покажет понятную ошибку («выполните procurement-archive-delete.sql»); Архив и Восстановление продолжают работать через безопасный fallback (прямой update), но без серверного аудита delete.

Прежние owner-actions в силе (TODO): `procurement-product-flow.sql`, `procurement-module.sql`, `delivery-and-individual-promo.sql`, Custom SMTP для password-reset.

## Current Branch
`main`.

## Last Completed Task

**Закупки: отдельное действие «Удалить» + понятный жизненный цикл Архива.**

**1) Архив (soft-delete).** «Архивировать» помечает запись `archived=true` (+ `archived_at`/`archived_by`), она исчезает из активного списка, но полностью сохраняет историю (поставщик, SKU, фото, варианты, закуп. цена, количество, связь с товаром, timestamps). Убран браузерный `confirm()` перед архивацией — архив нидеструктивен.

**2) Просмотр архива.** Фильтр-переключатель **Активные / Архив / Все** со счётчиками (по умолчанию Активные). Панель грузит весь период (`archived:'all'`) и делит в памяти: карточки/история считают все записи, таблица — по режиму. Архивная строка помечена badge **«В архиве»**; «Добавить в Товары» в архиве скрыт (сначала Восстановить).

**3) Восстановление.** «Восстановить» → `archived=false`, запись снова в Активных, тот же UUID, связи/данные не пересоздаются.

**4) Удаление (hard delete).** Отдельное destructive-действие с модалкой проекта (`.admin-modal`, не браузерный confirm). **Сервер — source of truth:** RPC сам проверяет зависимости. Несвязанную закупку (`product_id IS NULL`) owner удаляет физически; связанную с товаром сервер отклоняет (`PROCUREMENT_LINKED`) → UI: «Эта закупка уже связана с товаром и не может быть удалена. Переместите её в архив.» + кнопка «В архив». Фронт НЕ решает `if(!product_id)delete` — только вызывает RPC.

**5) Overflow-меню ⋯.** Действия строки (Изменить / Открыть товар | Добавить в Товары / Архивировать | Восстановить / Удалить) собраны в компактное меню, чтобы не перегружать таблицу; «Удалить» — danger-стиль. Удобно на мобильном.

**6) Аналитика — историчность.** `procurement_analytics` теперь ВКЛЮЧАЕТ архивные закупки (архив = UI-lifecycle, не отмена факта закупки) → исторические суммы не обнуляются при архивации. Активный список/счётчик считают только `archived=false`. Из истории исчезают только реально удалённые записи.

## Files Changed
- `supabase/procurement-archive-delete.sql` (new) — `procurements.archived_at/archived_by`; RPC `archive_procurement`/`restore_procurement`/`delete_procurement` (SECURITY DEFINER + `is_admin`, row lock, аудит `log_system_event` в той же транзакции, для delete — ДО удаления); `procurement_analytics` включает архивные закупки. Идемпотентно/аддитивно.
- `src/admin/procurement.js` — `listProcurements` фильтр `archived: 'active'|'archived'|'all'`; `restoreProcurement`, `deleteProcurement` (RPC-only, маппинг `PROCUREMENT_LINKED`/`DELETE_RPC_MISSING`); `archiveProcurement` RPC-first с fallback на update.
- `src/components/admin/ProcurementPanel.jsx` — view-фильтр со счётчиками, `RowMenu` (⋯), badge «В архиве», delete-confirm модалка (linked → предложить архив), restore.
- `src/components/admin/AnalyticsPanel.jsx`, `src/components/admin/SuppliersPanel.jsx` — `listProcurements({archived:'all'})` (история включает архив).
- `src/styles/index.css` — `proc-badge-archived`, `proc-menu`, `btn-danger`, `proc-confirm`.
- docs: FEATURES (F-019), DAILY (2026-08-22), TODO, HANDOFF.

## Current Architecture Notes
- Закупка: `archived boolean not null default false` (в `procurement-module.sql`), теперь + `archived_at`/`archived_by`. Soft-delete = архив; hard-delete физически удаляет строку.
- Мутации архива/удаления — server RPC (SECURITY DEFINER + `is_admin`), owner-only. Frontend delete идёт ТОЛЬКО через RPC (не «тихий» прямой delete). Архив/restore имеют fallback на прямой update (RLS is_admin всё равно защищает) на случай непринятой миграции.
- `log_system_event(level, source, event, message, details, path)` — 6 арг; аудит delete записывается ДО `delete from` в одной транзакции.
- Порядок миграций: `procurement-module.sql` → `procurement-product-flow.sql` → `procurement-archive-delete.sql` (последняя переопределяет `procurement_analytics`, сохраняя ту же JSON-форму, но включая архив).

## Known Issues / Risks
- Пока `procurement-archive-delete.sql` НЕ применён: физическое Удаление недоступно (RPC отсутствует → `DELETE_RPC_MISSING`, понятная ошибка); Архив/Восстановление работают через fallback, но без серверного аудита `PROCUREMENT_ARCHIVED/RESTORED`.
- Будущие зависимости (inventory/sales references) в `delete_procurement` пока не проверяются (только `product_id`) — оставлено место в коде; при появлении числового склада/продаж дополнить проверку.
- Живой owner-прогон (Archive/Restore/Delete под owner-OTP/Google, RLS deny для обычного/anon) — owner-manual: среда не проходит owner-аутентификацию и не применяет SQL.

## Verification Done
- `npm run build` — OK (built ~2.65s).
- `npm test` — зелёные: delivery 16/16, money 19/19 (плюс auth-recovery/inactivity в общем прогоне).
- SQL вычитан: сигнатуры (`log_system_event` 6-арг, `archived`/`product_code`/`product_name`/`purchase_total`/`expected_*`/`margin_percent` существуют в `procurement-module.sql`), JSON-форма `procurement_analytics` совпадает с предыдущей версией. Идемпотентен/аддитивен; НЕ применён из окружения → owner action.

## Next Recommended Step
Владелец применяет `supabase/procurement-archive-delete.sql`, затем под owner-сессией: Archive A → исчезла из Активных, есть в Архиве с badge, история цела, аналитика не обнулилась; Restore A → снова Активна, тот же UUID; Safe delete B (без товара) → confirm → физически удалена, аудит есть; Protected delete C (связана с товаром) → сервер отклонил, UI предложил архив; RLS: обычный/anon → denied, owner → allowed.

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию sidebar/procurement/impersonation/delivery/promo/wheel. Claude — главный инженер.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260822-034344

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite магазин одежды на GitHub Pages (base `/elva-laventa/`) + Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** завершён таск «Закупки — Архив / Восстановление / Безопасное удаление (F-019)» поверх Procurement-first flow. Код готов, build OK, тесты зелёные. Требуется ОДНО действие владельца — применить `supabase/procurement-archive-delete.sql`. До применения физическое Удаление недоступно (понятная ошибка), Архив/Восстановление работают через fallback.
4. **Что реализовано (этот таск):** отдельное действие Удалить + жизненный цикл Архива в модуле Закупки. Архив = soft-delete (`archived=true` + `archived_at/by`, история цела). Фильтр Активные/Архив/Все со счётчиками (по умолч. Активные), badge «В архиве», overflow-меню ⋯ для действий строки. Восстановление (`archived=false`, тот же UUID, связи не пересоздаются). Hard delete через модалку проекта: сервер source of truth — несвязанную удаляет физически, связанную с товаром отклоняет (`PROCUREMENT_LINKED`, UI предлагает архив). RPC `archive_/restore_/delete_procurement` (SECURITY DEFINER + is_admin, аудит в той же транзакции, для delete ДО удаления). `procurement_analytics` включает архивные закупки (историю не теряем). Ранее: Procurement-first product lifecycle (F-018), sidebar+модули (F-017), доставка (F-015), промо по User ID (F-016), impersonation (DONE), wheel-config (F-011/F-012).
5. **Что сделано в последней задаче:** см. Last Completed Task и Files Changed выше.
6. **Изменённые файлы:** `supabase/procurement-archive-delete.sql` (new), `src/admin/procurement.js`, `src/components/admin/ProcurementPanel.jsx`, `src/components/admin/AnalyticsPanel.jsx`, `src/components/admin/SuppliersPanel.jsx`, `src/styles/index.css`, docs (HANDOFF/FEATURES/DAILY/TODO).
7. **Выполненные проверки:** `npm run build` OK; `npm test` зелёные (delivery 16/16, money 19/19); SQL вычитан (сигнатуры/JSON-форма совпадают), идемпотентен/аддитивен; НЕ применён из окружения; owner-UI прогон — owner-manual.
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; service_role НИКОГДА во фронте; procurement/suppliers/аналитика/архив/удаление — только is_admin; фронт НЕ решает возможность удаления (сервер source of truth), связанную с товаром закупку физически НЕ удалять; архив НЕ должен убирать закупку из исторической аналитики; не ослаблять RLS; не трогать is_admin/OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront; один пуш на таск.
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** владелец применяет `supabase/procurement-archive-delete.sql`; затем живой прогон Archive/Restore/Safe-delete/Protected-delete + RLS deny. Прежние owner-actions (`procurement-product-flow.sql`, `procurement-module.sql`, SMTP). Будущее: числовые зависимости в `delete_procurement` при появлении inventory/sales; Sales Analytics.
11. **Первый следующий шаг:** дождаться применения `supabase/procurement-archive-delete.sql`, затем под owner-сессией прогнать Archive→Restore→Safe delete→Protected delete и проверку RLS (обычный/anon → denied).
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ FEATURES/DAILY/TODO), `git status`, `npm run build` + `npm test`, коммит+пуш, старт GitHub Pages deploy (не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: Закупки — Архив/Восстановление/Безопасное удаление (F-019) — DONE (код), требует owner SQL apply
Expected modified files:
  - supabase/procurement-archive-delete.sql (new)
  - src/admin/procurement.js
  - src/components/admin/ProcurementPanel.jsx
  - src/components/admin/AnalyticsPanel.jsx
  - src/components/admin/SuppliersPanel.jsx
  - src/styles/index.css
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DAILY.md, docs/TODO.md
Git status summary: рабочие изменения готовятся к commit+push этой сессией
Documentation updated: YES
Last verified build: OK (npm run build, built ~2.65s)
Last verified tests: green (delivery 16/16, money 19/19)
Recovery confidence: HIGH
```
