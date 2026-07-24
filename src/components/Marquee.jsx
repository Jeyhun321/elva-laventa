import { useI18n } from '../i18n/I18nContext.jsx'

export default function Marquee() {
  const { t } = useI18n()
  const items = [
    t('m_new_collection'),
    t('m_free_delivery'),
    t('m_season_sale'),
    t('m_returns'),
    t('m_premium'),
  ]

  const row = (
    <span>
      {items.map((text, i) => (
        <span key={i}>
          {text} <b>·</b>
        </span>
      ))}
    </span>
  )

  return (
    <div className="marquee" id="sale">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  )
}
