import { MapPin, Phone, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { categoryLabelKey } from '../../api/safety'
import { useLanguage } from '../../i18n/LanguageContext'

interface Props {
  categories: string[]
  /** 'full' for the symptom checker result; 'alert' for an inline chat alert. */
  variant?: 'full' | 'alert'
}

/** Emergency guidance built from fixed rules and fixed wording — never from AI output. Works without login. */
export default function EmergencyGuidance({ categories, variant = 'full' }: Props) {
  const { t } = useLanguage()
  const labels = categories.map(categoryLabelKey).filter((k): k is NonNullable<typeof k> => k !== null)
  const mentalHealth = categories.includes('self_harm')
  const full = variant === 'full'

  return (
    <section
      role="alert"
      aria-labelledby="emergency-guidance-title"
      className="overflow-hidden rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-red-50 text-red-950"
    >
      <div className="flex items-start gap-3 p-5 sm:gap-4 sm:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-red-700 ring-1 ring-red-200" aria-hidden>
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <h2 id="emergency-guidance-title" className="font-sans text-lg font-bold leading-snug text-red-900">
            {full ? t('urgency.emergency.title') : t('emergency.detectedTitle')}
          </h2>
          <p className="font-medium leading-relaxed">{full ? t('urgency.emergency.body') : t('emergency.detectedBody')}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="tel:112"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-6 text-lg font-bold text-white hover:bg-red-800 active:bg-red-900"
            >
              <Phone className="size-5" aria-hidden />
              {t('emergency.call')}
            </a>
            {full && (
              <Link
                to="/hospitals"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 font-semibold text-red-900 ring-1 ring-inset ring-red-300 hover:bg-red-100"
              >
                <MapPin className="size-5" aria-hidden />
                {t('landing.findHospitals')}
              </Link>
            )}
          </div>

          {mentalHealth && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-red-100">
              <span>{t('emergency.mentalHealth')}</span>
              <a href="tel:14416" className="inline-flex min-h-9 items-center gap-1 rounded-md bg-red-100 px-3 font-semibold text-red-900 hover:bg-red-200">
                <Phone className="size-4" aria-hidden />
                {t('emergency.callTeleManas')}
              </a>
            </p>
          )}

          {full && <p className="text-sm leading-relaxed">{t('emergency.whileWaiting')}</p>}

          {labels.length > 0 && (
            <div className="border-t border-red-200 pt-3 text-sm">
              <p className="font-semibold">{t('emergency.signs')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 marker:text-red-500">
                {labels.map((k) => <li key={k}>{t(k)}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-red-900/80">{t('emergency.rulesNote')}</p>
        </div>
      </div>
    </section>
  )
}
