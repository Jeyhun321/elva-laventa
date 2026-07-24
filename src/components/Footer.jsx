import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconInstagram, IconFacebook, IconTiktok } from './Icons.jsx'

export default function Footer() {
  const { t } = useI18n()
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = (e) => {
    e.preventDefault()
    setSubscribed(true)
  }

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
            <form className="newsletter" onSubmit={subscribe}>
              <input
                type="email"
                required
                placeholder={t('newsletter_placeholder')}
                aria-label={t('newsletter_placeholder')}
                disabled={subscribed}
              />
              <button type="submit">{subscribed ? t('subscribed') : t('subscribe')}</button>
            </form>
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
            <h4>{t('help')}</h4>
            <ul>
              <li><a href="#contact">{t('delivery_link')}</a></li>
              <li><a href="#contact">{t('returns_link')}</a></li>
              <li><a href="#contact">{t('size_guide')}</a></li>
              <li><a href="#contact">{t('faq')}</a></li>
            </ul>
          </div>

          <div>
            <h4>{t('contact')}</h4>
            <ul>
              <li><a href="tel:+994500000000">+994 50 000 00 00</a></li>
              <li><a href="mailto:salam@elvalaventa.az">salam@elvalaventa.az</a></li>
              <li><a href="#contact">Bakı, Azərbaycan</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Elva LaVenta. {t('rights')}</span>
          <div className="socials">
            <a href="#" aria-label="Instagram"><IconInstagram /></a>
            <a href="#" aria-label="Facebook"><IconFacebook /></a>
            <a href="#" aria-label="TikTok"><IconTiktok /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
