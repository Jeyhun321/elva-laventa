// ============================================================
//  Elva LaVenta — доставка: ЕДИНЫЙ источник истины (client-side).
//
//  Бизнес-правила (LAV-2026-08, зафиксированы в docs/HANDOFF.md):
//    • Standard:  порог 100 ₼ по стоимости товаров ПОСЛЕ скидки/промокода.
//                 >= 100 ₼ → бесплатно; < 100 ₼ → 3 ₼.
//    • Express:   всегда 7 ₼, независимо от суммы корзины.
//                 Бесплатная доставка от 100 ₼ относится ТОЛЬКО к standard.
//    • ETA стандарта: «в течение 3 календарных дней» (НЕ рабочих).
//
//  Сервер (place_order / public.delivery_fee) считает ЭТУ ЖЕ формулу
//  авторитетно — здесь только для отображения в checkout. Оба источника
//  обязаны совпадать; при расхождении верно значение сервера.
// ============================================================

export const FREE_DELIVERY_THRESHOLD = 100 // ₼, по товарам после скидки
export const STANDARD_FEE = 3               // ₼, если товаров < порога
export const EXPRESS_FEE = 7                // ₼, всегда

// subtotalAfterDiscount — стоимость ТОВАРОВ после применения скидки (без доставки).
// deliveryType — 'standard' | 'express'.
export const getDeliveryPrice = (subtotalAfterDiscount, deliveryType) => {
  if (deliveryType === 'express') return EXPRESS_FEE
  const amount = Number(subtotalAfterDiscount)
  const base = Number.isFinite(amount) ? Math.max(0, amount) : 0
  return base >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_FEE
}

// true, если стандартная доставка бесплатна при данной сумме товаров.
export const isFreeStandard = (subtotalAfterDiscount) =>
  getDeliveryPrice(subtotalAfterDiscount, 'standard') === 0
