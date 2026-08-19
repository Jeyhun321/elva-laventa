// Pure decision helpers for auth session recovery (LAV-BUG-056).
// Kept separate from AuthContext so the transient-null handling can be
// unit-tested without a live Supabase session (see tests/auth-recovery.test.mjs).
//
// Why this exists
// ---------------
// On mobile, when the tab returns from a long background, Supabase
// (autoRefreshToken) may briefly emit a NULL session (SIGNED_OUT) while it
// re-establishes the SAME session, immediately followed by SIGNED_IN /
// TOKEN_REFRESHED. If we drop `user` to null on that blip, the null cascades:
//   accountId A → null → A  ⇒  ShopContext clears the cart and CheckoutPage's
//   "empty cart" guard redirects away — the taps-frozen / kicked-to-home symptom
//   reported after long idle (adjacent to LAV-BUG-052, previously only the
//   AccountHomeRedirect half was fixed).
//
// Rule: ignore a TRANSIENT null (defer briefly, then confirm against the source
// of truth), but honour a REAL sign-out immediately (user pressed logout).

// Bounded grace window: how long a null session is treated as "maybe recovering"
// before we confirm via getSession(). Short enough to feel instant on real
// logout paths (which bypass it via the intent flag), long enough to cover a
// background token-refresh blip. Never unbounded → no permanent limbo.
export const AUTH_RECOVERY_GRACE_MS = 2000

// Decide what to do when an auth event arrives.
//   'adopt' — a user is present: take it now (and cancel any pending clear)
//   'clear' — user-initiated sign-out: clear immediately
//   'defer' — null session, not user-initiated: may be a transient recovery blip
export function decideAuthAction({ hasUser, intentionalSignOut }) {
  if (hasUser) return 'adopt'
  if (intentionalSignOut) return 'clear'
  return 'defer'
}

// After the grace window elapses, the source of truth (getSession) decides:
//   'keep'  — session recovered to a user → keep the user (it was transient)
//   'clear' — still no session → it was a real sign-out/expiry
export function resolveDeferred({ sessionHasUser }) {
  return sessionHasUser ? 'keep' : 'clear'
}
