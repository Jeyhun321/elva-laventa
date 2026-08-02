import { lazy } from 'react'
import { logSystemEvent, readableError } from './systemLogs.js'

const RELOAD_KEY = 'lav_chunk_reload_at'
const RELOAD_WINDOW_MS = 30_000
const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk/i

export const isChunkLoadError = (error) => CHUNK_LOAD_ERROR.test(readableError(error))

export const recoverFromStaleChunk = (reason) => {
  if (typeof window === 'undefined') return false

  const now = Date.now()
  const previous = Number(window.sessionStorage.getItem(RELOAD_KEY))
  const message = readableError(reason)

  if (previous && now - previous < RELOAD_WINDOW_MS) {
    void logSystemEvent({
      level: 'warning',
      source: 'recovery',
      event: 'chunk_reload_suppressed',
      message,
    })
    return false
  }

  window.sessionStorage.setItem(RELOAD_KEY, String(now))
  void logSystemEvent({
    level: 'warning',
    source: 'recovery',
    event: 'chunk_reload',
    message,
  })
  window.location.reload()
  return true
}

export const lazyWithRetry = (factory) => lazy(() => factory().catch((error) => {
  if (isChunkLoadError(error)) recoverFromStaleChunk(error)
  throw error
}))

export const installGlobalRecovery = () => {
  if (typeof window === 'undefined') return () => {}

  const recover = (reason) => {
    if (isChunkLoadError(reason)) recoverFromStaleChunk(reason)
  }
  const onError = (event) => recover(event?.error || event?.message)
  const onUnhandledRejection = (event) => recover(event?.reason)

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}
