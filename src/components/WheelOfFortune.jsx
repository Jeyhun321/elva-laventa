import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import useMediaQuery from '../hooks/useMediaQuery.js'
import { IconLock } from './Icons.jsx'
import { getWheelConfig, getWheelStatus, spinWheel, wheelErrorCode } from '../lib/wheel.js'

const WHEEL_REWARD_KEY = 'elva_wheel_reward'
const WHEEL_DISMISS_KEY = 'elva_wheel_dismissed' // окно, которое пользователь закрыл крестиком
// Fallback-набор секторов (визуал), только если сервер недоступен. Реальные
// сектора (проценты, active, показ замка) приходят из get_wheel_public_config.sectors.
// active=true → участвует в розыгрыше; show_lock → показывать иконку замка.
const DISPLAY_SECTORS = [
  { percent: 5, active: true, showLock: false },
  { percent: 10, active: true, showLock: false },
  { percent: 15, active: true, showLock: false },
  { percent: 20, active: false, showLock: true },
  { percent: 30, active: false, showLock: true },
  { percent: 40, active: false, showLock: true },
  { percent: 50, active: false, showLock: true },
]
const ACTIVE_COLORS = ['#e5399a', '#b3155f', '#f7b7d2', '#cf2879', '#f5c9de']
const LOCKED_COLOR = '#d8ccd3'

