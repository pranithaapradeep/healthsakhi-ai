import { HeartHandshake, Lightbulb, Phone, Quote } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import CategoryTiles from '../components/tips/CategoryTiles'
import TipCard from '../components/tips/TipCard'
import Alert from '../components/ui/Alert'
import Spinner from '../components/ui/Spinner'
import type { HealthTip, TipCategory } from '../data/tipTypes'
import { fmt } from '../i18n/format'
import { useLanguage } from '../i18n/LanguageContext'

export default function HealthTipsPage() {
  const { t, lang } = useLanguage()
  const [tips, setTips] = useState<HealthTip[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [category, setCategory] = useState<TipCategory | 'all'>('all')
  const resultsRef = useRef<HTMLElement>(null)

  // The tip text (three languages, ~180 kB) is a separate chunk, loaded when this page opens.
  useEffect(() => {
    let alive = true
    import('../data/healthTips')
      .then((m) => alive && setTips(m.HEALTH_TIPS))
      .catch(() => alive && setLoadFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const results = useMemo(
    () => (tips ? tips.filter((tip) => category === 'all' || tip.category === category) : []),
    [tips, category],
  )

  // Choose a category; if the matching tips start below the visible screen (common on phones), bring them into
  // view. Keyboard focus stays on the tile, so the user can still move to another category.
  function selectCategory(c: TipCategory | 'all') {
    setCategory(c)
    const el = resultsRef.current
    if (!el || typeof window === 'undefined') return
    if (el.getBoundingClientRect().top > window.innerHeight - 80) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }

  return (
    <div>
      <div className="space-y-12">
        {/* Masthead: section label, headline, standfirst — like the front of a health magazine section. */}
        <header className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-12">
          <div className="space-y-5">
            <h1 className="inline-flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-terracotta-700">
              <Lightbulb className="size-4" aria-hidden />
              {t('tips.title')}
            </h1>
            <p className="font-display text-4xl font-semibold leading-[1.12] text-ink sm:text-5xl">{t('tips.heroTitle')}</p>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-700">{t('tips.heroSubtitle')}</p>
            {/* A short wellness quote (decorative quotation mark). */}
            <figure className="max-w-2xl rounded-xl border border-line bg-white px-6 py-5 sm:px-7">
              <Quote className="mb-2 size-5 fill-terracotta-100 text-terracotta-500" strokeWidth={1.5} aria-hidden />
              <blockquote lang={lang}>
                <p className="font-display text-xl italic leading-relaxed text-ink sm:text-[1.375rem]">{t('tips.quote')}</p>
              </blockquote>
              <figcaption className="mt-3 text-sm font-medium text-slate-600">— {t('tips.quoteAuthor')}</figcaption>
            </figure>
            <p className="flex max-w-2xl items-start gap-2 text-[0.9375rem] leading-relaxed text-slate-600">
              <HeartHandshake className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
              {t('tips.comfortNote')}
            </p>
          </div>

          <section aria-labelledby="tips-urgent" className="rounded-xl border border-red-200 border-l-4 border-l-red-600 bg-white p-6">
            <h2 id="tips-urgent" className="font-sans text-lg font-bold text-red-900">{t('tips.urgentTitle')}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{t('tips.urgentBody')}</p>
            <a href="tel:112" className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-6 font-semibold text-white hover:bg-red-800 active:bg-red-900">
              <Phone className="size-4" aria-hidden />
              {t('emergency.call')}
            </a>
          </section>
        </header>

        {/* Categories and the tips they filter sit close together, so the tips are visible soon after a choice. */}
        <div className="space-y-6">
          <section aria-labelledby="tips-topics" className="space-y-2.5">
            <h2 id="tips-topics" className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-500">{t('tips.categories')}</h2>
            <CategoryTiles selected={category} onSelect={selectCategory} />
          </section>

          {loadFailed ? (
            <Alert tone="warning">{t('common.error')}</Alert>
          ) : !tips ? (
            <Spinner label={t('tips.loading')} />
          ) : (
            <section ref={resultsRef} aria-label={t('tips.title')} className="scroll-mt-20 space-y-5">
              <p role="status" className="text-sm font-medium text-slate-600">{fmt(t('tips.count'), { count: results.length })}</p>
              <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                {results.map((tip) => <TipCard key={tip.id} tip={tip} />)}
              </div>
            </section>
          )}
        </div>

        <section aria-labelledby="tips-about" className="max-w-3xl border-t border-line pt-8 text-slate-700">
          <h2 id="tips-about" className="text-xl font-semibold text-ink">{t('tips.aboutTitle')}</h2>
          <p className="mt-2 leading-relaxed">{t('tips.intro')}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('tips.evidenceNote')}</p>
        </section>
      </div>
    </div>
  )
}
