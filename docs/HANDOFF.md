# LaVenta — Handoff

## Current Status

LAV-BUG-016 и LAV-BUG-017 реализованы в рабочем дереве. Изменения не закоммичены, не запушены и не задеплоены. Последний подтверждённый deployed commit: `792e10b`.

## Current Branch

`main`

## Last Completed Task

- **LAV-BUG-016:** stale dynamic-import ошибка после нового Vite deploy больше не оставляет белый экран. `src/lib/recovery.js` определяет типовые ошибки чанков, делает один reload максимум за 30 секунд и журналирует повторные попытки. `ErrorBoundary` защищает маршруты; неклассифицированные ошибки получают локализованный fallback и записываются в system log.
- **LAV-BUG-017:** после `setDone(order)` CheckoutPage запускает единственный трёхсекундный таймер с cleanup и заменяющей навигацией на `/`. CTA в каталог остаётся мгновенным.
- Добавлены AZ/RU/EN ключи fallback. В `docs/BUGS.md` заведены оба подтверждённых бага со статусом `FIXED` и только Fix Verification checklist.

## Files Changed

- `src/lib/recovery.js` — новый guarded stale-chunk recovery.
- `src/components/ErrorBoundary.jsx` — новый route error boundary и fallback.
- `src/App.jsx` — lazy-маршруты используют retry helper, Routes обёрнуты boundary.
- `src/main.jsx` — глобальная подписка recovery до render.
- `src/pages/CheckoutPage.jsx` — redirect через 3 секунды с cleanup.
- `src/i18n/translations.js` — recovery тексты AZ/RU/EN.
- `docs/BUGS.md`, `docs/HANDOFF.md`.

## Current Architecture Notes

- `sessionStorage['lav_chunk_reload_at']` ограничивает auto-reload stale чанка 30 секундами. Это не reload при возвращении вкладки и не затрагивает обычные ошибки.
- Системное логирование best-effort: отсутствие сессии или ошибка лога не блокируют recovery/fallback.
- Существующие `SystemLogReporter`, CTA `continue_shopping` и scroll-to-top экрана подтверждения сохранены.

## Checks Performed

- `git diff --check` — успешно.
- `npm run build` (`vite build`) — успешно: 120 modules transformed.
- В package.json нет lint или test script.
- Live browser/Fix Verification на mobile и desktop — NOT VERIFIED. Реальный заказ и искусственная stale-chunk ошибка не выполнялись.

## Known Issues / Risks

- LAV-BUG-016/017 требуют owner Fix Verification в production; до deploy статус не может быть `READY FOR QA`.
- В дереве присутствует параллельная незакоммиченная работа: `.codex/hooks.json`, удаления корневых historical docs и untracked инструкции/документация. Не смешивать с этой задачей.
- Ручные действия владельца из предыдущей работы остаются: применить `supabase/fix-order-any-auth.sql`, выключить Confirm email в Supabase, проверить email-order и favorites A→B→A на реальных аккаунтах.

## Next Recommended Step

Проверить только Fix Verification LAV-BUG-016/017 на mobile и desktop. Затем отдельно подготовить и ревьюировать коммит, не включая параллельные файлы; push/deploy выполнять только по явному подтверждению владельца.

## Context For Next Session

Последний коммит: `792e10b fix(checkout): correct CTA + scroll-to-top on order confirmation`.

### RECOVERY PROMPT FOR CODEX

1. Проект: Elva LaVenta — React/Vite storefront с Supabase и GitHub Pages.
2. Текущая задача завершена в working tree: LAV-BUG-016 (stale Vite chunks / белый экран) и LAV-BUG-017 (автовозврат после заказа).
3. Изменения этой задачи: `src/lib/recovery.js` (new), `src/components/ErrorBoundary.jsx` (new), `src/App.jsx`, `src/main.jsx`, `src/i18n/translations.js`, `src/pages/CheckoutPage.jsx`, `docs/BUGS.md`, `docs/HANDOFF.md`.
4. Реализация LAV-BUG-016: `lazyWithRetry`, global `error`/`unhandledrejection`, ErrorBoundary; только stale-chunk ошибки reload, guard — `sessionStorage['lav_chunk_reload_at']` + 30 секунд. Non-chunk errors логируются и показывают i18n fallback.
5. Реализация LAV-BUG-017: effect на `[done, navigate]`, `setTimeout(..., 3000)`, cleanup. CTA `/catalog` и scroll-to-top не изменены.
6. Проверки: `git diff --check` и `npm run build` успешны (120 modules). Автотестов/lint scripts нет. Live mobile/desktop, реальный заказ и stale-chunk scenario — NOT VERIFIED.
7. Git: `main`, последний commit `792e10b`. Эта задача НЕ закоммичена/НЕ запушена/НЕ задеплоена. В дереве есть параллельные файлы — не добавлять их в commit.
8. Следующий шаг: owner Fix Verification LAV-BUG-016/017 в production после безопасного deploy; затем по явной команде создать узкий commit только для этой задачи и отправить в `main`.

### SESSION CHECKSUM

- Branch: `main`
- Last commit: `792e10b`
- Task state: implementation complete, local build verified; deployment and live QA NOT VERIFIED.
- Expected task files: `src/lib/recovery.js`, `src/components/ErrorBoundary.jsx`, `src/App.jsx`, `src/main.jsx`, `src/i18n/translations.js`, `src/pages/CheckoutPage.jsx`, `docs/BUGS.md`, `docs/HANDOFF.md`.
- Parallel changes must be preserved and excluded from this task's commit.
