import { ChevronDown, ShieldAlert, Sprout } from 'lucide-react'
import { useId, useState } from 'react'
import { TIP_IMAGES } from '../../data/tipImages.generated'
import { TIP_IMAGE_ALT } from '../../data/tipImageAlt'
import type { Evidence, HealthTip } from '../../data/tipTypes'
import { fmt } from '../../i18n/format'
import { useLanguage } from '../../i18n/LanguageContext'
import TipImage from './TipImage'

// Evidence is named in words; the dot colour only supports the label.
const EVIDENCE_DOT: Record<Evidence, string> = {
  food: 'bg-forest-600',
  traditional: 'bg-terracotta-500',
  limited: 'bg-slate-400',
  habit: 'bg-sky-600',
}

export default function TipCard({ tip }: { tip: HealthTip }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ids = { title: useId(), more: useId() }
  const image = TIP_IMAGES[tip.id]

  return (
    <article aria-labelledby={ids.title} className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <TipImage
        key={image?.src ?? 'none'}
        image={image}
        category={tip.category}
        alt={TIP_IMAGE_ALT[tip.id]?.[lang] ?? tip.title[lang]}
        className="aspect-[3/2] w-full"
      />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-terracotta-700">{t(`tips.cat.${tip.category}`)}</span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className={`size-1.5 rounded-full ${EVIDENCE_DOT[tip.evidence]}`} aria-hidden />
            {t(`tips.evidence.${tip.evidence}`)}
          </span>
        </p>
        <h3 id={ids.title} lang={lang} className="mt-2.5 text-[1.375rem] font-semibold leading-snug text-ink">{tip.title[lang]}</h3>
        <p lang={lang} className="mt-2 text-[1.0625rem] leading-relaxed text-slate-700">{tip.summary[lang]}</p>

        <div className="mt-5 space-y-3 border-l-2 border-forest-200 pl-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-forest-800">
              <Sprout className="size-4" aria-hidden />
              {t('tips.tryThis')}
            </p>
            <p lang={lang} className="mt-1 leading-relaxed text-slate-800">{tip.suggestion[lang]}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-forest-800">{t('tips.howTo')}</p>
            <p lang={lang} className="mt-1 leading-relaxed text-slate-700">{tip.howTo[lang]}</p>
          </div>
        </div>

        <div
          role="note"
          aria-label={t('tips.safety')}
          className="mt-5 flex gap-2.5 rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-3.5 text-[0.9375rem] leading-relaxed text-amber-950"
        >
          <ShieldAlert className="mt-1 size-4 shrink-0 text-amber-700" aria-hidden />
          <p lang={lang}>
            <span className="sr-only">{t('tips.safety')}: </span>
            {tip.safety[lang]}
          </p>
        </div>

        <div className="mt-auto pt-4">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={ids.more}
            onClick={() => setOpen((v) => !v)}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-forest-800 hover:bg-sage-100"
          >
            {open ? t('tips.showLess') : t('tips.learnMore')}
            <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          <div id={ids.more} hidden={!open} className="mt-2 space-y-3 border-t border-line pt-4 leading-relaxed text-slate-700">
            <p lang={lang}>{tip.more[lang]}</p>
            {image && (
              <p className="text-xs text-slate-500">
                <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-slate-700">
                  {fmt(t('tips.photoCredit'), { credit: image.credit, license: image.license })}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
