// Pure decision for the long-idle → home redirect (LAV-BUG-057).
// Kept React-free so it can be unit-tested without a router (see
// tests/inactivity.test.mjs).
//
// The hook redirects a returning user to home only when ALL hold:
//   - there is a recorded last-activity timestamp;
//   - at least `timeoutMs` has elapsed since it;
//   - the user is NOT already on home.
// This is the INTENDED 30-minute idle behaviour. The bug fixed in LAV-BUG-057
// was NOT this decision — it was the boot check RE-RUNNING on every navigation
// (because the effect depended on `maybeRedirect`/`navigate`, whose identity
// changes on route change) and re-firing with a STALE captured timestamp, which
// bounced an actively-opened product page straight back to home.

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 минут

export function shouldRedirectHome({ last, now, path, timeoutMs = INACTIVITY_TIMEOUT_MS }) {
  return Boolean(last) && (now - last) >= timeoutMs && path !== '/'
}
