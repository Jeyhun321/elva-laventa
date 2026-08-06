import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { homeTabs } from '../data/homeNav.js'

// Üfüqi sürüşən bölmə vkladkaları (yalnız mobil — CSS ilə desktopda gizlənir).
// Aktiv element brend aksent xətti ilə vurğulanır. Səhifənin özündə üfüqi
// scroll yaratmır — yalnız lentin içində sürüşmə var.
export default function HomeCategoryTabs() {
  const { t } = useI18n()
  const [active, setActive] = useState(homeTabs[0]?.id)

  return (
    <nav className="home-tabs" aria-label={t('catalog')}>
      <ul className="home-tabs-row">
        {homeTabs.map((tab) => {
          const isActive = tab.id === active
          const cls = `home-tab${isActive ? ' is-active' : ''}`
          const label = t(tab.label)
          const isHash = tab.link.startsWith('/#')

          if (isHash) {
            return (
              <li key={tab.id}>
                <a
                  href={tab.link.slice(1)}
                  className={cls}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => setActive(tab.id)}
                >
                  {label}
                </a>
              </li>
            )
          }

          return (
            <li key={tab.id}>
              <Link
                to={tab.link}
                className={cls}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setActive(tab.id)}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
