# LaVenta — Handoff

## Current Status

**A→Z QA-аудит production-магазина (regression pre-release).** Проведён многослойный аудит: статическая проверка кода/DB-контрактов (Layer 1), прогон автотестов (Layer 2), живой прогон production-витрины на mobile-вьюпорте (Layer 4, публичные маршруты). Кода продакшна НЕ менял — только зафиксирована 1 находка + документация. Все ранее сделанные фичи (sidebar/procurement/impersonation/delivery/promo/wheel/admin-гейт) сохранены.

**Итог:** PASS WITH ISSUES. Критичных/High-багов не найдено. Найдена и **ИСПРАВЛЕНА** 1 находка **LAV-BUG-060 (S3/P3, soft-404)**: catch-all `App.jsx` переведён на `NotFoundPage` (build+test зелёные, задеплоено).

**OWNER MANUAL live-валидация — ПЕРЕПРОВЕРЕНА Claude вживую (2026-08-22).** Важно: первичные owner-«pass» по 1–4 оказались недостоверными (owner подтверждал не проверяя) → Claude перепрогнал сценарии сам через owner-Chrome + admin-OTP. Реальные результаты:
- **1. Google OAuth** — PASS ЧАСТИЧНО (Claude): session persistence через reload ✅, залогинен как owner ✅, 0 console errors ✅. **Login-redirect / logout / repeat-login НЕ проверены** — нельзя автоматизировать Google-логин без пароля владельца, а logout разрушил бы owner-сессию, нужную для 3–4. Остаётся owner-manual.
- **2. Password recovery** — НЕ ПОДТВЕРЖДЁН. Claude не имеет доступа к inbox; более того, доставка email **нестабильна** (см. LAV-BUG-059: admin-OTP — тот же провайдер — со второй попытки НЕ пришёл). Полный флоу recovery остаётся owner-manual ПОСЛЕ настройки Custom SMTP.
- **3. Test order** — PASS ПОЛНОСТЬЮ (Claude вживую, реальный заказ EL-1039): cart (subtotal 147=49×3) ✅; promo negative (неверный код → «Belə promokod yoxdur») ✅; **delivery-формула** standard **Pulsuz** при 147≥100 + express **7₼** (=154) ✅; **ровно один заказ** (дабл-сабмита нет) ✅; **суммы в Admin точно совпали**: L·×3·147 ₼ + Экспресс 7 ₼ = итого 154 ₼ ✅.
- **4. Admin modules** — PASS ПОЛНОСТЬЮ (Claude вживую, все 9): Товары (коды 2001-2006) ✅; Заказы (+EL-1039) ✅; Промокоды (CEYHUN90 individual, User ID привязка) ✅; Колесо (Asia/Baku, окна, секторы) ✅; Пользователи (12/12) ✅; Закупки (грузится; закупок 0 → меню ⋯ вживую не на чем тестировать, покрыто popover 7/7) ✅; Поставщики (Donna Zara) ✅; **Аналитика — только закупки, БЕЗ sales** (явный дисклеймер «выручка заказов/реальная прибыль НЕ учитываются») ✅; Системные логи (+ audit USER_IMPERSONATION_ENDED) ✅.
- **5. Impersonation** — PASS полностью (Claude вживую, прошлый прогон): вход как A, реальные данные A, **checkout заблокирован**, выход с сохранением owner-сессии, **нет утечки A→B**, refresh не смешивает.
- **6. Wheel** — PASS частично: enabled=true, выигрываемы только активные [5,10,15,20,40,50], сектор **30% `active:false` исключён**; окно-гейт работает (вне окна колесо не показывается); admin-конфиг читается (Asia/Baku, окна, 24ч, 1 спин/окно). **Live spin + coupon prompt — PENDING по времени окна** (окна 10:00/13:00/16:55/02:00 Baku ±5мин).

