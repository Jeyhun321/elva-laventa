import { useI18n } from '../i18n/I18nContext.jsx'

const POINTS = ['benefit_choice', 'benefit_contact', 'benefit_languages']

export default function BenefitsSection() {
  const { t } = useI18n()

  return (
    <section className="benefits-section" aria-labelledby="benefits-title">
      <div className="container">
        <div className="section-head benefits-head reveal">
          <h2 id="benefits-title" className="section-title">{t('benefits_title')}</h2>
          <p>{t('benefits_intro')}</p>
        </div>
        <ul className="benefits-list">
          {POINTS.map((point, index) => (
            <li className="reveal" data-reveal-step={index} key={point}>
              <span aria-hidden="true">0{index + 1}</span>
              <p>{t(point)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
