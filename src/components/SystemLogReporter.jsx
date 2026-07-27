import { useEffect } from 'react'
import { logSystemEvent, readableError } from '../lib/systemLogs.js'

export default function SystemLogReporter() {
  useEffect(() => {
    const onError = (event) => {
      const message = readableError(event?.message)
      if (!message) return

      void logSystemEvent({
        source: 'frontend',
        event: 'window_error',
        message,
        details: {
          file: event?.filename || null,
          line: event?.lineno || null,
          column: event?.colno || null,
        },
      })
    }

    const onRejection = (event) => {
      const message = readableError(event?.reason)
      if (!message) return

      void logSystemEvent({
        source: 'frontend',
        event: 'unhandled_rejection',
        message,
        details: { type: typeof event?.reason },
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
