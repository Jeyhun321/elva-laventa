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

- [ ] _(пусто)_

## High

Важно для пользователей или близкого релиза; заметно влияет на работу магазина.

- [ ] **Phase 2 / Stage 1 (владелец):** выполнить `supabase/promo-and-wheel.sql` в Supabase SQL Editor — создаёт таблицы промокодов/колеса, trusted-RPC и RLS. Без этого клиентская часть Phase 2 (Stage 2+) не работает. (см. HANDOFF, DECISIONS #D-007)
- [ ] **Phase 2 / Stage 2:** Checkout promo UI (mobile) + переключение клиента на 8-арг `place_order(..., p_promo_code)` + `validate_promo` preview + i18n состояний.
- [ ] **Phase 2 / Stage 3:** Admin Panel — модуль «Promokodlar/Kuponlar» (CRUD, campaign/individual, Generate через `generate_promo_code`, привязка к аккаунту).
- [ ] **Phase 2 / Stage 4:** Admin — subsection «Wheel of Fortune» (enabled, окна, timezone, проценты+веса, expiry, max spins).
- [ ] **Phase 2 / Stage 5:** Mobile Wheel UI — приглашение «Şansını sına», анимация к серверному результату (`get_wheel_status`/`spin_wheel`), reward через общий promo-движок.
- [ ] **Phase 2 / Stage 6:** Playwright-mobile проверка сценариев promo/wheel (после Stage 1 SQL + при наличии тест-аккаунта), security/RLS ревью, build, commit/push/deploy.
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
