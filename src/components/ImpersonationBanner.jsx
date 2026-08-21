import { useNavigate } from 'react-router-dom'
import { useImpersonation } from '../context/ImpersonationContext.jsx'

// Постоянный admin-only баннер, пока owner работает в реальном аккаунте выбранного
// пользователя. Обычные пользователи никогда не имеют impersonation-состояния,
// поэтому баннер им не показывается.
export default function ImpersonationBanner() {
  const { impersonation, isImpersonating, endImpersonation } = useImpersonation()
  const navigate = useNavigate()

  if (!isImpersonating) return null

  const exit = async () => {
    try { await endImpersonation() } finally { navigate('/admin', { replace: true }) }
  }

  return (
    <div className="imp-banner" role="status" aria-live="polite">
      <span className="imp-banner-text">
        Вы вошли в аккаунт: <b>{impersonation.name || '—'}</b> — {impersonation.email}
      </span>
      <button type="button" className="imp-banner-exit" onClick={exit}>
        Вернуться в админку
      </button>
    </div>
  )
}