Открытые OWNER ACTIONS: **Custom SMTP** (LAV-BUG-059, доставка email нестабильна — подтверждено); применить SQL `procurement-archive-delete.sql`, `procurement-product-flow.sql`, `procurement-module.sql`, `delivery-and-individual-promo.sql`, `fix-admin-owner.sql` (если ещё не применены).

**Артефакты тестов (на проде, тестовые):** (1) заказ **EL-1039** (express, 154 ₼, товар код 2002 ×3) создан Claude как реальный тест — можно удалить/оставить; (2) в корзине тестового `lv.live.1786796141` остался маркер «Zeytun Kətan Köynək Donu, M» (заказ не создавался). Оба безвредны.

## Current Branch
`main` (чисто; изменены только `docs/BUGS.md`, `docs/HANDOFF.md`, `docs/DAILY.md`).

## Last Completed Task
Полный QA-аудит A→Z. Проверено статически + автотестами + живым прогоном витрины. См. отчёт ниже.

## Files Changed
- `src/App.jsx` — импорт `NotFoundPage`; catch-all `<Route path="*">` переведён с `HomePage` на `NotFoundPage` (фикс LAV-BUG-060).
- `docs/BUGS.md` — `LAV-BUG-060` (soft-404) → FIXED.
- `docs/HANDOFF.md` — этот rewrite.
- `docs/DAILY.md` — запись за 2026-08-22.

## Что реально проверено (verified by me)
- **Build:** `npm run build` — ранее OK; **тесты:** `npm test` — зелёные (auth-recovery, inactivity, delivery 16/16, money 19/19, popover 7/7).
- **Секреты:** в `dist/` и `src/` нет `service_role`/SMTP/приватных ключей; во фронте только publishable anon-key (корректно).
- **Доставка:** client `src/lib/delivery.js` и server `public.delivery_fee` совпадают (standard <100→3₼, ≥100→0; express всегда 7₼; порог по товарам ПОСЛЕ скидки). Итог сервера авторитетен (place_order).
- **Промо:** server-enforced; индивидуальное промо привязано к `assigned_account_id` → `PROMO_ACCOUNT_MISMATCH`; клиент только preview; фиксация использования атомарна в place_order (row lock).
- **Изоляция аккаунтов (ShopContext):** owned-cache (accountId в ключе), session-токены + request-sequencing против A→B→A гонок; имперсонация не персистит чужие данные в localStorage owner; гость не имеет корзины/избранного.
- **Checkout:** дабл-сабмит защищён (`busy`+disabled); имперсонация блокирует place_order; unavailable-товар не отправляется; server повторно валидирует stock/size/promo.
- **Admin-гейт:** fail-closed (`isAdmin` по умолчанию false), серверная `is_admin()` — авторитет, не-owner → `NotFoundPage` ДО OTP и ДО загрузки admin-данных; OTP-слой повторно проверяет owner (assertOwner) даже против прямых DevTools-вызовов.
- **SPA-роутинг (LIVE):** deploy-workflow копирует `dist/index.html → dist/404.html`; прямой reload `/cart` рендерит корректную страницу; главная/каталог/товары грузятся; 0 JS-ошибок консоли; все RPC/REST — 200.
- **Витрина (LIVE mobile 390×844):** каталог рендерит товары, табы категорий, сортировки (дёшево↔дорого), фильтры; header/tabbar/footer без overflow.

## Known Issues / Risks
- **LAV-BUG-060 (S3/P3): ИСПРАВЛЕНО** — неизвестный URL витрины теперь → `NotFoundPage` (App.jsx catch-all). Требует деплоя + post-release проверки на проде.
- **Наблюдение (Low):** на главной `get_wheel_status` вызывается дважды подряд (вероятно два потребителя статуса) — безвредно (200), но лишний запрос.
- Флоу за owner/Google/admin/checkout-order — НЕ проверены живьём (нет сессии). См. OWNER MANUAL в отчёте.

## Verification Done
- `npm test` — зелёные. Live production storefront (public routes) — здоров. Диф — только docs.
- НЕ проверено живьём: auth/OAuth, password recovery inbox, checkout order creation, admin-модули, impersonation, procurement/suppliers/analytics UI, wheel spin. Помечено как OWNER MANUAL.

