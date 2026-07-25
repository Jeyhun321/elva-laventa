import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconUser, IconGoogle } from './Icons.jsx'

export default function UserMenu() {
  const { profile, accounts, loading, loginWithGoogle, switchToSavedAccount, logout } = useAuth()
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
      await loginWithGoogle({ selectAccount: true })
      // brauzer Google-a yönlənir, burada davam etmir
    } catch {
      setErr(t('sign_in_failed'))
      setBusy(false)
    }
  }

  const addAccount = async () => {
    setBusy(true); setErr('')
    try {
      // Google покажет список уже добавленных аккаунтов и позволит выбрать другой.
      await loginWithGoogle({ selectAccount: true })
    } catch {
      setErr(t('sign_in_failed'))
      setBusy(false)
    }
  }

  const selectSavedAccount = async (account) => {
    setBusy(true); setErr('')
    try {
      await switchToSavedAccount(account)
      setOpen(false)
      setBusy(false)
    } catch {
      try {
        await loginWithGoogle({ selectAccount: true, loginHint: account.email })
      } catch {
        setErr(t('sign_in_failed'))
        setBusy(false)
      }
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
            {accounts.length > 0 && (
              <div className="saved-accounts saved-accounts-before-login">
                <span className="saved-accounts-title">Bu cihazdakı hesablar</span>
                {accounts.map((account) => (
                  <button
                    className="saved-account"
                    type="button"
                    key={account.id}
                    onClick={() => selectSavedAccount(account)}
                    disabled={busy}
                  >
                    {account.avatar ? <img src={account.avatar} alt="" referrerPolicy="no-referrer" /> : <IconUser />}
                    <span><b>{account.name}</b><small>{account.email}</small></span>
                  </button>
                ))}
              </div>
            )}
            <button className="google-btn" onClick={doLogin} disabled={busy}>
              <IconGoogle />
              {busy ? '…' : t('continue_with_google')}
            </button>
            {err && <span className="user-err">{err}</span>}

            <div className="auth-divider"><span>{t('or_divider')}</span></div>

            <Link to="/auth" className="btn btn-ghost btn-sm full" onClick={() => setOpen(false)}>
              {t('sign_in')}
            </Link>
            <Link to="/auth?mode=signup" className="btn btn-primary btn-sm full"
              style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
              {t('sign_up')}
            </Link>
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
          {accounts.length > 0 && (
            <div className="saved-accounts">
              <span className="saved-accounts-title">Bu cihazdakı hesablar</span>
              {accounts.map((account) => (
                <button
                  className={`saved-account ${account.id === profile.id ? 'current' : ''}`}
                  type="button"
                  key={account.id}
                  onClick={() => selectSavedAccount(account)}
                  disabled={busy}
                >
                  {account.avatar ? <img src={account.avatar} alt="" referrerPolicy="no-referrer" /> : <IconUser />}
                  <span><b>{account.name}</b><small>{account.email}</small></span>
                  {account.id === profile.id && <em>Aktiv</em>}
                </button>
              ))}
            </div>
          )}
          <button className="google-btn account-switch" onClick={addAccount} disabled={busy}>
            <IconGoogle />
            {busy ? '…' : 'Hesab əlavə et'}
          </button>
          {err && <span className="user-err">{err}</span>}
          <button className="btn btn-ghost btn-sm full" onClick={logout}>
            {t('sign_out')}
          </button>
        </div>
      )}
    </div>
  )
}
