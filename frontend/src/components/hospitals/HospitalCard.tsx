import { ExternalLink, MapPin, Navigation, Phone } from 'lucide-react'
import { SPECIALTIES, directionsUrl, type Hospital, type Specialty } from '../../api/hospitals'
import { fmt } from '../../i18n/format'
import { useLanguage } from '../../i18n/LanguageContext'

// Department status from the listing. Shown as text, never by colour alone.
const STATUS_STYLE = {
  verified: 'bg-forest-100 text-forest-900',
  listed_unverified: 'bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200',
  not_listed: 'bg-slate-100 text-slate-700',
  unavailable: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200',
} as const

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

interface Props {
  hospital: Hospital
  selected: boolean
  onSelect: () => void
  specialty: Specialty | null
}

/** One hospital as a compact list row: name and distance first, then contact details, then actions. */
export default function HospitalCard({ hospital: h, selected, onSelect, specialty }: Props) {
  const { t } = useLanguage()
  const km = t('hospitals.kmUnit')
  // Only departments the listing itself names; nothing is inferred from the facility type.
  const specialtyLabels = h.specialties
    .filter((s): s is Specialty => (SPECIALTIES as readonly string[]).includes(s))
    .map((s) => t(`specialty.${s}`))
  const missing = 'text-slate-500'

  return (
    <article
      aria-labelledby={`h-${h.id}`}
      data-selected={selected || undefined}
      className={`border-l-[3px] px-4 py-4 transition-colors sm:px-5 ${selected ? 'border-l-forest-700 bg-forest-50/70' : 'border-l-transparent hover:bg-sage-50/60'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={`h-${h.id}`} className="font-sans text-base font-semibold leading-snug text-ink">{h.name}</h3>
        <span className="shrink-0 whitespace-nowrap pt-0.5 text-sm font-semibold text-forest-800">
          {fmt(t('hospitals.distanceAway'), { distance: `${h.distance_km.toFixed(1)} ${km}` })}
        </span>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span>{t(`hospitals.kind.${h.kind}`)}</span>
        {h.operator_type && (
          <>
            <span aria-hidden className="text-slate-300">·</span>
            <span>{t(`hospitals.op.${h.operator_type}`)}</span>
          </>
        )}
        {specialty && h.specialty_status && (
          <span className={`rounded px-1.5 py-0.5 font-medium ${STATUS_STYLE[h.specialty_status]}`}>{t(`hospitals.status.${h.specialty_status}`)}</span>
        )}
      </p>

      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-700">
        <li className="flex gap-2">
          <MapPin className="mt-1 size-3.5 shrink-0 text-slate-400" aria-hidden />
          {h.address ?? <span className={missing}>{t('hospitals.addressMissing')}</span>}
        </li>
        <li className="flex gap-2">
          <Phone className="mt-1 size-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="flex flex-wrap gap-x-3">
            {h.phones.length > 0
              ? h.phones.map((p) => (
                  <a key={p} href={telHref(p)} className="font-semibold text-forest-800 underline decoration-forest-200 underline-offset-2 hover:decoration-forest-700">{p}</a>
                ))
              : <span className={missing}>{t('hospitals.phoneMissing')}</span>}
          </span>
        </li>
        <li className="flex gap-2">
          <ExternalLink className="mt-1 size-3.5 shrink-0 text-slate-400" aria-hidden />
          {h.website ? (
            <a href={h.website} target="_blank" rel="noopener noreferrer" className="font-medium text-forest-800 underline decoration-forest-200 underline-offset-2 hover:decoration-forest-700">
              {t('hospitals.website')}
            </a>
          ) : (
            <span className={missing}>{t('hospitals.websiteMissing')}</span>
          )}
        </li>
        <li className="flex flex-wrap gap-x-4 gap-y-1 pl-5.5 text-[0.8125rem]">
          <span className={h.opening_hours ? '' : missing}>{h.opening_hours ? `${t('hospitals.hours')}: ${h.opening_hours}` : t('hospitals.hoursMissing')}</span>
          <span>{t(`hospitals.er.${h.emergency}`)}</span>
        </li>
        {specialtyLabels.length > 0 && (
          <li className="pl-5.5 text-[0.8125rem]">
            <span className="font-medium">{t('hospitals.listedDepartments')}:</span> {specialtyLabels.join(', ')}
          </li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={directionsUrl(h)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-forest-800 px-3.5 text-sm font-semibold text-white hover:bg-forest-900"
        >
          <Navigation className="size-4" aria-hidden />
          {t('hospitals.directions')}
        </a>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold ring-1 ring-inset ${
            selected ? 'bg-forest-100 text-forest-900 ring-forest-300' : 'text-forest-900 ring-line hover:bg-sage-50 hover:ring-forest-300'
          }`}
        >
          {t('hospitals.showOnMap')}
        </button>
        <span className="w-full text-[0.6875rem] text-slate-500 sm:ml-auto sm:w-auto">
          {t('hospitals.source')}:{' '}
          {h.source.url ? (
            <a href={h.source.url} target="_blank" rel="noopener noreferrer" className="underline">{h.source.name}</a>
          ) : (
            h.source.name
          )}{' '}
          ({h.source.license})
        </span>
      </div>
    </article>
  )
}
