import { LogIn } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessageKey } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Wordmark from '../components/layout/Wordmark'
import { inputClass, labelClass } from '../components/ui/styles'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { t, lang } = useLanguage()
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)
  const isRegister = mode === 'register'
  const hintId = useId()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim()) || password.length < 8 || password.length > 128 || (isRegister && !name.trim())) {
      setError('auth.invalid')
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (isRegister) {
        await auth.register({ display_name: name.trim(), email: email.trim(), password, preferred_language: lang })
      } else {
        await auth.login(email.trim(), password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessageKey(err))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md pt-2 sm:pt-8">
      <div className="rounded-xl border border-line bg-white p-6 shadow-sm sm:p-9">
        <div aria-hidden className="mb-6">
          <Wordmark compact />
        </div>
        <h1 className="text-[1.75rem] font-semibold leading-tight text-ink">{t(isRegister ? 'auth.registerTitle' : 'auth.loginTitle')}</h1>
        <form className="mt-7 space-y-5" onSubmit={onSubmit} noValidate>
          {isRegister && (
            <label className={labelClass}>
              {t('auth.displayName')}
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
            </label>
          )}
          <label className={labelClass}>
            {t('auth.email')}
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
          </label>
          <div>
            <label className={labelClass}>
              {t('auth.password')}
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={8}
                maxLength={128}
                aria-describedby={isRegister ? hintId : undefined}
                required
              />
            </label>
            {isRegister && <p id={hintId} className="mt-1.5 text-xs text-slate-500">{t('auth.passwordHint')}</p>}
          </div>
          {error && <Alert tone="danger">{t(error)}</Alert>}
          <Button type="submit" className="min-h-12 w-full text-[0.9375rem]" loading={busy} icon={<LogIn className="size-4" aria-hidden />}>
            {t(isRegister ? 'auth.submitRegister' : 'auth.submitLogin')}
          </Button>
        </form>
        <p className="mt-7 border-t border-line pt-5 text-sm text-slate-600">
          {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
          <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-forest-800 underline decoration-forest-200 underline-offset-2 hover:decoration-forest-700">
            {t(isRegister ? 'nav.login' : 'nav.register')}
          </Link>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('auth.guestNote')}</p>
      </div>
    </div>
  )
}
