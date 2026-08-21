// Delivery pricing — single source of truth (src/lib/delivery.js).
// Runs with plain node: `node tests/delivery.test.mjs`.
//
// Business rules (LAV-2026-08):
//   Standard: subtotalAfterDiscount >= 100 → 0 ₼, else 3 ₼.
//   Express:  always 7 ₼ regardless of cart total.
//   Threshold is measured on PRODUCT subtotal AFTER discount (never includes delivery).
import assert from 'node:assert'
import {
  getDeliveryPrice, FREE_DELIVERY_THRESHOLD, STANDARD_FEE, EXPRESS_FEE,
} from '../src/lib/delivery.js'

let n = 0, p = 0
const t = (name, fn) => { n++; try { fn(); p++; console.log('PASS —', name) } catch (e) { console.log('FAIL —', name, '::', e.message) } }
const std = (s) => getDeliveryPrice(s, 'standard')
const exp = (s) => getDeliveryPrice(s, 'express')

t('constants are 100 / 3 / 7', () => {
  assert.equal(FREE_DELIVERY_THRESHOLD, 100)
  assert.equal(STANDARD_FEE, 3)
  assert.equal(EXPRESS_FEE, 7)
})

// --- Standard threshold edge cases ---
t('standard 0 → 3', () => assert.equal(std(0), 3))
t('standard 99 → 3', () => assert.equal(std(99), 3))
t('standard 99.99 → 3', () => assert.equal(std(99.99), 3))
t('standard 100 → free (0)', () => assert.equal(std(100), 0))
t('standard 100.01 → free (0)', () => assert.equal(std(100.01), 0))
t('standard 150 → free (0)', () => assert.equal(std(150), 0))

// --- Express is always 7 ---
t('express 20 → 7', () => assert.equal(exp(20), 7))
t('express 99 → 7', () => assert.equal(exp(99), 7))
t('express 100 → 7 (free-standard does NOT free express)', () => assert.equal(exp(100), 7))
t('express 500 → 7', () => assert.equal(exp(500), 7))

// --- Threshold measured AFTER discount (caller passes subtotal-discount) ---
t('110 - promo 5 = 105 → free', () => assert.equal(std(110 - 5), 0))
t('105 - promo 10 = 95 → 3', () => assert.equal(std(105 - 10), 3))
t('100 - promo 1 = 99 → 3', () => assert.equal(std(100 - 1), 3))

// --- Robustness: bad input never NaN ---
t('NaN subtotal standard → 3 (safe)', () => assert.equal(std(NaN), 3))
t('negative subtotal standard → 3 (safe)', () => assert.equal(std(-50), 3))

console.log(`\n${p}/${n} passed`)
if (p !== n) process.exit(1)
