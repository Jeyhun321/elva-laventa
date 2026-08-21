# LaVenta — Handoff

## Current Status

**Task complete (код + build + тесты зелёные): новая логика доставки + индивидуальный промокод по User ID.** Требуется одно ручное действие владельца — применить `supabase/delivery-and-individual-promo.sql` (идемпотентно). До применения checkout НЕ ломается (фронт откатывается к 8-арг `place_order`), но доставка не сохраняется в БД и поиск пользователя по User ID в админке не работает.

Ранее (не тронуто этим таском, остаётся в силе):
- **Task 3 impersonation — DONE ✅** (принято владельцем, `supabase/admin-impersonation.sql` применён). Не менять.
- **Password reset (LAV-BUG-059):** код корректен; **OWNER ACTION** — включить Custom SMTP + проверить Site URL/Redirect URLs в Supabase Dashboard (встроенный email-провайдер не доставляет). См. BUGS.
- Прочие owner-SQL из TODO (fix-admin-owner, promo-validate-fix, admin-users-module, fix-order-any-auth) — по списку TODO.

## Current Branch
`main`.

## Last Completed Task
Два блока изменений одним таском:

**1) Новая логика доставки (F-015, D-008).**
- Единый источник истины `src/lib/delivery.js`: `getDeliveryPrice(subtotalAfterDiscount, type)`.
  - **Standard:** товары после скидки ≥ 100 ₼ → 0 ₼ (бесплатно), < 100 ₼ → 3 ₼.
  - **Express:** всегда 7 ₼ (бесплатная доставка от 100 ₼ на express НЕ распространяется).
  - Порог 100 ₼ — по стоимости ТОВАРОВ после скидки/промокода (доставка в порог не входит).
  - ETA стандарта: «в течение 3 календарных дней» (AZ `3 gün ərzində` / RU `В течение 3 дней` / EN `Within 3 days`) — слово «рабочих/business/iş günü» удалено.
- Checkout (`CheckoutPage.jsx`): цена доставки из `getDeliveryPrice`; итог = (товары − скидка) + доставка; карточки standard/express показывают актуальную цену; сводка Товары/Скидка/Доставка/Итого.
- Персистентность: сервер (`place_order` 9-арг + `public.delivery_fee`) считает доставку авторитетно и пишет `delivery_type/delivery_fee/total`. Клиент шлёт только `p_delivery_type`. `orders.js` вызывает 9-арг и при отсутствии сигнатуры (PGRST202, до применения SQL) откатывается к 8-арг (доставка в note) — checkout не ломается.
- Admin → Orders (`AdminPage.jsx`): показывает тип/стоимость доставки и скидку.
- Info-блоки: товарный бейдж `badge_free_delivery` переформулирован в честный «Бесплатно от 100 ₼» (было «Pulsuz çatdırılma»); `promos.js` free-delivery subtitle 50 → 100 ₼. Marquee `m_free_delivery` уже был «от 100 ₼».
- Исторические заказы НЕ переписываются.

**2) Индивидуальный промокод по User ID + User ID в профиле (F-016).**
- Профиль: `SettingsPage.jsx` → блок «Мой аккаунт» показывает **User ID** (реальный Supabase Auth UUID `profile.id`, read-only, кнопка «Копировать» → полный UUID, feedback «ID скопирован»). i18n AZ/RU/EN, mobile-first (UUID переносится, не ломает ширину).
- Admin → Промокоды (`AdminPage.jsx` PromoPanel): для типа «Персональный» — поле «User ID» + «Найти» → `admin_find_user` (is_admin-gated) находит пользователя, показывает имя/email/User ID для подтверждения перед сохранением; промокод привязывается к target UUID. В списке промо у индивидуальных показан User ID. Прежний dropdown клиентов из заказов сохранён как альтернатива.
- Принадлежность промокода проверяется server-side (`_validate_promo`: `type='individual' AND assigned_account_id = auth.uid()`) — чужой пользователь с тем же кодом получает `PROMO_ACCOUNT_MISMATCH`. Клиентская UUID-проверка — только UX; сервер бросает `INVALID_USER_ID`/`USER_NOT_FOUND`.

