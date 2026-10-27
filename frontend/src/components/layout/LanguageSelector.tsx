import { ChevronDown, Languages } from 'lucide-react'
import { useId } from 'react'
import { LANGUAGES, isLang } from '../../i18n/strings'
import { useLanguage } from '../../i18n/LanguageContext'

export default function LanguageSelector({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLanguage()
  const id = useId()
  return (
    // `className` sets the display (e.g. "hidden sm:flex"); without it the selector is shown.
    <div className={`relative items-center ${className || 'flex'}`}>
      <Languages className="pointer-events-none absolute left-2.5 size-4 text-forest-700" aria-hidden />
      <label htmlFor={id} className="sr-only">{t('lang.label')}</label>
      <select
        id={id}
        value={lang}
        onChange={(e) => isLang(e.target.value) && setLang(e.target.value)}
        className="min-h-10 appearance-none rounded-lg border border-line bg-white py-1.5 pl-8 pr-8 text-sm font-medium text-ink hover:border-forest-300 focus:border-forest-600"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>{l.nativeName}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-slate-500" aria-hidden />
    </div>
  )
}
