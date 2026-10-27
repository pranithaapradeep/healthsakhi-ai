import { Trash2 } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { errorMessageKey } from '../api/errors'
import { deleteAccount } from '../api/profile'
import { useAuth } from '../auth/AuthContext'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { inputClass, labelClass, primaryLinkClass } from '../components/ui/styles'
import LanguageSelector from '../components/layout/LanguageSelector'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

export default function ProfilePage() {
  const { t } = useLanguage()
  const { user, status, clear } = useAuth()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState<StringKey | null>(null)
  const [deleted, setDeleted] = useState(false)
  const passwordId = useId()

  const close = useCallback(() => {
    setConfirming(false)
    setPassword('')
    setDialogError(null)
  }, [])

  async function confirmDelete() {
    setBusy(true)
    setDialogError(null)
    try {
      await deleteAccount(password)
      close()
      clear()
      setDeleted(true)
    } catch (err) {
      setDialogError(err instanceof ApiError && err.status === 403 ? 'profile.passwordIncorrect' : errorMessageKey(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('profile.title')} />
      {deleted && <Alert tone="success">{t('profile.deleted')}</Alert>}

      {status === 'loading' ? (
        <Spinner label={t('common.loading')} />
      ) : user ? (
        <div className="flex items-center gap-4 rounded-xl border border-line bg-white p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage-200 text-lg font-bold text-forest-900" aria-hidden>
            {user.display_name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink">{user.display_name}</p>
            <p className="truncate text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
      ) : (
        <EmptyState
          title={t('profile.loginRequired')}
          action={
            <Link to="/login" className={primaryLinkClass}>
              {t('nav.login')}
            </Link>
          }
        />
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-sans text-base font-semibold text-ink">{t('profile.preferredLang')}</h2>
        <LanguageSelector />
      </section>

      {user && (
        <section className="space-y-3 rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-white p-5">
          <p className="text-sm leading-relaxed text-slate-700">{t('privacy.deleteBody')}</p>
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirming(true)}>
            {t('profile.deleteData')}
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        danger
        busy={busy}
        confirmDisabled={password.length === 0}
        title={t('profile.deleteData')}
        body={t('profile.deleteConfirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onCancel={close}
        onConfirm={confirmDelete}
      >
        <label htmlFor={passwordId} className={labelClass}>{t('profile.passwordPrompt')}</label>
        <input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={password}
          maxLength={128}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {dialogError && <Alert tone="danger">{t(dialogError)}</Alert>}
      </ConfirmDialog>
    </div>
  )
}
