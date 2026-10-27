import { useEffect, useState } from 'react'
import { checkHealth } from '../api/health'
import { useLanguage } from '../i18n/LanguageContext'

type State = 'checking' | 'online' | 'degraded' | 'offline'

export default function ServerStatus() {
  const { t } = useLanguage()
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    const ctrl = new AbortController()
    checkHealth(ctrl.signal)
      .then(setState)
      .catch(() => !ctrl.signal.aborted && setState('offline'))
    return () => ctrl.abort()
  }, [])

  const dot = { checking: 'bg-slate-400', online: 'bg-emerald-500', degraded: 'bg-amber-500', offline: 'bg-red-500' }[state]
  return (
    <p className="inline-flex items-center gap-2 text-xs text-slate-500" role="status">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {t(`status.${state}` as const)}
    </p>
  )
}
