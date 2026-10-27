import { ArrowRight, CircleCheck, Phone, Stethoscope, TriangleAlert } from 'lucide-react'
import type { AssessmentResult } from '../../api/assessment'
import { categoryLabelKey } from '../../api/safety'
import { useLanguage } from '../../i18n/LanguageContext'
import EmergencyGuidance from '../safety/EmergencyGuidance'

// Urgency is shown by heading text, an icon and a coloured edge — never by colour alone.
const STYLES = {
  emergency: { edge: 'border-l-red-600', tint: 'bg-red-50', icon: 'bg-red-100 text-red-800', title: 'text-red-900', Icon: TriangleAlert },
  urgent: { edge: 'border-l-amber-500', tint: 'bg-amber-50', icon: 'bg-amber-100 text-amber-800', title: 'text-amber-950', Icon: Stethoscope },
  routine: { edge: 'border-l-forest-600', tint: 'bg-forest-50', icon: 'bg-forest-100 text-forest-800', title: 'text-forest-900', Icon: CircleCheck },
} as const

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="py-5">
      <h3 className="font-sans text-base font-semibold text-ink">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed text-slate-700 marker:text-forest-500">
        {items.map((x, i) => <li key={i} className="pl-1">{x}</li>)}
      </ul>
    </section>
  )
}

export default function AssessmentResultView({ result, safetyCategories }: { result: AssessmentResult; safetyCategories: string[] }) {
  const { t, lang } = useLanguage()
  const s = STYLES[result.urgency]
  const reasons = safetyCategories.map(categoryLabelKey).filter((k): k is NonNullable<typeof k> => k !== null)

  return (
    <div className="space-y-5" lang={lang}>
      {result.urgency === 'emergency' && <EmergencyGuidance categories={safetyCategories} />}

      <section aria-labelledby="urgency-title" className={`rounded-xl border border-line border-l-4 ${s.edge} ${s.tint} p-5 sm:p-6`}>
        <div className="flex items-start gap-4">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${s.icon}`} aria-hidden>
            <s.Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 id="urgency-title" className={`font-sans text-lg font-bold leading-snug ${s.title}`}>{t(`urgency.${result.urgency}.title`)}</h2>
            <p className="leading-relaxed text-slate-800">{t(`urgency.${result.urgency}.body`)}</p>
            {result.urgency !== 'emergency' && result.urgency !== 'routine' && (
              <a href="tel:112" className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-red-800 underline underline-offset-2">
                <Phone className="size-3.5" aria-hidden />
                {t('emergency.call')}
              </a>
            )}
          </div>
        </div>
        {(reasons.length > 0 || result.urgency_source === 'safety_rules') && (
          <div className="mt-4 border-t border-black/10 pt-3 text-sm text-slate-800">
            <p className="font-semibold">{t('assessment.why')}</p>
            {reasons.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {reasons.map((k) => <li key={k}>{t(k)}</li>)}
              </ul>
            )}
            {result.urgency_source === 'safety_rules' && <p className="mt-1">{t('assessment.rulesNote')}</p>}
          </div>
        )}
      </section>

      <div className="overflow-hidden rounded-xl border border-line bg-white px-5 sm:px-7">
        <section className="py-5">
          <h3 className="font-sans text-base font-semibold text-ink">{t('assessment.summary')}</h3>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-slate-800">{result.summary}</p>
        </section>
        <div className="divide-y divide-line border-t border-line">
          <List title={t('assessment.possible')} items={result.possible_explanations} />
          <List title={t('assessment.selfCare')} items={result.self_care} />
          <List title={t('assessment.seekCareIf')} items={result.seek_care_if} />
        </div>
        <section className="-mx-5 mb-0 border-t border-line bg-sage-50 px-5 py-5 sm:-mx-7 sm:px-7">
          <h3 className="flex items-center gap-2 font-sans text-base font-semibold text-forest-900">
            <ArrowRight className="size-4" aria-hidden />
            {t('assessment.nextStep')}
          </h3>
          <p className="mt-1.5 leading-relaxed text-slate-800">{result.recommended_next_step}</p>
        </section>
      </div>
    </div>
  )
}