## Files Changed
- `src/lib/delivery.js` (new) — единый расчёт доставки.
- `tests/delivery.test.mjs` (new, 16 тестов) + `package.json` (добавлен в `npm test`).
- `src/pages/CheckoutPage.jsx` — доставка через `getDeliveryPrice`, порог после скидки, `deliveryType` в `createOrder`, удалён локальный `EXPRESS_FEE=5`.
- `src/lib/orders.js` — `createOrder({deliveryType})`, 9-арг `place_order` + graceful fallback к 8-арг.
- `src/pages/SettingsPage.jsx` — account-card + User ID + copy (`UserIdRow`).
- `src/pages/AdminPage.jsx` — PromoPanel: lookup по User ID + preview; Orders: строки доставки/скидки; импорт `findUserById/isUuid`.
- `src/admin/db.js` — `findUserById`, `isUuid`.
- `src/i18n/translations.js` — `delivery_standard_time` (кал. дни), `badge_free_delivery`, `profile_user_id/_id_copy/_id_copied/_id_hint`.
- `src/data/promos.js` — free-delivery subtitle 100 ₼.
- `src/styles/index.css` — `.account-card/.account-userid`, `.promo-assign/.promo-found/.promo-userid`, `.order-row-meta`.
- `supabase/delivery-and-individual-promo.sql` (new) — `orders.delivery_type/delivery_fee`, `public.delivery_fee`, `recalc_order_total` (+доставка), `place_order` 9-арг (+8-арг shim), `admin_find_user`.
- docs: FEATURES (F-015/F-016), DECISIONS (D-008), TODO, HANDOFF.

## Current Architecture Notes
- GH Pages SPA, base `/elva-laventa/`, BrowserRouter basename, `404.html=index.html`.
- Единая Supabase auth-сессия (`adminSupabase = supabase`). Admin-права — только `is_admin()` (owner UUID alekberov + role + email).
- Скидки/доставка/промо — server-trusted через SECURITY DEFINER RPC; клиент считает только для показа.
- `place_order`: 7-/8-/9-арг сосуществуют (обратная совместимость); клиент вызывает 9-арг.

## Known Issues / Risks
- Пока `supabase/delivery-and-individual-promo.sql` НЕ применён: доставка не пишется в заказ (в note, через 8-арг fallback), Admin→Orders покажет «Стандарт · бесплатно» для новых заказов, кнопка «Найти» по User ID вернёт ошибку. После применения — всё корректно.
- Клиент и сервер держат одинаковую формулу доставки (100/3/7) — при изменении править ОБА места (`src/lib/delivery.js` и `public.delivery_fee`); авторитет — сервер.
- Живой e2e (реальный заказ + персональный промо) требует owner/Google-сессии — выполняет владелец после применения SQL.

## Verification Done
- `npm run build` — OK (141 модуль).
- `npm test` — 37/37 (auth-recovery 13 + inactivity 8 + delivery 16).
- Проверка формулы доставки (unit): пороги 0/99/99.99/100/100.01/150, express 20/99/100/500, промо-порог 105→95→3 / 110→105→free / 100→99→3, safe NaN/negative.
- SQL написан идемпотентно, синтаксис вычитан; НЕ применён из окружения (нет production-доступа) → owner action.
- Живая проверка под owner/Google — НЕ выполнялась (требует сессии владельца).

## Next Recommended Step
Владелец применяет `supabase/delivery-and-individual-promo.sql` (Supabase → SQL Editor → Run), затем: тестовый заказ (проверить `delivery_type/delivery_fee/total` в Admin→Orders), создание персонального промо по User ID и проверка отказа для чужого аккаунта.

## Context For Next Session
Читать только этот HANDOFF + `git log -3` + `git status`. Не переписывать рабочую реализацию impersonation/admin-security. Claude — главный инженер.

---

## RECOVERY PROMPT FOR CODEX

Recovery ID: R-20260821-194740

