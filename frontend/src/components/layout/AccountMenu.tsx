import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * Log-in link for guests; name + log-out for signed-in users.
 * `className` sets the display (e.g. "hidden md:flex"); without it the menu is shown.
 */
export default function AccountMenu({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutFailed, setLogoutFailed] = useState(false)

  async function onLogout() {
    setLogoutFailed(false)
    try {
      await logout()
      navigate('/')
    } catch {
      setLogoutFailed(true)
    }
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className={`min-h-10 items-center rounded-lg px-3.5 text-sm font-semibold text-forest-800 ring-1 ring-inset ring-forest-200 hover:bg-forest-50 ${className || 'inline-flex'}`}
      >
        {t('nav.login')}
      </Link>
    )
  }
  const initial = user.display_name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className={`items-center gap-1 ${className.replace('inline-flex', 'flex') || 'flex'}`}>
      <Link to="/profile" className="flex max-w-44 items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-ink hover:bg-sage-100">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-200 text-xs font-bold text-forest-900" aria-hidden>
          {initial}
        </span>
        <span className="truncate">{user.display_name}</span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-sage-100 hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden />
        {t('auth.logout')}
      </button>
      {logoutFailed && <span role="alert" className="max-w-48 text-xs text-red-700">{t('auth.logoutFailed')}</span>}
    </div>
  )
}