// Mobile Wheel of Fortune. Trust на сервере: окно (Asia/Baku), результат (weighted)
// и один спин на окно решает БД (spin_wheel). Клиент только анимирует к готовому
// серверному результату. Reload/DevTools не дают повторный спин (UNIQUE + status).
export default function WheelOfFortune() {
  const isMobile = useMediaQuery('(max-width: 900px)')
  const { isSignedIn, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [config, setConfig] = useState(null)
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle')   // idle | spinning | won | error
  const [result, setResult] = useState(null)   // { percent, code }
  const [errKey, setErrKey] = useState('')
  const [rotation, setRotation] = useState(0)
  const spinningRef = useRef(false)
  const dismissedRef = useRef('')

  useEffect(() => {
    try { dismissedRef.current = sessionStorage.getItem(WHEEL_DISMISS_KEY) || '' } catch { /* ignore */ }
  }, [])

  // Сектора для отрисовки: полностью из серверного конфига (percent/active/show_lock).
  // Замок управляется Admin явно (show_lock), а не выводится из active.
  const sectors = useMemo(() => {
    if (Array.isArray(config?.sectors) && config.sectors.length) {
      return [...config.sectors]
        .map((s) => ({
          percent: Number(s.percent),
          active: Boolean(s.active),
          // show_lock приходит с сервера явно (Admin). Пока SQL не применён и поля
          // нет — сохраняем прежнее поведение: замок у неактивных секторов.
          showLock: s.show_lock === undefined ? !s.active : Boolean(s.show_lock),
        }))
        .sort((a, b) => a.percent - b.percent)
    }
    if (Array.isArray(config?.rewards) && config.rewards.length) {
      const active = new Set((config.rewards || []).map(Number))
      return DISPLAY_SECTORS.map((s) => ({ ...s, active: active.has(s.percent), showLock: !active.has(s.percent) }))
    }
    return DISPLAY_SECTORS
  }, [config])

  const refreshStatus = useCallback(async () => {
    try { setStatus(await getWheelStatus()) } catch { /* тихо */ }
  }, [])
  // Конфиг колеса тоже перечитываем периодически: изменения в Admin (сектора,
  // проценты, статусы, замок) появляются на витрине без ручного refresh.
  const refreshConfig = useCallback(async () => {
    try { setConfig(await getWheelConfig()) } catch { /* тихо */ }
  }, [])

  useEffect(() => {
    if (!isMobile) return undefined
    refreshConfig()
    refreshStatus()
    const onVis = () => { if (document.visibilityState === 'visible') { refreshConfig(); refreshStatus() } }
    document.addEventListener('visibilitychange', onVis)
    const timer = window.setInterval(() => { refreshConfig(); refreshStatus() }, 60000) // без агрессивного polling
    return () => { document.removeEventListener('visibilitychange', onVis); window.clearInterval(timer) }
  }, [isMobile, refreshStatus, refreshConfig])

  useEffect(() => { if (isMobile) refreshStatus() }, [isSignedIn, isMobile, refreshStatus])

  // Право на spin прямо сейчас (server — source of truth)
  const canSpinNow = Boolean(
    status?.enabled && status?.in_window && status?.signed_in && !status?.already_spun
  )
  const activeReward = status?.active_reward || null
  const windowKey = status?.window || ''

  // AUTO-OPEN: как только наступило окно и есть право на spin — открываем сами
  // (в т.ч. если пользователь уже был на сайте: сработает на следующем refreshStatus).
  // Не открываем, если пользователь закрыл модал в этом же окне.
  useEffect(() => {
    if (!isMobile) return
    if (open) return
    if (canSpinNow && dismissedRef.current !== windowKey) {
      setPhase('idle'); setResult(null); setErrKey(''); setRotation(0)
      setOpen(true)
    }
  }, [isMobile, open, canSpinNow, windowKey])

  if (!isMobile || !config?.enabled || !status?.enabled) return null

  // CTA (вторичная точка входа): в окне (можно крутить) или есть неиспользованная награда
  const showCta = (canSpinNow || Boolean(activeReward)) && !open

  const openModal = () => {
    setErrKey('')
    if (activeReward) {
      setPhase('won'); setResult({ percent: Number(activeReward.percent), code: activeReward.code })
    } else {
      setPhase('idle'); setResult(null); setRotation(0)
    }
    setOpen(true)
  }

  const close = () => {
    if (spinningRef.current) return
    // Запоминаем окно, чтобы не открывать модал повторно в этом же окне/сессии.
    try { if (windowKey) { sessionStorage.setItem(WHEEL_DISMISS_KEY, windowKey); dismissedRef.current = windowKey } } catch { /* ignore */ }
    setOpen(false)
  }

  const landOn = (percent) => {
    const n = sectors.length
    if (!n) return
    let idx = sectors.findIndex((s) => Number(s.percent) === Number(percent))
    if (idx < 0) idx = 0
    const seg = 360 / n
    // conic стартует сверху по часовой; центр сектора idx = idx*seg + seg/2.
    // Несколько оборотов + подводим центр выигранного сектора к указателю (верх).
    setRotation(360 * 6 - (idx * seg + seg / 2))
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
      landOn(percent)
      window.setTimeout(() => {
        setResult({ percent, code: res.code })
        setPhase('won')
        spinningRef.current = false
        refreshStatus()
      }, 4200)
    } catch (e) {
      const code = wheelErrorCode(e)
      spinningRef.current = false
      setPhase('idle')
      setErrKey(
        code === 'WHEEL_ALREADY_SPUN' ? 'wheel_already_spun'
          : code === 'WHEEL_CLOSED' ? 'wheel_closed'
            : code === 'AUTH_REQUIRED' ? 'wheel_login_required'
              : code === 'WHEEL_DISABLED' ? 'wheel_closed'
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

  const seg = 360 / sectors.length
  const wheelStyle = {
    transform: `rotate(${rotation}deg)`,
    background: sectors.length
      ? `conic-gradient(${sectors.map((s, i) => {
          const from = (100 / sectors.length) * i
          const to = (100 / sectors.length) * (i + 1)
          const color = s.active ? ACTIVE_COLORS[i % ACTIVE_COLORS.length] : LOCKED_COLOR
          return `${color} ${from}% ${to}%`
        }).join(', ')})`
      : '#eee',
  }

  return (
    <>
      {showCta && (
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
                    {sectors.map((s, i) => {
                      const showLock = s.showLock && !s.active
                      return (
                        <span
                          key={s.percent}
                          className={`wheel-label${s.active ? '' : ' locked'}`}
                          style={{ transform: `rotate(${i * seg + seg / 2}deg)` }}
                          title={showLock ? `${s.percent}% — ${t('wheel_locked')}` : `${s.percent}%`}
                        >
                          <b>{s.percent}%{showLock && <IconLock className="wheel-lock-ico" aria-hidden="true" />}</b>
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
                    disabled={phase === 'spinning' || Boolean(status?.already_spun)}
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
