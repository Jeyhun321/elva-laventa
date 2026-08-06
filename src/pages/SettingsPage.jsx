import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import {
  IconSettings,
  IconUser,
  IconHeart,
  IconBag,
  IconInstagram,
  IconArrow,
} from '../components/Icons.jsx'

// Parametrlər səhifəsi — HAZIRDA yalnız UI.
// Dil dəyişdirici real işləyir (i18n); qalan sətirlər gələcək funksionallıq
// üçün UI-stub-dır (boş handler / toggle state). Backend sonra qoşulacaq.
export default function SettingsPage() {
  const { t, lang, setLang, langs } = useI18n()

  // UI-stub state — hələ heç yerə yazılmır (yalnız görünüş üçün)
  const [notifications, setNotifications] = useState(true)
  const [promoMails, setPromoMails] = useState(false)

  return (
    <div className="container settings-page">
      <header className="settings-hero">
        <span className="settings-hero-icon" aria-hidden="true">
          <IconSettings />
        </span>
        <div>
          <h1 className="settings-title">{t('settings')}</h1>
          <p className="settings-subtitle">{t('settings_subtitle')}</p>
        </div>
      </header>

      {/* Dil — real işləyir */}
      <section className="settings-group" aria-labelledby="set-lang">
        <h2 className="settings-group-title" id="set-lang">{t('settings_language')}</h2>
        <div className="settings-langs">
          {langs.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`settings-lang${l.code === lang ? ' active' : ''}`}
              aria-pressed={l.code === lang}
              onClick={() => setLang(l.code)}
            >
              <b>{l.label}</b>
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bildirişlər — UI-stub */}
      <section className="settings-group" aria-labelledby="set-notif">
        <h2 className="settings-group-title" id="set-notif">{t('settings_notifications')}</h2>
        <ul className="settings-list">
          <ToggleRow
            label={t('settings_push')}
            hint={t('settings_soon')}
            checked={notifications}
            onChange={() => setNotifications((v) => !v)}
          />
          <ToggleRow
            label={t('settings_promo_mail')}
            hint={t('settings_soon')}
            checked={promoMails}
            onChange={() => setPromoMails((v) => !v)}
          />
        </ul>
      </section>

      {/* Hesab qısayolları — mövcud səhifələrə keçidlər */}
      <section className="settings-group" aria-labelledby="set-account">
        <h2 className="settings-group-title" id="set-account">{t('my_account')}</h2>
        <ul className="settings-list">
          <LinkRow to="/favorites" Icon={IconHeart} label={t('favorites')} />
          <LinkRow to="/cart" Icon={IconBag} label={t('cart')} />
          <LinkRow to="/auth" Icon={IconUser} label={t('sign_in')} />
        </ul>
      </section>

      {/* Haqqında — UI-stub */}
      <section className="settings-group" aria-labelledby="set-about">
        <h2 className="settings-group-title" id="set-about">{t('settings_about')}</h2>
        <ul className="settings-list">
          <StubRow label={t('settings_help')} />
          <StubRow label={t('settings_terms')} />
          <StubRow label={t('settings_privacy')} />
          <li className="settings-row settings-row-static">
            <span className="settings-social" aria-hidden="true"><IconInstagram /></span>
            <span className="settings-row-label">Elva LaVenta</span>
            <span className="settings-version">v1.0</span>
          </li>
        </ul>
      </section>

      <Link to="/" className="btn btn-primary settings-back">
        {t('home')} <IconArrow />
      </Link>
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <li className="settings-row">
      <span className="settings-row-main">
        <span className="settings-row-label">{label}</span>
        {hint && <span className="settings-row-hint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`settings-switch${checked ? ' on' : ''}`}
        onClick={onChange}
      >
        <span className="settings-switch-knob" />
      </button>
    </li>
  )
}

function LinkRow({ to, Icon, label }) {
  return (
    <li>
      <Link to={to} className="settings-row settings-row-link">
        <span className="settings-social" aria-hidden="true"><Icon /></span>
        <span className="settings-row-label">{label}</span>
        <span className="settings-row-arrow" aria-hidden="true"><IconArrow /></span>
      </Link>
    </li>
  )
}

// Gələcək funksionallıq üçün UI-stub (klik hələ heç nə etmir)
function StubRow({ label }) {
  return (
    <li>
      <button type="button" className="settings-row settings-row-link" onClick={() => { /* TODO: səhifə sonra əlavə olunacaq */ }}>
        <span className="settings-row-label">{label}</span>
        <span className="settings-row-arrow" aria-hidden="true"><IconArrow /></span>
      </button>
    </li>
  )
}
