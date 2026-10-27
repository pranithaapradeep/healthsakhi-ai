import { History } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import ConversationList from '../components/ConversationList'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { primaryLinkClass } from '../components/ui/styles'
import { useLanguage } from '../i18n/LanguageContext'

export default function HistoryPage() {
  const { t } = useLanguage()
  const { user, status } = useAuth()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('history.title')} />
      {status === 'loading' ? (
        <Spinner label={t('common.loading')} />
      ) : user ? (
        <ConversationList />
      ) : (
        <EmptyState
          icon={<History className="size-8" aria-hidden />}
          title={t('history.loginRequired')}
          action={
            <Link to="/login" className={primaryLinkClass}>
              {t('nav.login')}
            </Link>
          }
        />
      )}
    </div>
  )
}
