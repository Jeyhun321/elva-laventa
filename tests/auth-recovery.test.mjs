// Regression test — LONG-IDLE MOBILE RECOVERY (LAV-BUG-056).
// Runs with plain node: `node tests/auth-recovery.test.mjs` (or `npm test`).
//
// Encodes the acceptance criterion: a transient auth-null during background
// recovery (account A → null → A) must NOT be treated as a logout/account
// switch, while a REAL logout and a REAL account switch still work.
import assert from 'node:assert'
import { decideAuthAction, resolveDeferred, AUTH_RECOVERY_GRACE_MS } from '../src/lib/authRecovery.js'

let n = 0, p = 0
const t = (name, fn) => { n++; try { fn(); p++; console.log('PASS —', name) } catch (e) { console.log('FAIL —', name, '::', e.message) } }

// --- pure decision helpers ---
t('any user event → adopt', () => assert.equal(decideAuthAction({ hasUser: true, intentionalSignOut: false }), 'adopt'))
t('user event adopts even if intent flag left set', () => assert.equal(decideAuthAction({ hasUser: true, intentionalSignOut: true }), 'adopt'))
t('user-initiated null → clear immediately', () => assert.equal(decideAuthAction({ hasUser: false, intentionalSignOut: true }), 'clear'))
t('non-initiated null → defer (transient)', () => assert.equal(decideAuthAction({ hasUser: false, intentionalSignOut: false }), 'defer'))
t('deferred + session recovered → keep', () => assert.equal(resolveDeferred({ sessionHasUser: true }), 'keep'))
t('deferred + still no session → clear', () => assert.equal(resolveDeferred({ sessionHasUser: false }), 'clear'))
t('grace window is bounded (no infinite limbo)', () => assert.ok(AUTH_RECOVERY_GRACE_MS > 0 && AUTH_RECOVERY_GRACE_MS <= 5000))

// --- simulator mirroring AuthContext's onAuthStateChange + grace timer ---
function makeAuth() {
  let user = null, pending = false, intentional = false
  return {
    event(hasUser, uid) {
      const a = decideAuthAction({ hasUser, intentionalSignOut: intentional })
      if (a === 'adopt') { user = uid; pending = false; intentional = false }
      else if (a === 'clear') { user = null; pending = false; intentional = false }
      else { pending = true } // defer: keep current user until grace resolves
    },
    logout() { intentional = true },
    grace(sessionHasUser, sessionUid) {
      if (!pending) return
      pending = false
      user = resolveDeferred({ sessionHasUser }) === 'keep' ? (sessionUid ?? user) : null
    },
    get user() { return user },
    get pending() { return pending },
  }
}

// Case E/F/I: A → transient null → A must stay A (session recovers)
t('A → transient null → A stays A (cart/checkout NOT dropped)', () => {
  const auth = makeAuth()
  auth.event(true, 'A'); assert.equal(auth.user, 'A')
  auth.event(false); assert.equal(auth.user, 'A', 'user kept during blip'); assert.equal(auth.pending, true)
  auth.grace(true, 'A'); assert.equal(auth.user, 'A'); assert.equal(auth.pending, false)
})

// Transient null resolved early by a following SIGNED_IN before grace fires
t('A → null → SIGNED_IN(A) before grace → A, no clear', () => {
  const auth = makeAuth()
  auth.event(true, 'A')
  auth.event(false); assert.equal(auth.pending, true)
  auth.event(true, 'A'); assert.equal(auth.user, 'A'); assert.equal(auth.pending, false)
})

// Case G: real logout clears immediately
t('real logout → user cleared immediately', () => {
  const auth = makeAuth()
  auth.event(true, 'A')
  auth.logout(); auth.event(false)
  assert.equal(auth.user, null); assert.equal(auth.pending, false)
})

// Real session expiry (no user action): defer then confirm gone → clear
t('genuine expiry → deferred then cleared after grace', () => {
  const auth = makeAuth()
  auth.event(true, 'A')
  auth.event(false); assert.equal(auth.user, 'A')
  auth.grace(false); assert.equal(auth.user, null)
})

// Case H: real account switch A → B
t('account switch A → B updates user', () => {
  const auth = makeAuth()
  auth.event(true, 'A')
  auth.event(true, 'B'); assert.equal(auth.user, 'B')
})

// Guard: a transient null must not masquerade as a switch (A → null → B is a
// real switch that still works)
t('A → null → B resolves to B', () => {
  const auth = makeAuth()
  auth.event(true, 'A')
  auth.event(false); assert.equal(auth.pending, true)
  auth.event(true, 'B'); assert.equal(auth.user, 'B'); assert.equal(auth.pending, false)
})

console.log(`\n${p}/${n}`)
process.exit(p === n ? 0 : 1)
