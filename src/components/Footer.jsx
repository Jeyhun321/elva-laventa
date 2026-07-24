import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { IconInstagram, IconFacebook, IconTiktok } from './Icons.jsx'
import { CONTACT, WHATSAPP_NUMBER } from '../config.js'

export default function Footer() {
  const { t } = useI18n()
  const [subscribed, setSubscribed] = useState(false)
  const [email, setEmail] = useState('')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Abunə olduqdan sonra sahə yenidən boşalır ki,
  // ikinci e-poçtu da yazmaq mümkün olsun
  const subscribe = (e) => {
    e.preventDefault()
    setSubscribed(true)
    setEmail('')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSubscribed(false), 2500)
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter_placeholder')}
                aria-label={t('newsletter_placeholder')}
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
