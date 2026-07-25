import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [ready, setReady] = useState(false)   // recovery sessiyası hazırdırmı
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  // Linkdən gələn recovery sessiyasını gözləyirik
  useEffect(() => {
    if (!supabase) return
    const url = new URL(window.location.href)
    const restore = url.searchParams.get('code')
      ? supabase.auth.exchangeCodeForSession(url.href).then(({ error }) => {
          if (!error) window.history.replaceState({}, document.title, `${url.pathname}${url.hash}`)
        })
      : Promise.resolve()
    restore.then(() => supabase.auth.getSession()).then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (password.length < 6) { setErr(t('password_short')); return }
    setBusy(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/auth', { replace: true }), 2500)
    } catch (e2) {
      setErr(String(e2.message || ''))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="container auth-page">
        <div className="order-success">
          <div className="order-check">✓</div>
          <h1>{t('password_updated')}</h1>
          <Link to="/auth" className="btn btn-primary">{t('sign_in')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container auth-page">
      <div className="auth-box">
        <h1 className="page-title" style={{ fontSize: '1.8rem' }}>{t('set_new_password')}</h1>

        {!ready ? (
          <p className="admin-sub" style={{ marginTop: 14 }}>{t('reset_link_expired')}</p>
        ) : (
          <form onSubmit={submit} className="login-form" noValidate style={{ marginTop: 14 }}>
            <label className="fld">
              <span>{t('new_password')} *</span>
              <input type="password" value={password} autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            {err && <div className="admin-msg err">{err}</div>}
            <button className="btn btn-primary full" disabled={busy}>
              {busy ? '…' : t('set_new_password')}
            </button>
          </form>
        )}

        <Link to="/auth" className="continue-link">{t('back_to_login')}</Link>
      </div>
    </div>
  )
}
