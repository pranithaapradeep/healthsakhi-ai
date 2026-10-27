import { MessageCircle, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { listConversations } from '../api/conversations'
import type { ConversationSummary } from '../api/types'
import { Link } from 'react-router'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGES } from '../i18n/strings'
import Alert from './ui/Alert'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import Spinner from './ui/Spinner'

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: ConversationSummary[] }

export default function ConversationList({ limit = 20, emptyAction }: { limit?: number; emptyAction?: ReactNode }) {
  const { t, lang } = useLanguage()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ kind: 'loading' })
    listConversations(limit, ctrl.signal)
      .then((items) => setState({ kind: 'ready', items }))
      .catch(() => !ctrl.signal.aborted && setState({ kind: 'error' }))
    return () => ctrl.abort()
  }, [limit, attempt])

  if (state.kind === 'loading') return <Spinner label={t('common.loading')} />
  if (state.kind === 'error') {
    return (
      <Alert
        tone="warning"
        title={t('history.loadError')}
        action={<Button variant="secondary" onClick={retry} icon={<RotateCw className="size-4" aria-hidden />}>{t('common.retry')}</Button>}
      />
    )
  }
  if (state.items.length === 0) {
    return <EmptyState icon={<MessageCircle className="size-8" aria-hidden />} title={t('history.empty')} action={emptyAction} />
  }

  const bcp47 = LANGUAGES.find((l) => l.code === lang)?.bcp47 ?? 'en-IN'
  const fmt = new Intl.DateTimeFormat(bcp47, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {state.items.map((c) => (
        <li key={c.id}>
          <Link to={`/chat?c=${encodeURIComponent(c.id)}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
            <span className="min-w-0 truncate font-medium text-slate-900" lang={c.language}>{c.title || t('history.untitled')}</span>
            <time dateTime={c.updated_at} className="shrink-0 text-xs text-slate-500">{fmt.format(new Date(c.updated_at))}</time>
          </Link>
        </li>
      ))}
    </ul>
  )
}
