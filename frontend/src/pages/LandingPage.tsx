import { ArrowRight, Info, Languages, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import EmergencyBanner from '../components/EmergencyBanner'
import FeatureLinks from '../components/FeatureLinks'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGES } from '../i18n/strings'

export default function LandingPage() {
  const { t } = useLanguage()
  return (
    <div className="space-y-14 sm:space-y-16">
      <div className="grid gap-10 pt-2 sm:pt-6 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-16">
        <section aria-labelledby="hero-title" className="lg:pt-6">
          <p className="text-sm font-semibold tracking-wide text-terracotta-700">{t('app.tagline')}</p>
          <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl lg:text-[3.4rem]">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700">{t('landing.heroBody')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link
              to="/chat"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-forest-800 px-6 text-base font-semibold text-white shadow-sm hover:bg-forest-900 active:bg-forest-950"
            >
              {t('landing.start')}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link
              to="/hospitals"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-base font-semibold text-forest-800 underline decoration-forest-300 underline-offset-4 hover:decoration-forest-700"
            >
              <MapPin className="size-5" aria-hidden />
              {t('landing.findHospitals')}
            </Link>
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <Languages className="size-4 text-forest-700" aria-hidden />
            {LANGUAGES.map((l, i) => (
              <span key={l.code} lang={l.code} className="inline-flex items-center gap-3">
                {i > 0 && <span className="text-slate-300" aria-hidden>·</span>}
                {l.nativeName}
              </span>
            ))}
          </p>
        </section>

        <section aria-labelledby="features-title" className="rounded-2xl border border-line bg-white px-4 py-5 shadow-sm sm:px-6">
          <h2 id="features-title" className="px-1 text-xl font-semibold text-ink sm:px-2">{t('landing.featuresTitle')}</h2>
          <div className="mt-2">
            <FeatureLinks />
          </div>
        </section>
      </div>

      <EmergencyBanner />

      <p className="flex items-start gap-2.5 border-t border-line pt-6 text-sm leading-relaxed text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
        {t('landing.disclaimer')}
      </p>
    </div>
  )
}
