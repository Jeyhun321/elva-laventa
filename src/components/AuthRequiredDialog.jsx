import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconGoogle } from './Icons.jsx'

export default function AuthRequiredDialog({ open, onClose, returnTo = '' }) {
  const { loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const signIn = async () => {
    setBusy(true)
    setError('')
    try {
      await loginWithGoogle({ selectAccount: true, returnTo })
    } catch {
      setError(t('sign_in_failed'))
      setBusy(false)
    }
  }

  return (
    <div className="auth-required-backdrop" onMouseDown={onClose}>
      <section className="auth-required-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-required-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-required-close" type="button" onClick={onClose} aria-label="Bağla">×</button>
        <h2 id="auth-required-title">{t('sign_in_title')}</h2>
        <p>{t('google_auth_required')}</p>
        <button className="google-btn" type="button" onClick={signIn} disabled={busy}>
          <IconGoogle />
          {busy ? '…' : t('continue_with_google')}
        </button>
        {error && <span className="user-err" role="alert">{error}</span>}
      </section>
    </div>
  )
}
