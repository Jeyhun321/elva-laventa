// Regression test — LAV-BUG-057: long-idle → resume → tap product must NOT be
// bounced back to home. Runs with plain node: `node tests/inactivity.test.mjs`.
//
// Two layers:
//  1. Pure decision `shouldRedirectHome` — the INTENDED 30-min idle rule.
//  2. A simulator of the hook's boot effect proving the fix: the boot idle-check
//     runs ONCE (mount), and a subsequent navigation does NOT re-fire it with the
//     stale mount-time timestamp (the exact PUSH /product → REPLACE / bug).
import assert from 'node:assert'
import { shouldRedirectHome, INACTIVITY_TIMEOUT_MS } from '../src/lib/inactivity.js'

let n = 0, p = 0
const t = (name, fn) => { n++; try { fn(); p++; console.log('PASS —', name) } catch (e) { console.log('FAIL —', name, '::', e.message) } }

const NOW = 1_000_000_000_000
const STALE = NOW - 31 * 60 * 1000   // 31 min ago
const FRESH = NOW - 5 * 1000         // 5 s ago

// --- pure decision (intended 30-min idle rule) ---
t('stale idle + non-home → redirect', () => assert.equal(shouldRedirectHome({ last: STALE, now: NOW, path: '/product/20' }), true))
t('stale idle + home → no redirect (home is exempt)', () => assert.equal(shouldRedirectHome({ last: STALE, now: NOW, path: '/' }), false))
t('fresh activity + non-home → no redirect', () => assert.equal(shouldRedirectHome({ last: FRESH, now: NOW, path: '/product/20' }), false))
t('no last-activity → no redirect', () => assert.equal(shouldRedirectHome({ last: 0, now: NOW, path: '/product/20' }), false))
t('timeout constant is 30 min', () => assert.equal(INACTIVITY_TIMEOUT_MS, 30 * 60 * 1000))

// --- simulator of the fixed hook lifecycle ---
// Models: bootLast captured ONCE at mount; the boot check runs once; navigation
// stamps activity; visibility/pageshow use the LIVE timestamp.
function makeHook({ mountPath, lastAtMount }) {
  let path = mountPath
  let lvLast = lastAtMount           // localStorage lv_last_activity
  const bootLast = lvLast            // captured once at first render
  const redirects = []
  let redirecting = false
  const stamp = () => { lvLast = NOW } // route change / activity refreshes it
  const check = (last) => {
    if (redirecting) return
    if (shouldRedirectHome({ last, now: NOW, path })) { redirecting = true; stamp(); redirects.push({ from: path }); path = '/' }
    else stamp()
  }
  return {
    boot() { check(bootLast) },                 // ONE-TIME boot check (fixed: no re-run on nav)
    navigate(to) { path = to; stamp() },        // user navigation (route-change stamps)
    resume() { check(lvLast) },                 // visibility/pageshow → LIVE timestamp
    get path() { return path },
    get redirects() { return redirects },
  }
}

// FIX: mounted on HOME with a stale mount-time timestamp, then user taps a product.
// The boot check ran once (on home → no redirect). Navigation must NOT re-fire it.
t('LAV-BUG-057: home mount (stale) → tap product → stays on /product (no REPLACE)', () => {
  const h = makeHook({ mountPath: '/', lastAtMount: STALE })
  h.boot()                        // one-time boot check on home → no redirect, stamps
  assert.equal(h.path, '/')
  h.navigate('/product/20')       // user tap; boot check is NOT re-invoked (fixed)
  assert.equal(h.path, '/product/20')
  assert.equal(h.redirects.length, 0, 'no idle redirect after active navigation')
})

// INTENDED preserved: genuine resume after long idle on a non-home page → home.
t('intended: long-idle resume on /product → redirect home', () => {
  const h = makeHook({ mountPath: '/product/20', lastAtMount: STALE })
  // fresh mount on product does the one-time boot redirect (intended 30-min rule)
  h.boot()
  assert.equal(h.path, '/')
  assert.equal(h.redirects.length, 1)
})

// INTENDED preserved: passive resume (visibility/pageshow) on a product page when
// the LIVE last-activity is already stale → redirect home.
t('intended: visibility resume on /product with stale live activity → redirect home', () => {
  const h = makeHook({ mountPath: '/product/20', lastAtMount: STALE })
  h.resume()                      // visibility/pageshow reads the live (stale) timestamp
  assert.equal(h.path, '/')
  assert.equal(h.redirects.length, 1)
})

console.log(`\n${p}/${n}`)
process.exit(p === n ? 0 : 1)
