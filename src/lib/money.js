// ============================================================
//  Elva LaVenta — денежные помощники (AZN) + расчёты закупок.
//
//  ЕДИНЫЙ источник формул для UI (live-расчёт в форме закупки и аналитике).
//  База данных считает те же величины GENERATED-колонками (авторитет — БД);
//  здесь — только для мгновенного показа. Оба места обязаны совпадать.
//
//  ВНИМАНИЕ: margin ≠ markup.
//    margin  = profit / revenue   (доля прибыли в выручке)
//    markup  = profit / cost      (наценка к себестоимости)
// ============================================================

// Округление денег до 2 знаков без float-артефактов (0.1+0.2 и т.п.).
export const round2 = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round((x + Number.EPSILON) * 100) / 100
}

const num = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// purchase_total = закуп. цена за единицу × количество
export const purchaseTotal = (unitPrice, qty) => round2(num(unitPrice) * num(qty))

// expected_revenue = план. цена продажи за единицу × количество
export const expectedRevenue = (saleUnitPrice, qty) => round2(num(saleUnitPrice) * num(qty))

// expected_profit = выручка − себестоимость
export const expectedProfit = (saleUnitPrice, unitPrice, qty) =>
  round2((num(saleUnitPrice) - num(unitPrice)) * num(qty))

// margin % = прибыль / выручка × 100 (0, если выручка 0)
export const marginPercent = (saleUnitPrice, unitPrice) => {
  const s = num(saleUnitPrice)
  if (s <= 0) return 0
  return round2((s - num(unitPrice)) / s * 100)
}

// markup % = прибыль / себестоимость × 100 (0, если себестоимость 0)
export const markupPercent = (saleUnitPrice, unitPrice) => {
  const c = num(unitPrice)
  if (c <= 0) return 0
  return round2((num(saleUnitPrice) - c) / c * 100)
}

// Форматирование AZN для показа (₼ в конце, как в остальном UI).
export const fmtAzn = (n) => `${round2(n)} ₼`

// Полный набор производных величин закупки (для live-расчёта в форме).
export const procurementCalc = ({ purchase_unit_price, planned_sale_unit_price, quantity, quantity_sold = 0 }) => {
  const cost = num(purchase_unit_price)
  const sale = num(planned_sale_unit_price)
  const qty = num(quantity)
  const sold = num(quantity_sold)
  return {
    purchase_total: round2(cost * qty),
    expected_revenue: round2(sale * qty),
    expected_profit: round2((sale - cost) * qty),
    margin_percent: marginPercent(sale, cost),
    markup_percent: markupPercent(sale, cost),
    quantity_remaining: qty - sold,
    actual_profit: round2((sale - cost) * sold),
  }
}