1. **Название проекта:** Elva LaVenta (Website-LaVenta).
2. **Описание:** моб-first React/Vite интернет-магазин одежды на GitHub Pages (base `/elva-laventa/`, `https://jeyhun321.github.io/elva-laventa/`) с backend Supabase (auth Google+email, RLS, SECURITY DEFINER RPC). Русскоязычный владелец; единственный admin-owner — `alekberov.ceyhun2002@gmail.com`.
3. **Текущее состояние:** только что завершён таск «новая логика доставки + индивидуальный промокод по User ID». Код готов, `npm run build` OK, `npm test` 37/37. Требуется ОДНО действие владельца — применить `supabase/delivery-and-individual-promo.sql`. До применения checkout работает (фронт откатывается к 8-арг `place_order`), но доставка не пишется в БД и поиск по User ID в админке не работает.
4. **Что реализовано (этот таск):** единый расчёт доставки `src/lib/delivery.js` (standard: ≥100₼ бесплатно, иначе 3₼; express всегда 7₼; порог по товарам ПОСЛЕ скидки; ETA «3 календарных дня»); персистентность доставки в заказе через 9-арг `place_order` + `public.delivery_fee`; Admin→Orders показывает доставку/скидку; User ID (Supabase UUID) в профиле `SettingsPage` (read-only + copy); привязка индивидуального промо по User ID в Admin→Промокоды через `admin_find_user` (is_admin-gated) с подтверждением найденного пользователя. Ранее: единый promo/wheel-движок, impersonation (DONE), admin-security (is_admin + owner UUID), fullscreen 404 для non-owner, password-reset (код готов, нужен Custom SMTP владельца).
5. **Что сделано в последней задаче:** см. секции Last Completed Task и Files Changed выше.
6. **Изменённые файлы:** `src/lib/delivery.js` (new), `tests/delivery.test.mjs` (new), `package.json`, `src/pages/CheckoutPage.jsx`, `src/lib/orders.js`, `src/pages/SettingsPage.jsx`, `src/pages/AdminPage.jsx`, `src/admin/db.js`, `src/i18n/translations.js`, `src/data/promos.js`, `src/styles/index.css`, `supabase/delivery-and-individual-promo.sql` (new), docs (HANDOFF/FEATURES/DECISIONS/TODO).
7. **Выполненные проверки:** `npm run build` OK; `npm test` 37/37; unit-покрытие формулы доставки (пороги, express, промо-порог, safe input). SQL НЕ применён из окружения (owner action). Живой e2e под owner-сессией НЕ выполнялся.
8. **Ограничения (НЕ нарушать):** единственный owner — alekberov...; не создавать второй Supabase auth-клиент; не ослаблять RLS; service_role НИКОГДА во фронте; скидки/доставка/промо — только server-trusted RPC; клиент и сервер держат одну формулу доставки (100/3/7), авторитет — сервер; не переписывать исторические заказы; не трогать is_admin/OTP/impersonation/fullscreen-404/Google-OAuth/storefront; коммит+пуш после завершённого этапа (один пуш на таск).
9. **Обязательные документы:** `START.md`, `CLAUDE.md`, `docs/HANDOFF.md`, `.claude/PROJECT.md`, `.claude/CODE_STYLE.md`, `.claude/REVIEW.md`, `.claude/SECURITY.md`, `.claude/CODEX.md`.
10. **Что осталось:** владелец применяет `supabase/delivery-and-individual-promo.sql`; затем живая проверка заказа (доставка в Admin→Orders) и персонального промо (отказ чужому). Отдельно — Custom SMTP для password-reset и прочие owner-SQL из TODO.
11. **Первый следующий шаг:** дождаться применения владельцем `supabase/delivery-and-individual-promo.sql`, затем свериться с Admin→Orders на реальном заказе.
12. **После завершения работы:** обновить `docs/HANDOFF.md` (+ FEATURES/DECISIONS/TODO при необходимости), проверить `git status`, `npm run build` + `npm test`, коммит+пуш, старт GitHub Pages deploy (результат не ждать).

SESSION CHECKSUM
```
Recovery format: v1
Project: Elva LaVenta (Website-LaVenta)
Branch: main
Current task: Новая логика доставки + индивидуальный промокод по User ID — DONE (код), требует owner SQL apply
Expected modified files:
  - src/lib/delivery.js (new)
  - tests/delivery.test.mjs (new)
  - package.json
  - src/pages/CheckoutPage.jsx
  - src/lib/orders.js
  - src/pages/SettingsPage.jsx
  - src/pages/AdminPage.jsx
  - src/admin/db.js
  - src/i18n/translations.js
  - src/data/promos.js
  - src/styles/index.css
  - supabase/delivery-and-individual-promo.sql (new)
  - docs/HANDOFF.md, docs/FEATURES.md, docs/DECISIONS.md, docs/TODO.md
Git status summary: рабочие изменения готовятся к commit+push этой сессией
Documentation updated: YES
Last verified build: OK (npm run build, 141 модуль, built ~3.2s)
Last verified tests: 37/37 (auth-recovery 13 + inactivity 8 + delivery 16)
Recovery confidence: HIGH
```
