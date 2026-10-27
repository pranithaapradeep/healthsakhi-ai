import { ArrowRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import ConversationList from '../components/ConversationList'
import FeatureLinks, { FEATURES } from '../components/FeatureLinks'
import ServerStatus from '../components/ServerStatus'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import LanguageSelector from '../components/layout/LanguageSelector'
import { useLanguage } from '../i18n/LanguageContext'

export default function DashboardPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const startLink = (
    <Link to="/chat" className="inline-flex min-h-11 items-center rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-900">
      {t('landing.start')}
    </Link>
  )
  return (
    <div>
      <PageHeader
        title={user ? `${t('dashboard.welcome')}, ${user.display_name}` : t('dashboard.welcome')}
        subtitle={t('dashboard.subtitle')}
        actions={<LanguageSelector />}
      />

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div className="space-y-6">
          {/* The main service gets the most space; the others follow as a list. */}
          <section aria-labelledby="dash-chat" className="rounded-2xl bg-forest-900 p-6 text-white sm:p-8">
            <span className="flex size-11 items-center justify-center rounded-lg bg-white/10 text-forest-100" aria-hidden>
              <MessageCircle className="size-5" />
            </span>
            <h2 id="dash-chat" className="mt-5 text-2xl font-semibold text-white">{t('feature.chat.title')}</h2>
            <p className="mt-2 max-w-lg leading-relaxed text-forest-100">{t('feature.chat.body')}</p>
            <Link
              to="/chat"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 font-semibold text-forest-900 hover:bg-forest-50 focus-visible:outline-white"
            >
              {t('nav.chat')}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>

          <FeatureLinks items={FEATURES.slice(1)} label="nav" />
        </div>

        <aside aria-labelledby="recent-title" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h2 id="recent-title" className="text-lg font-semibold text-ink">{t('dashboard.recent')}</h2>
            <ServerStatus />
          </div>
          {user ? (
            <ConversationList limit={5} emptyAction={startLink} />
          ) : (
            <EmptyState icon={<MessageCircle className="size-8" aria-hidden />} title={t('dashboard.noRecent')} action={startLink} />
          )}
        </aside>
      </div>
    </div>
  )
}
