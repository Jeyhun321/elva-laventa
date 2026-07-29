import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext.jsx'
import { useI18n } from '../i18n/I18nContext.jsx'
import {
  IconDress,
  IconBlouse,
  IconSkirt,
  IconTrousers,
  IconCoat,
  IconKnit,
  IconAccessory,
} from './Icons.jsx'

// Kateqoriya id-si → ikon. Tanınmayan id üçün ehtiyat ikon var.
const ICONS = {
  donlar: IconDress,
  bluzalar: IconBlouse,
  etekler: IconSkirt,
  salvarlar: IconTrousers,
  'ust-geyim': IconCoat,
  trikotaj: IconKnit,
  aksesuarlar: IconAccessory,
}

export default function Categories() {
  const { t } = useI18n()
  const { categories } = useCatalog()

  // "Hamısı" bu zolaqda göstərilmir — o, kataloq səhifəsinin filtridir.
  const shown = categories.filter((c) => c.id !== 'all')
  if (!shown.length) return null

  return (
    <section className="section cats-section" aria-labelledby="cats-title">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">{t('cats_eyebrow')}</span>
          <h2 className="section-title" id="cats-title">{t('cats_title')}</h2>
        </div>

        <ul className="cats-row">
          {shown.map((category, i) => {
            const Icon = ICONS[category.id] || IconAccessory
            return (
              <li key={category.id} className="reveal" data-reveal-step={i}>
                <Link className="cat-circle" to={`/catalog?cat=${category.id}`}>
                  <span className="cat-circle-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="cat-circle-label">{t(category.label)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
