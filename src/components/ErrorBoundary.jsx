import { Component } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { isChunkLoadError, recoverFromStaleChunk } from '../lib/recovery.js'
import { logSystemEvent, readableError } from '../lib/systemLogs.js'

function ErrorBoundaryFallback() {
  const { t } = useI18n()

  return (
    <div className="container checkout-page">
      <div className="order-success" role="alert">
        <h1>{t('recovery_title')}</h1>
        <p className="order-ok-text">{t('recovery_text')}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t('recovery_reload')}
        </button>
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error)) {
      recoverFromStaleChunk(error)
      return
    }

    void logSystemEvent({
      source: 'react',
      event: 'react_error_boundary',
      message: readableError(error),
      details: { componentStack: info?.componentStack || '' },
    })
  }

  render() {
    return this.state.hasError ? <ErrorBoundaryFallback /> : this.props.children
  }
}
