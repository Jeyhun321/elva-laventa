import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconUser, IconGoogle } from './Icons.jsx'

export default function UserMenu() {
  const { profile, loading, loginWithGoogle, logout } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const doLogin = async () => {
    setBusy(true); setErr('')
    try {
      await loginWithGoogle()
      // brauzer Google-a yönlənir, burada davam etmir
    } catch {
      setErr(t('sign_in_failed'))
      setBusy(false)
    }
  }

  if (loading) return null

  // Daxil olmayıb → giriş düyməsi
  if (!profile) {
    return (
      <div className="user-menu" ref={ref}>
        <button
          className="header-icon"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t('sign_in')}
        >
          <IconUser />
          <em>{t('sign_in')}</em>
        </button>

        {open && (
          <div className="user-dropdown">
            <h4>{t('sign_in_title')}</h4>
            <p>{t('sign_in_why')}</p>
            <button className="google-btn" onClick={doLogin} disabled={busy}>
              <IconGoogle />
              {busy ? '…' : t('continue_with_google')}
            </button>
            {err && <span className="user-err">{err}</span>}
          </div>
        )}
      </div>
    )
  }

  // Daxil olub → profil
  return (
    <div className="user-menu" ref={ref}>
      <button
        className="header-icon"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('my_account')}
      >
        {profile.avatar
          ? <img className="user-avatar" src={profile.avatar} alt="" referrerPolicy="no-referrer" />
          : <IconUser />}
        <em>{profile.name.split(' ')[0]}</em>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-card">
            {profile.avatar && (
              <img className="user-avatar lg" src={profile.avatar} alt="" referrerPolicy="no-referrer" />
            )}
            <div>
              <b>{profile.name}</b>
              <span>{profile.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm full" onClick={logout}>
            {t('sign_out')}
          </button>
        </div>
      )}
    </div>
  )
}
