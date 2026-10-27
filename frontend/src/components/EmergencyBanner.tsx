import { Phone, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

/** Static emergency guidance. Rendered without login, location, or any network call. */
export default function EmergencyBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage()
  if (compact) {
    return (
      <a
        href="tel:112"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 active:bg-red-900"
      >
        <Phone className="size-4" aria-hidden />
        <span className="whitespace-nowrap">{t('emergency.call')}</span>
      </a>
    )
  }
  return (
    <section
      aria-labelledby="emergency-title"
      className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-l-4 border-red-600 p-5 sm:flex-row sm:items-center sm:gap-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700" aria-hidden>
          <TriangleAlert className="size-5" />
        </span>
        <div className="flex-1">
          <h2 id="emergency-title" className="font-sans text-base font-bold text-red-900">{t('emergency.title')}</h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-slate-700">{t('emergency.body')}</p>
        </div>
        <a
          href="tel:112"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-6 text-base font-bold text-white hover:bg-red-800 active:bg-red-900"
        >
          <Phone className="size-4" aria-hidden />
          {t('emergency.call')}
        </a>
      </div>
    </section>
  )
}
