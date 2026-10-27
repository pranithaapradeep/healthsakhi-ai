import { Phone } from 'lucide-react'
import { Link } from 'react-router'
import { useLanguage } from '../../i18n/LanguageContext'
import { NAV_ITEMS } from './nav'
import Wordmark from './Wordmark'

export default function Footer() {
  const { t } = useLanguage()
  return (
    <footer className="mt-20 border-t border-line bg-sage-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Wordmark compact />
          <p className="max-w-md text-sm leading-relaxed text-slate-600">{t('footer.note')}</p>
          <a href="tel:112" className="inline-flex items-center gap-2 text-sm font-semibold text-red-800 hover:underline">
            <Phone className="size-4" aria-hidden />
            {t('emergency.call')}
          </a>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {NAV_ITEMS.slice(1, 5).map(({ to, key }) => (
              <li key={to}>
                <Link to={to} className="text-slate-700 hover:text-forest-800 hover:underline">{t(key)}</Link>
              </li>
            ))}
            <li>
              <Link to="/privacy" className="font-medium text-forest-800 hover:underline">{t('nav.privacy')}</Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
