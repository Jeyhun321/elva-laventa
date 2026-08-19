// Bounded lifecycle diagnostics ring buffer (LAV-BUG-056).
//
// Purpose: the long-idle mobile freeze only reproduces on a real device after a
// real OS tab-suspension with an authenticated Supabase session — which neither
// Playwright nor a fresh session reproduces. This captures the sequence of
// visibility / online / auth / navigation events into a small persistent ring
// so that after the NEXT real incident we can reconstruct an exact timeline
// instead of guessing again (task section 6 & 14).
//
// SECURITY (hard rules): never store access tokens, refresh tokens, passwords,
// service_role keys or full payloads. Only event names, timestamps, coarse
// flags, route, and a short NON-reversible id hint (first 4 chars — enough to
// tell account A from B, not enough to identify a person).
//
// It never spams the production console: entries print only when the owner opts
// in with localStorage 'elva_diag' = '1'. The timeline is always readable via
// window.__lavDiag().

const MAX = 60
const KEY = 'elva_diag_ring'

let ring = []
try {
  const raw = sessionStorage.getItem(KEY)
  if (raw) ring = JSON.parse(raw).slice(-MAX)
} catch { ring = [] }

const persist = () => {
  try { sessionStorage.setItem(KEY, JSON.stringify(ring.slice(-MAX))) } catch { /* storage unavailable */ }
}

// Short, non-sensitive hint of an id (first 4 chars). Never a token.
export const idHint = (id) => (id ? String(id).slice(0, 4) : null)

export function logDiag(type, data = {}) {
  const entry = {
    t: new Date().toISOString(),
    vis: typeof document !== 'undefined' ? document.visibilityState : '?',
    on: typeof navigator !== 'undefined' ? navigator.onLine : '?',
    route: typeof location !== 'undefined' ? (location.pathname + (location.hash || '').slice(0, 24)) : '?',
    type,
    ...data,
  }
  ring.push(entry)
  if (ring.length > MAX) ring = ring.slice(-MAX)
  persist()
  try { if (localStorage.getItem('elva_diag') === '1') console.info('[lav-diag]', type, entry) } catch { /* ignore */ }
}

export function getDiag() { return ring.slice() }
export function clearDiag() { ring = []; persist() }

// Install global lifecycle listeners once (browser only). Auto-records the
// visibility/network transitions that bound a long-idle recovery window.
let installed = false
export function installLifecycleDiag() {
  if (installed || typeof window === 'undefined') return
  installed = true
  document.addEventListener('visibilitychange', () => logDiag('visibility'))
  window.addEventListener('online', () => logDiag('online'))
  window.addEventListener('offline', () => logDiag('offline'))
  window.addEventListener('pageshow', (e) => logDiag('pageshow', { persisted: Boolean(e.persisted) }))
  try { window.__lavDiag = getDiag } catch { /* ignore */ }
  logDiag('diag-installed')
}
