# ECOMMERCE_E2E_QA — постоянная QA-документация purchase-chain Elva LaVenta

Документ описывает бизнес-инварианты покупки и постоянную E2E-матрицу.
Живёт в проекте навсегда, обновляется при изменениях в цепочке
**Admin → Supabase → Catalog → Search → Product → Favorites → Cart → Checkout → Order**.

Создан: 2026-08-14 (в рамках LAV-BUG-050).

---

## Section A — Архитектура / Source of Truth

| Слой | Где | Роль |
|------|-----|------|
| **Product / Stock / Price** | Supabase таблица `public.products` (`is_active`, `in_stock`, `price`, `sizes text[]`, `code`, `name jsonb`) | **Единственный источник истины.** |
| **Catalog** | `src/context/CatalogContext.jsx` | Грузит `products WHERE is_active=true`. `inStock = in_stock !== false`. Тихая ревалидация по `visibilitychange`. Группировка вариантов по `code`. |
| **Cart / Favorites** | `src/context/ShopContext.jsx` + Supabase `customer_cart_items` / `customer_favorites`, кэш в `localStorage` **по аккаунту** | Cart хранит только `{id, size, qty}`. Цена/имя/сток всегда берутся live из каталога через `getProduct` — старая цена не хранится. |
| **Order creation** | RPC `public.place_order` (`security definer`), `src/lib/orders.js` | **Авторитетная граница покупки.** Сервер сам берёт цену, проверяет `is_active`, **`in_stock`**, размер; клиентский `total` не используется. Чистит корзину, шлёт Telegram. |

**Ключевой принцип:** `UI state ≠ proof of validity`. Любая покупка-критичная
операция проходит повторную проверку по актуальному состоянию БД в `place_order`.

**Модель наличия:** boolean `in_stock` на строку товара. Числовых остатков и
per-size stock НЕТ (сознательно — инвентаризацию не изобретаем). Каждый цвет —
отдельная строка со своим `in_stock`, поэтому недоступность одного цвета не
делает недоступными остальные. «Доступный размер» = размер присутствует в
`products.sizes`.

---

## Section B — Бизнес-инварианты

1. **Товар с `in_stock=false` нельзя купить** — ни добавить в корзину, ни оформить,
   независимо от страницы, вкладки, кэша, старого React-стейта и того, был ли товар
   доступен минуту назад.
2. **Удалённый / `is_active=false` товар нельзя купить** — исчезает из каталога,
   поиска и избранного; `place_order` отклоняет его (`PRODUCT_UNAVAILABLE`).
3. **Недоступный размер нельзя заказать** — `place_order` проверяет размер против
   `products.sizes` (`SIZE_INVALID`).
4. **Финальный заказ использует серверную цену и данные** — клиентский `total`
   не является источником истины.
5. **Данные аккаунтов не смешиваются** — кэш Cart/Favorites привязан к `accountId`;
   чужой/legacy-кэш не переиспользуется.
6. **Нет ложного успеха** — экран «Заказ принят» и очистка корзины только после
   успешного ответа `place_order`; при ошибке — понятное сообщение, корзина цела.

---

## Section C — E2E матрица (Admin change → слой)

| Admin меняет | Catalog | Search | Product | Favorites | Cart | Checkout | Order (`place_order`) |
|---|---|---|---|---|---|---|---|
| `in_stock=false` | карточка disabled add | disabled add | Add/Buy disabled | карточка disabled add | позиция «Нет в наличии», переход блок | submit блок | **PRODUCT_UNAVAILABLE** |
| `price` | live | live | live | live | текущая цена | текущая + серверная в заказе | серверная цена |
| delete / `is_active=false` | исчезает | не находится | 404-стейт | исчезает | позиция отфильтрована | блок | **PRODUCT_UNAVAILABLE** |
| размер убран из `sizes` | — | — | размер не выбрать | — | — | — | **SIZE_INVALID** |
| name/image | обновится по ревалидации | — | — | — | live | live | серверное имя/фото в заказе |

Защита эшелонирована: **UI (удобство) → `ShopContext.addToCart` (единая точка фронта) → `place_order` (авторитет)**.
Каждый следующий слой закрывает обход предыдущего (старая вкладка, кэш, ручная правка localStorage).

---

## Section D — Тест-кейсы

| ID | Сценарий | Ожидание |
|----|----------|----------|
| E2E-01 | Доступный товар → размер → Cart → Checkout → Order | SUCCESS |
| E2E-02 | Admin stock OFF → Product → Add to Cart | BLOCKED (кнопка disabled + текст) |
| E2E-03 | Товар открыт доступным → Admin stock OFF → старая вкладка → Add | BLOCKED (ревалидация по возврату / сервер) |
| E2E-04 | Доступный → Cart → Admin stock OFF → Cart → Checkout | BLOCKED (пометка + submit disabled) |
| E2E-05 | Доступный → Favorites → Admin stock OFF → Favorites → Add | BLOCKED (add-btn disabled) |
| E2E-06 | 30₼ → Cart → Admin 35₼ → Checkout | текущая цена в UI, серверная в заказе |
| E2E-07 | Товар → Cart → Admin delete/disable → Checkout | BLOCKED (PRODUCT_UNAVAILABLE) |
| E2E-08 | Размер L недоступен/убран → force L → Checkout | BLOCKED (SIZE_INVALID) |
| E2E-09 | Старый кэш/стейт → Admin stock OFF → reopen → Add/Checkout | BLOCKED (сервер отклоняет даже при правке localStorage) |
| E2E-10 | Product+Cart+Favorites вкладки → Admin меняет сток → покупка из stale-вкладки | BLOCKED |
| E2E-11 | Многократный клик Confirm Order | busy-lock (кнопка disabled на время отправки) → один заказ |
| E2E-12 | Сетевая ошибка при заказе | нет ложного Success, корзина не очищена, дубля нет |
| E2E-13 | User A → logout → User B | нет утечки Cart/Favorites между аккаунтами |

**Известные ограничения (не баги):**
- Нет числовых остатков → `qty > available` не ограничено количеством (модель boolean).
- E2E-11: защита — `disabled={busy}` на submit; отдельной серверной идемпотентности заказа нет (double-submit практически закрыт busy-lock).
- Экспресс-доставка (+5₼) считается в UI-итоге и note/Telegram; серверный `orders.total` пересчитывается триггером по `order_items` без доставки.

---

## Section E — Regression Checklist (перед релизом)

- [ ] `npm run build` — успешно.
- [ ] Миграция `supabase/order-stock-guard.sql` применена (в БД `place_order` проверяет `in_stock`).
- [ ] E2E-01 нормальная покупка — SUCCESS.
- [ ] E2E-02..05, 07..10 — недоступный/удалённый/неверный размер BLOCKED на всех слоях.
- [ ] E2E-06 — цена: UI текущая, заказ серверный.
- [ ] E2E-11 double-submit — один заказ.
- [ ] E2E-12 сетевая ошибка — нет ложного успеха.
- [ ] E2E-13 изоляция аккаунтов.
- [ ] Регрессии галереи/свайпа/tap/header/поиска/доставки не затронуты (LAV-BUG-040..049).
