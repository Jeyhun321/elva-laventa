import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { getWheelConfig, getWheelStatus, spinWheel, wheelErrorCode } from '../lib/wheel.js'

const WHEEL_REWARD_KEY = 'elva_wheel_reward'
const SEGMENT_COLORS = ['#e5399a', '#f7b7d2', '#b3155f', '#f5c9de', '#cf2879', '#fbdcea']

// Mobile Wheel of Fortune. Весь trust на сервере: окно (Asia/Baku), результат
// (weighted) и один спин на окно решает БД. Здесь только приглашение и анимация
// колеса к УЖЕ определённому серверному результату. Reload/DevTools не дают
// повторный спин: spin_wheel атомарно защищён UNIQUE(account_id, window_key).
export default function WheelOfFortune() {
  const isMobile = useMediaQuery('(max-width: 900px)')
  const { isSignedIn, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [config, setConfig] = useState(null)     // { rewards: [percent...] }
  const [status, setStatus] = useState(null)     // { enabled, in_window, already_spun, active_reward, signed_in }
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle')     // idle | spinning | won | error
  const [result, setResult] = useState(null)     // { percent, code }
  const [errKey, setErrKey] = useState('')
  const [rotation, setRotation] = useState(0)
  const spinningRef = useRef(false)

  const segments = useMemo(() => {
    const list = (config?.rewards || []).map(Number).filter((n) => n > 0)
    return list.length ? list : []
  }, [config])

  const refreshStatus = useCallback(async () => {
    try { setStatus(await getWheelStatus()) } catch { /* тихо */ }
  }, [])

  // Конфиг один раз; статус — на монтировании, при возврате вкладки и раз в 60с.
  useEffect(() => {
    if (!isMobile) return undefined
    let alive = true
    getWheelConfig().then((c) => { if (alive) setConfig(c) }).catch(() => {})
    refreshStatus()
    const onVis = () => { if (document.visibilityState === 'visible') refreshStatus() }
    document.addEventListener('visibilitychange', onVis)
    const timer = window.setInterval(refreshStatus, 60000)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); window.clearInterval(timer) }
  }, [isMobile, refreshStatus])

  // Обновляем статус при входе/выходе (reward привязан к аккаунту)
  useEffect(() => { if (isMobile) refreshStatus() }, [isSignedIn, isMobile, refreshStatus])

  if (!isMobile || !config?.enabled || !status?.enabled) return null

  const activeReward = status.active_reward || null
  // Приглашение показываем, когда: сейчас окно (можно крутить) ИЛИ есть неиспользованная награда.
  const canInvite = (status.in_window && !(isSignedIn && status.already_spun)) || Boolean(activeReward)
  if (!canInvite && !open) return null

  const openModal = () => {
    setErrKey('')
    setPhase(activeReward ? 'won' : 'idle')
    setResult(activeReward ? { percent: Number(activeReward.percent), code: activeReward.code } : null)
    setOpen(true)
    refreshStatus()
  }

  const close = () => { if (!spinningRef.current) setOpen(false) }

  const landOn = (percent) => {
    const n = segments.length
    if (!n) return
    const idx = Math.max(0, segments.indexOf(Number(percent)))
    const seg = 360 / n
    // conic-gradient стартует сверху по часовой; центр сегмента idx = idx*seg + seg/2.
    // Крутим на несколько оборотов и подводим центр сегмента к указателю (верх).
    const target = 360 * 6 - (idx * seg + seg / 2)
    setRotation(target)
  }

  const doSpin = async () => {
    if (spinningRef.current) return
    if (!isSignedIn) { setErrKey('wheel_login_required'); return }
    spinningRef.current = true
    setErrKey('')
    setPhase('spinning')
    try {
      const res = await spinWheel() // сервер решает результат
      const percent = Number(res.percent)
      const code = res.code
      landOn(percent)
      // ждём завершения CSS-анимации, затем показываем результат
      window.setTimeout(() => {
        setResult({ percent, code })
        setPhase('won')
        spinningRef.current = false
        refreshStatus()
      }, 4200)
    } catch (e) {
      const code = wheelErrorCode(e)
      spinningRef.current = false
      setPhase('error')
      setErrKey(
        code === 'WHEEL_ALREADY_SPUN' ? 'wheel_already_spun'
          : code === 'AUTH_REQUIRED' ? 'wheel_login_required'
            : 'wheel_error'
      )
      refreshStatus()
    }
  }

  const useReward = () => {
    if (!result?.code) return
    try { sessionStorage.setItem(WHEEL_REWARD_KEY, result.code) } catch { /* ignore */ }
    setOpen(false)
    navigate('/cart')
  }

  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    background: segments.length
      ? `conic-gradient(${segments.map((_, i) => {
          const seg = 100 / segments.length
          const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
          return `${color} ${i * seg}% ${(i + 1) * seg}%`
        }).join(', ')})`
      : '#eee',
  }

  return (
    <>
      {canInvite && !open && (
        <button type="button" className="wheel-invite" onClick={openModal} aria-label={t('wheel_invite_title')}>
          <span className="wheel-invite-emoji" aria-hidden="true">🎡</span>
          <span className="wheel-invite-text">{t('wheel_invite_title')}</span>
        </button>
      )}

      {open && (
        <div className="wheel-backdrop" onClick={close}>
          <div className="wheel-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="wheel-close" onClick={close} aria-label={t('close')}>×</button>

            {phase === 'won' && result ? (
              <div className="wheel-result">
                <h2>{t('wheel_win_title')}</h2>
                <p className="wheel-win-text">{t('wheel_win_text').replace('{percent}', result.percent)}</p>
                <button className="btn btn-primary btn-lg full" onClick={useReward}>{t('wheel_use_reward')}</button>
                <p className="wheel-reward-hint">{t('wheel_reward_hint')}</p>
              </div>
            ) : (
              <>
                <h2 className="wheel-title">{t('wheel_invite_title')}</h2>
                <p className="wheel-sub">{t('wheel_invite_text')}</p>

                <div className="wheel-stage">
                  <span className="wheel-pointer" aria-hidden="true" />
                  <div className="wheel-disc" style={wheelStyle}>
                    {segments.map((p, i) => {
                      const seg = 360 / segments.length
                      return (
                        <span
                          key={i}
                          className="wheel-label"
                          style={{ transform: `rotate(${i * seg + seg / 2}deg)` }}
                        >
                          <b>{p}%</b>
                        </span>
                      )
                    })}
                  </div>
                  <span className="wheel-hub" aria-hidden="true" />
                </div>

                {errKey && <p className="wheel-msg" role="alert">{t(errKey)}</p>}

                {isSignedIn ? (
                  <button
                    className="btn btn-primary btn-lg full"
                    onClick={doSpin}
                    disabled={phase === 'spinning' || status.already_spun}
                  >
                    {phase === 'spinning' ? t('wheel_spinning') : t('wheel_spin')}
                  </button>
                ) : (
                  <button className="btn btn-primary btn-lg full" onClick={() => loginWithGoogle({ selectAccount: true })}>
                    {t('wheel_login_required')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
