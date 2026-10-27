import { Link } from 'react-router'
import { primaryLinkClass } from '../components/ui/styles'
import { useLanguage } from '../i18n/LanguageContext'

export default function NotFoundPage() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-xl py-16 text-center sm:py-24">
      <p className="font-display text-6xl font-semibold text-terracotta-500" aria-hidden>404</p>
      <h1 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{t('notFound.title')}</h1>
      <Link to="/" className={`mt-8 ${primaryLinkClass} px-5`}>
        {t('notFound.back')}
      </Link>
    </div>
  )
}
