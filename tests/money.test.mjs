// Procurement money math — single source of truth (src/lib/money.js).
// Runs with plain node: `node tests/money.test.mjs`.
//
// Reference case (owner spec): qty 10, purchase 20 ₼, sale 35 ₼
//   purchase_total = 200, expected_revenue = 350, expected_profit = 150,
//   margin = 42.857…% → rounded 42.86%. markup = 75%.
import assert from 'node:assert'
import {
  round2, purchaseTotal, expectedRevenue, expectedProfit,
  marginPercent, markupPercent, procurementCalc,
} from '../src/lib/money.js'

let n = 0, p = 0
const t = (name, fn) => { n++; try { fn(); p++; console.log('PASS —', name) } catch (e) { console.log('FAIL —', name, '::', e.message) } }

t('round2 kills float noise', () => assert.equal(round2(0.1 + 0.2), 0.3))
t('round2 non-finite → 0', () => assert.equal(round2('abc'), 0))

// --- reference case ---
t('purchase_total 20×10 = 200', () => assert.equal(purchaseTotal(20, 10), 200))
t('expected_revenue 35×10 = 350', () => assert.equal(expectedRevenue(35, 10), 350))
t('expected_profit (35-20)×10 = 150', () => assert.equal(expectedProfit(35, 20, 10), 150))
t('margin 35/20 → 42.86%', () => assert.equal(marginPercent(35, 20), 42.86))
t('markup 35/20 → 75%', () => assert.equal(markupPercent(35, 20), 75))

// --- margin ≠ markup guard ---
t('margin and markup differ', () => assert.notEqual(marginPercent(35, 20), markupPercent(35, 20)))

// --- edge cases ---
t('sale 0 → margin 0 (no divide by zero)', () => assert.equal(marginPercent(0, 20), 0))
t('cost 0 → markup 0 (no divide by zero)', () => assert.equal(markupPercent(35, 0), 0))
t('loss: sale<cost → negative profit', () => assert.equal(expectedProfit(10, 20, 5), -50))
t('negative margin when selling at a loss', () => assert.equal(marginPercent(10, 20), -100))

// --- full calc bundle ---
t('procurementCalc bundle (qty10, cost20, sale35, sold4)', () => {
  const c = procurementCalc({ purchase_unit_price: 20, planned_sale_unit_price: 35, quantity: 10, quantity_sold: 4 })
  assert.equal(c.purchase_total, 200)
  assert.equal(c.expected_revenue, 350)
  assert.equal(c.expected_profit, 150)
  assert.equal(c.margin_percent, 42.86)
  assert.equal(c.markup_percent, 75)
  assert.equal(c.quantity_remaining, 6)
  assert.equal(c.actual_profit, 60) // (35-20)*4
})

t('procurementCalc safe on empty input', () => {
  const c = procurementCalc({})
  assert.equal(c.purchase_total, 0)
  assert.equal(c.margin_percent, 0)
})

// --- Procurement analytics reference case (owner spec, Part 15) ---
// Supplier A: 5×20 + 10×15 ; Supplier B: 4×30. Uses ONLY purchase prices (no sales).
t('analytics: total spent = 370 ₼', () => {
  const spent = round2(purchaseTotal(20, 5) + purchaseTotal(15, 10) + purchaseTotal(30, 4))
  assert.equal(spent, 370)
})
t('analytics: units purchased = 19', () => assert.equal(5 + 10 + 4, 19))
t('analytics: Supplier A spent = 250 ₼', () => {
  assert.equal(round2(purchaseTotal(20, 5) + purchaseTotal(15, 10)), 250)
})
t('analytics: Supplier B spent = 120 ₼', () => assert.equal(purchaseTotal(30, 4), 120))
t('analytics: avg purchase price = spent/units', () => {
  assert.equal(round2(370 / 19), 19.47)
})

console.log(`\n${p}/${n} passed`)
if (p !== n) process.exit(1)
