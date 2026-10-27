import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useLanguage } from '../../i18n/LanguageContext'
import EmergencyBanner from '../EmergencyBanner'
import AccountMenu from './AccountMenu'
import LanguageSelector from './LanguageSelector'
import { NAV_ITEMS } from './nav'
import Wordmark from './Wordmark'

// Desktop: plain text links with a forest underline for the current page.
const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `relative px-1 py-5 text-[0.9375rem] font-medium transition-colors after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full ${
    isActive ? 'text-forest-900 after:bg-forest-700' : 'text-slate-600 after:bg-transparent hover:text-ink hover:after:bg-line'
  }`

// Mobile: full-width rows with a left bar for the current page.
const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center gap-3 border-l-[3px] px-3 text-base font-medium ${
    isActive ? 'border-forest-700 bg-forest-50 text-forest-900' : 'border-transparent text-slate-700 hover:bg-sage-50'
  }`

export default function Navbar() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="-my-1 shrink-0 rounded-lg py-3" aria-label="HealthSakhi AI">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden flex-1 items-center gap-5 lg:flex">
          {NAV_ITEMS.slice(0, 5).map(({ to, key }) => (
            <NavLink key={to} to={to} className={desktopLink}>{t(key)}</NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 py-2.5 sm:gap-3">
          <LanguageSelector className="hidden sm:flex" />
          <AccountMenu className="hidden md:inline-flex" />
          <EmergencyBanner compact />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-sage-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('nav.menu')}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-white pb-4 lg:hidden">
          <ul className="divide-y divide-line/70">
            {NAV_ITEMS.map(({ to, key, Icon }) => (
              <li key={to}>
                <NavLink to={to} className={mobileLink}>
                  <Icon className="size-5 text-forest-700" aria-hidden />
                  {t(key)}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4">
            <LanguageSelector className="flex sm:hidden" />
            <AccountMenu className="inline-flex md:hidden" />
          </div>
        </nav>
      )}
    </header>
  )
}
