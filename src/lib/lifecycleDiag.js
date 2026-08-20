// Bounded lifecycle diagnostics ring buffer (LAV-BUG-056 / -058).
//
// Purpose: the long-idle mobile freeze only reproduces on a real device after a
// real OS tab-suspension (and possibly a redeploy) with an authenticated
// Supabase session — which neither Playwright nor a fresh session reproduces
// (60/60 nav cycles, zero listener leaks in emulation). This captures the
// sequence of visibility / online / auth / navigation / TAP events into a small
// persistent ring so that after the NEXT real incident we can reconstruct an
// exact timeline — including whether a tap reached the product card or hit an
// overlay, and which guard (if any) redirected — instead of guessing again.
//
// SECURITY (hard rules): never store access tokens, refresh tokens, passwords,
// service_role keys or full payloads. Only event names, timestamps, coarse
// flags, route, and a short NON-reversible id hint (first 4 chars — enough to
// tell account A from B, not enough to identify a person).
//
// It never spams the production console: entries print only when the owner opts
// in with localStorage 'elva_diag' = '1'. Read the timeline any time via
// window.__lavDiag() (events) or window.__lavDiagDetailed() (events + a live DOM
// snapshot: overlay over centre, wheel modal/backdrop, scroll-lock, overflow).

const MAX = 80
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

const elDesc = (el) => (el ? (el.tagName + (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 48) : null)

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

// Live DOM snapshot — answers "is an invisible overlay eating taps right now?"
export function snapshotDom() {
  if (typeof document === 'undefined') return {}
  const cx = window.innerWidth / 2
  const cy = Math.min(window.innerHeight / 2, 300)
  const top = document.elementFromPoint(cx, cy)
  const productLink = document.querySelector('a[href*="/product/"]')
  let productHit = null
  if (productLink) {
    const r = productLink.getBoundingClientRect()
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40))
    productHit = { reaches: Boolean(el && el.closest && el.closest('a[href*="/product/"]')), top: elDesc(el) }
  }
  let topPointerEvents = null
  try { topPointerEvents = top ? getComputedStyle(top).pointerEvents : null } catch { /* ignore */ }
  return {
    route: location.pathname,
    centreTop: elDesc(top),
    centrePointerEvents: topPointerEvents,
    productHit,
    wheelModal: Boolean(document.querySelector('.wheel-modal')),
    wheelBackdrop: Boolean(document.querySelector('.wheel-backdrop')),
    bodyOverflow: (() => { try { return getComputedStyle(document.body).overflow } catch { return null } })(),
    bodyPointerEvents: (() => { try { return getComputedStyle(document.body).pointerEvents } catch { return null } })(),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    productCount: document.querySelectorAll('a[href*="/product/"]').length,
  }
}

export function getDiagDetailed() { return { snapshot: snapshotDom(), events: ring.slice() } }

// Install global lifecycle listeners once (browser only). Auto-records the
// visibility/network transitions that bound a long-idle recovery window, plus a
// capture-phase pointerdown that records whether the tap reached a product card
// or hit an overlay — the single most useful signal for the real-device repro.
let installed = false
export function installLifecycleDiag() {
  if (installed || typeof window === 'undefined') return
  installed = true
  document.addEventListener('visibilitychange', () => logDiag('visibility'))
  window.addEventListener('online', () => logDiag('online'))
  window.addEventListener('offline', () => logDiag('offline'))
  window.addEventListener('pageshow', (e) => logDiag('pageshow', { persisted: Boolean(e.persisted) }))
  // Capture-phase so we see the tap even if something calls stopPropagation.
  document.addEventListener('pointerdown', (e) => {
    try {
      const link = e.target && e.target.closest && e.target.closest('a[href*="/product/"]')
      const top = document.elementFromPoint(e.clientX, e.clientY)
      const overCard = Boolean(top && top.closest && top.closest('a[href*="/product/"]'))
      // Only record taps aimed at product cards or where the top element differs
      // from a product link (potential overlay) — avoids logging every scroll tap.
      if (link || overCard || (top && top.closest && top.closest('a,button'))) {
        logDiag('tap', {
          onProductLink: Boolean(link),
          topReachesCard: overCard,
          top: elDesc(top),
          pe: (() => { try { return top ? getComputedStyle(top).pointerEvents : null } catch { return null } })(),
        })
      }
    } catch { /* never break the tap */ }
  }, { capture: true, passive: true })
  try { window.__lavDiag = getDiag; window.__lavDiagDetailed = getDiagDetailed } catch { /* ignore */ }
  logDiag('diag-installed')
}
