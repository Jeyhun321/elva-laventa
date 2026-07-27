import { supabase } from './supabase.js'

const PRIVATE_KEY = /pass(word)?|token|secret|authorization|cookie|phone|address|email|note|name/i
const recentEvents = new Map()
const DUPLICATE_WINDOW_MS = 60_000

const safeText = (value, max = 500) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

const cleanValue = (value, depth = 0) => {
  if (value === null || value === undefined) return null
  if (depth > 3) return '[сокращено]'

  if (Array.isArray(value)) {
    return value.slice(0, 8).map((item) => cleanValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .slice(0, 12)
      .reduce((result, [key, item]) => {
        result[key] = PRIVATE_KEY.test(key) ? '[скрыто]' : cleanValue(item, depth + 1)
        return result
      }, {})
  }

  if (typeof value === 'string') {
    return safeText(value)
      .replace(/bearer\s+\S+/gi, 'bearer [скрыто]')
      .replace(/(token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1: [скрыто]')
  }

  return value
}

const isDuplicate = (key) => {
  const now = Date.now()
  const previous = recentEvents.get(key)
  recentEvents.set(key, now)

  if (recentEvents.size > 100) {
    for (const [eventKey, timestamp] of recentEvents) {
      if (now - timestamp > DUPLICATE_WINDOW_MS) recentEvents.delete(eventKey)
    }
  }

  return previous && now - previous < DUPLICATE_WINDOW_MS
}

export const readableError = (reason) => {
  if (!reason) return ''
  if (typeof reason === 'string') return safeText(reason)
  return safeText(reason?.message || reason?.toString?.() || 'Неизвестная ошибка')
}

// Журнал никогда не должен мешать заказу, входу или другим действиям пользователя.
export const logSystemEvent = async ({
  level = 'error',
  source = 'frontend',
  event = 'unknown',
  message = '',
  details = {},
  path = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : null,
} = {}) => {
  try {
    if (!supabase) return

    const cleanMessage = cleanValue(message)
    const duplicateKey = `${level}:${source}:${event}:${cleanMessage}`
    if (isDuplicate(duplicateKey)) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase.rpc('log_system_event', {
      p_level: level,
      p_source: safeText(source, 48),
      p_event: safeText(event, 100),
      p_message: cleanMessage || null,
      p_details: cleanValue(details),
      p_path: safeText(path, 240) || null,
    })
  } catch {
    // Ошибка самого журнала намеренно игнорируется.
  }
}
