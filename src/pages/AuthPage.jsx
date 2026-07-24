import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconGoogle } from '../components/Icons.jsx'
import { isValidWhatsApp } from './CheckoutPage.jsx'

const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())

export default function AuthPage() {
  const { t } = useI18n()
  const { user, signUp, signInWithPassword, loginWithGoogle, sendPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const raw = params.get('mode')
  const mode = raw === 'signup' ? 'signup' : raw === 'reset' ? 'reset' : 'login'
  const setMode = (m) => setParams(m === 'login' ? {} : { mode: m })
  const [resetSent, setResetSent] = useState(false)

  const [f, setF] = useState({
    email: '', password: '', fullName: '', phone: '', birthDate: '',
  })
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmSent, setConfirmSent] = useState(false)

  // Artıq daxil olubsa, burada qalmağa ehtiyac yoxdur
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const errors = {
    email: !f.email.trim() ? t('required_field') : emailOk(f.email) ? '' : t('email_invalid'),
    password: !f.password ? t('required_field')
      : f.password.length < 6 ? t('password_short') : '',
    fullName: mode === 'signup' && !f.fullName.trim() ? t('required_field') : '',
    phone: mode === 'signup'
      ? (!f.phone.trim() ? t('required_field')
        : isValidWhatsApp(f.phone) ? '' : t('whatsapp_invalid'))
      : '',
  }
  const valid = !errors.email && !errors.password && !errors.fullName && !errors.phone

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ email: true, password: true, fullName: true, phone: true })
    setErr('')
    if (!valid) return

    setBusy(true)
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await signUp(f)
        if (needsConfirm) setConfirmSent(true)
        else navigate('/', { replace: true })
      } else {
        await signInWithPassword(f.email, f.password)
        navigate('/', { replace: true })
      }
    } catch (e2) {
      const m = String(e2.message || '')
      if (/already registered|already been registered/i.test(m)) setErr(t('email_taken'))
      else if (/email not confirmed/i.test(m)) setErr(t('email_not_confirmed'))
      else if (/invalid login credentials/i.test(m)) setErr(t('wrong_credentials'))
      else setErr(m)
    } finally {
      setBusy(false)
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    setTouched({ email: true })
    setErr('')
    if (!emailOk(f.email)) return
    setBusy(true)
    try {
      await sendPasswordReset(f.email)
      setResetSent(true)
    } catch (e2) {
      setErr(String(e2.message || ''))
    } finally {
      setBusy(false)
    }
  }

  // --- Şifrə bərpası (link göndər) ---
  if (mode === 'reset') {
    if (resetSent) {
      return (
        <div className="container auth-page">
          <div className="order-success">
            <div className="order-check">✉</div>
            <h1>{t('reset_title')}</h1>
            <p className="order-ok-text">{t('reset_sent')}</p>
            <button className="btn btn-ghost" onClick={() => { setResetSent(false); setMode('login') }}>
              {t('sign_in')}
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="container auth-page">
        <div className="auth-box">
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>{t('reset_title')}</h1>
          <p className="admin-sub" style={{ marginBottom: 18 }}>{t('reset_intro')}</p>
          <form onSubmit={submitReset} className="login-form" noValidate>
            <label className="fld">
              <span>{t('field_email')} *</span>
              <input type="email" value={f.email} autoComplete="email" placeholder="ad@gmail.com"
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                className={touched.email && !emailOk(f.email) ? 'invalid' : ''} />
              {touched.email && !emailOk(f.email) && <em className="fld-err">{t('email_invalid')}</em>}
            </label>
            {err && <div className="admin-msg err">{err}</div>}
            <button className="btn btn-primary full" disabled={busy}>
              {busy ? '…' : t('send_link')}
            </button>
          </form>
          <p className="auth-switch">
            <button className="link-btn" onClick={() => setMode('login')}>{t('back_to_login')}</button>
          </p>
        </div>
      </div>
    )
  }

  // --- Təsdiq məktubu göndərildi ---
  if (confirmSent) {
    return (
      <div className="container auth-page">
        <div className="order-success">
          <div className="order-check">✉</div>
          <h1>{t('confirm_sent_title')}</h1>
          <p className="order-ok-text">{t('confirm_sent_text')}</p>
          <p className="fld-note" style={{ marginBottom: 20 }}>{t('check_spam')}</p>
          <button className="btn btn-ghost" onClick={() => { setConfirmSent(false); setMode('login') }}>
            {t('sign_in')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container auth-page">
      <div className="auth-box">
        <h1 className="page-title" style={{ fontSize: '1.8rem' }}>
          {mode === 'signup' ? t('sign_up') : t('sign_in_title')}
        </h1>
        <p className="admin-sub" style={{ marginBottom: 18 }}>{t('sign_in_why')}</p>

        <button className="google-btn" onClick={() => loginWithGoogle().catch(() => setErr(t('sign_in_failed')))}>
          <IconGoogle /> {t('continue_with_google')}
        </button>

        <div className="auth-divider"><span>{t('or_divider')}</span></div>

        <form onSubmit={submit} className="login-form" noValidate>
          {mode === 'signup' && (
            <>
              <label className="fld">
                <span>{t('field_name')} *</span>
                <input value={f.fullName} autoComplete="name"
                  onChange={(e) => set('fullName', e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, fullName: true }))}
                  className={touched.fullName && errors.fullName ? 'invalid' : ''} />
                {touched.fullName && errors.fullName && <em className="fld-err">{errors.fullName}</em>}
              </label>

              <label className="fld">
                <span>{t('field_phone')} *</span>
                <input type="tel" inputMode="tel" value={f.phone} autoComplete="tel"
                  placeholder={t('phone_hint')}
                  onChange={(e) => set('phone', e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
                  className={touched.phone && errors.phone ? 'invalid' : ''} />
                {touched.phone && errors.phone && <em className="fld-err">{errors.phone}</em>}
              </label>

              <label className="fld">
                <span>{t('field_birth')}</span>
                <input type="date" value={f.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)} />
              </label>
            </>
          )}

          <label className="fld">
            <span>{t('field_email')} *</span>
            <input type="email" value={f.email} autoComplete="email"
              placeholder="ad@gmail.com"
              onChange={(e) => set('email', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, email: true }))}
              className={touched.email && errors.email ? 'invalid' : ''} />
            {touched.email && errors.email && <em className="fld-err">{errors.email}</em>}
          </label>

          <label className="fld">
            <span>{t('field_password')} *</span>
            <input type="password" value={f.password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(e) => set('password', e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
              className={touched.password && errors.password ? 'invalid' : ''} />
            {touched.password && errors.password && <em className="fld-err">{errors.password}</em>}
          </label>

          {mode === 'login' && (
            <button type="button" className="link-btn forgot-link" onClick={() => setMode('reset')}>
              {t('forgot_password')}
            </button>
          )}

          {err && <div className="admin-msg err">{err}</div>}

          <button className="btn btn-primary full" disabled={busy}>
            {busy ? '…' : mode === 'signup' ? t('sign_up') : t('sign_in')}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signup' ? t('have_account') : t('no_account')}{' '}
          <button className="link-btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
            {mode === 'signup' ? t('sign_in') : t('sign_up')}
          </button>
        </p>

        <Link to="/" className="continue-link">← {t('home')}</Link>
      </div>
    </div>
  )
}
