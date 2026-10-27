import { useLanguage } from '../../i18n/LanguageContext'

export default function TypingIndicator() {
  const { t } = useLanguage()
  return (
    <div role="status" className="flex items-center gap-3 border-l-2 border-forest-100 pl-4 text-sm text-slate-600 sm:pl-5">
      <span className="flex gap-1" aria-hidden>
        {[0, 160, 320].map((d) => (
          <span key={d} className="size-1.5 animate-pulse rounded-full bg-forest-500 motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      <span>{t('chat.typing')}</span>
    </div>
  )
}