## Next Recommended Step
Владелец решает по LAV-BUG-060 (подключить `NotFoundPage` к `*` или оставить soft-404 на Главную). Параллельно — применить открытые SQL owner-actions и Custom SMTP. После — прогнать OWNER MANUAL чек-лист (auth/checkout/admin/impersonation/procurement).

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию sidebar/procurement/impersonation/delivery/promo/wheel/admin-гейт. Claude — главный инженер. Кода продакшна аудит НЕ менял.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260822-074000

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite магазин одежды на GitHub Pages (base `/elva-laventa/`, BrowserRouter) + Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** проведён A→Z QA-аудит. Найдена и исправлена 1 находка S3/P3 (soft-404, LAV-BUG-060 → `NotFoundPage` в catch-all `App.jsx`). `npm run build` OK (5.15s), `npm test` зелёные. Критичных багов нет. Больше production-код не менялся.
4. **Что реализовано (ранее):** delivery (100/3/7, 3 cal.days), индивид. промо по User ID, procurement lifecycle+архив/удаление, sidebar+модули, impersonation, wheel, admin owner hardening. В этой сессии — только аудит + документация.
5. **Что сделано в последней задаче:** статическая проверка бизнес-логики (delivery/promo/money/cart-isolation/checkout/admin-гейт/секреты), прогон автотестов, живой прогон витрины (mobile) на production. Зафиксирован LAV-BUG-060.
6. **Изменённые файлы:** `docs/BUGS.md`, `docs/HANDOFF.md`, `docs/DAILY.md`. Production-код не тронут.
7. **Выполненные проверки:** `npm test` зелёные; live storefront public routes здоров (0 console errors, RPC/REST 200, SPA-fallback работает); секретов в бандле нет; изоляция аккаунтов и server-side delivery/promo/admin-гейт — корректны статически. НЕ проверено живьём: auth/OAuth, password-recovery inbox, order creation, admin-модули, impersonation, procurement/suppliers/analytics UI, wheel spin (нет owner-сессии).
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; service_role НИКОГДА во фронте; procurement/suppliers/аналитика/архив/удаление — только is_admin; сервер — source of truth для delivery/discount/stock/hard-delete; архив НЕ убирает закупку из исторической аналитики; не ослаблять RLS; не трогать is_admin/OTP/404/impersonation/promos/wheel/orders/delivery/OAuth/storefront без задачи; один пуш на таск.
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** решение владельца по LAV-BUG-060; применить открытые SQL (`procurement-archive-delete.sql`, `procurement-product-flow.sql`, `procurement-module.sql`, `delivery-and-individual-promo.sql`, `fix-admin-owner.sql`); Custom SMTP; прогнать OWNER MANUAL (auth/checkout/admin/impersonation/procurement/wheel).
11. **Первый следующий шаг:** подтвердить с владельцем поведение 404 (NotFoundPage vs soft-404 на Главную); при «применить» — заменить `App.jsx:168` catch-all на `<NotFoundPage/>` + импорт, build+test, commit+push.
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ BUGS/DAILY при изменениях), `git status`, `npm run build`+`npm test`, коммит+пуш, старт GitHub Pages deploy (не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: A→Z QA-аудит — DONE (verified layers 1/2/4). LAV-BUG-060 (S3/P3, soft-404) исправлен: catch-all App.jsx → NotFoundPage.
Expected modified files:
  - src/App.jsx (catch-all → NotFoundPage)
  - docs/BUGS.md (LAV-BUG-060 → FIXED)
  - docs/HANDOFF.md
  - docs/DAILY.md
Git status summary: src/App.jsx + docs; готово к commit+push
Documentation updated: YES
Last verified build: OK (npm run build, built 5.15s)
Last verified tests: green (auth-recovery, inactivity, delivery 16/16, money 19/19, popover 7/7)
Recovery confidence: HIGH
```
