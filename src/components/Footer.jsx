import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { CONTACT, WHATSAPP_NUMBER } from '../config.js'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand footer-brand">
              <span className="brand-elva">Elva</span>
              <span className="brand-la">LaVenta</span>
            </Link>
            <p>{t('footer_tagline')}</p>
          </div>

          <div>
            <h4>{t('shop')}</h4>
            <ul>
              <li><Link to="/catalog">{t('new_arrivals')}</Link></li>
              <li><Link to="/catalog?cat=donlar">{t('catalog')}</Link></li>
              <li><Link to="/catalog?cat=ust-geyim">{t('new_arrivals')}</Link></li>
              <li><Link to="/catalog?sale=1">{t('sale')}</Link></li>
            </ul>
          </div>

          <div>
            <h4>{t('contact')}</h4>
            <ul>
              <li>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
                  WhatsApp: {CONTACT.phone}
                </a>
              </li>
              <li><a href={`tel:+${WHATSAPP_NUMBER}`}>{CONTACT.phone}</a></li>
              <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><a href="#contact">{t(CONTACT.address)}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Elva LaVenta. {t('rights')}</span>
        </div>
      </div>
    </footer>
  )
}
