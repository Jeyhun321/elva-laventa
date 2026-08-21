# TODO — Elva LaVenta

Единый список задач проекта. Приоритеты идут сверху вниз: сначала то, что важнее.

Формат строки задачи:

```
- [ ] Краткое описание задачи. (контекст: файл/модуль, ссылка на HANDOFF/HISTORY при наличии)
```

Отмечай выполненное как `- [x]` и переноси значимое в [`HISTORY.md`](./HISTORY.md).
Текущее состояние работы всегда смотри в [`HANDOFF.md`](./HANDOFF.md),
подневный ход — в [`DAILY.md`](./DAILY.md).

---

## Critical

Блокирует релиз, ломает продакшн, теряет данные или деньги, дыра в безопасности.

- [ ] **🔴 Password reset — письмо не доходит (владелец, ОБЯЗАТЕЛЬНО настроить SMTP):** root cause подтверждён live — Supabase API принимает запрос (`error:null`), но встроенный email-провайдер не доставляет (rate-limit/не для прод/спам). Настроить **Custom SMTP** (Dashboard → Authentication → Emails/SMTP; sender+host+port+user+pass реального провайдера — Resend/SendGrid/Mailgun/Postmark/SES; credentials только в Dashboard). Также проверить Site URL = `https://jeyhun321.github.io/elva-laventa/` и Redirect URLs = `.../elva-laventa/reset`. После — «Сбросить пароль» на тест-аккаунте → проверить inbox/Спам + Auth Logs + дашборд SMTP-провайдера. Код корректен (аудит `PASSWORD_RESET_*` в System Logs). (см. BUGS #LAV-BUG-059)
- [x] **Task 3 — impersonation «Войти как пользователь» — DONE (F-014).** `supabase/admin-impersonation.sql` применён владельцем; live-проверено под owner-сессией 2026-08-21 (реальные данные User A, возврат в админку, отсутствие A→B утечки, баннер, блок place_order, обычная витрина не тронута) + автоматически (anon 12/12 RPC denied, service_role в бандле NONE).
- [ ] **Admin owner hardening (владелец):** выполнить `supabase/fix-admin-owner.sql` — делает единственным админом владельца `alekberov.ceyhun2002@gmail.com` (вшитый immutable owner UUID + role + email) и снимает admin у всех прочих. Проверка после: `select u.email,p.role from profiles p join auth.users u on u.id=p.id where p.role='admin'` → одна строка alekberov. (см. BUGS #LAV-BUG-058). Примечание: ранняя версия ошибочно указывала olegperov — исправлено.

## High

Важно для пользователей или близкого релиза; заметно влияет на работу магазина.

- [x] **Phase 2 / Wheel FIX:** `supabase/wheel-spin-fix.sql` применён владельцем; LIVE-подтверждено (реальный spin 5%, auto-open, 7 секторов). (BUGS #LAV-BUG-054)
- [ ] **Phase 2 / Promo FIX (владелец, ОБЯЗАТЕЛЬНО):** выполнить `supabase/promo-validate-fix.sql` — иначе применение ЛЮБОГО валидного промо/награды на checkout падает (42702 ambiguous `promo_id`). Клиентских изменений не нужно. После — LIVE-проверка checkout с wheel-наградой (окно не требуется). (см. BUGS #LAV-BUG-055)
- [x] **Phase 2 / Stage 1 (владелец):** `supabase/promo-and-wheel.sql` выполнен в Supabase (подтверждено владельцем 2026-08-15).
- [x] **Phase 2 / Stage 2:** Checkout promo UI (mobile) + 8-арг `place_order(..., p_promo_code)` + `validate_promo` preview + i18n состояний.
- [x] **Phase 2 / Stage 3:** Admin — модуль «Промокоды» (CRUD, campaign/individual, Generate, привязка к клиенту).
- [x] **Phase 2 / Stage 4:** Admin — «Колесо фортуны» (enabled, окна, timezone, проценты+веса, expiry, max spins).
- [x] **Phase 2 / Stage 5:** Mobile Wheel UI (приглашение «Şansını sına», анимация к серверному результату, reward через общий promo-движок).
- [x] **Phase 2 / Stage 6:** REST-верификация trusted-RPC/RLS + Playwright wiring + build + commit/push/deploy.
- [ ] **Admin Users module (владелец, ОБЯЗАТЕЛЬНО):** выполнить `supabase/admin-users-module.sql` в Supabase → SQL Editor — иначе таб Admin «Пользователи» вернёт `AUTH_REQUIRED`/функция не найдена. После — под админом проверить список пользователей и кнопку «Сбросить пароль» (приходит recovery-письмо; пароль не показывается). service_role не нужен. (см. FEATURES #F-013)
- [ ] **LAV-BUG-056 (ОТКРЫТ; критично — нужен timeline с устройства):** симптом повторился на реальном устройстве после `e0efea1`; в эмуляции НЕ воспроизводится (60/60 нав, 0 leaks, guards корректны). **При следующем сбое** (после долгого фона тап по товару не открывает / навигация нестабильна): открыть на телефоне DevTools/консоль (или Eruda) и прислать вывод **`window.__lavDiagDetailed()`** — это даст точный timeline (tap→overlay→navigate→guard-reason→route→catalog/cart state) и покажет виновника. Диагностика уже в проде (без секретов). Можно заранее включить подробный лог: `localStorage.elva_diag='1'`.
- [ ] **Phase 2 (владелец, финальная проверка):** на реальном телефоне под Google-аккаунтом — применение промокода на checkout и один спин колеса во временном окне (Asia/Baku 10:00/13:00/18:00/21:00 ±5м). Playwright не может авторизоваться и форсировать окно.
- [ ] Применить `supabase/fix-order-any-auth.sql` в SQL Editor — иначе email-покупатель не оформит заказ (`place_order` требует `provider='google'`). Ручное действие владельца. (см. HANDOFF)
- [ ] Выключить Confirm email в Supabase (`mailer_autoconfirm: false`) и подтвердить уже зарегистрированных. Ручное действие владельца.
- [ ] Живая проверка favorites A→B→A и заказа email-покупателя на реальных аккаунтах владельца. (см. BUGS #B-004)

## Medium

Нужные улучшения без срочности; можно планировать в ближайшие итерации.

- [ ] _(пусто)_

## Low

Мелкие правки, косметика, необязательные удобства.

- [ ] _(пусто)_

## Technical Debt

Рефакторинг, упрощение, тесты, обновление зависимостей, устранение рисков регрессии.

- [ ] Оценить остаточный риск от удаления автопереноса локального кэша корзины (`mustPush`): корзина, жившая ТОЛЬКО в браузере, пропадает молча. Продумать безопасную одноразовую миграцию или явное предупреждение. (см. BUGS #B-003)
- [ ] Нет автоматических тестов (unit/e2e) — проверка ручная (build + браузер). Рассмотреть минимальный e2e для cart/favorites/checkout.

## Ideas

Ненаправленные идеи и предложения на будущее; не обязательства.

- [ ] _(пусто)_
