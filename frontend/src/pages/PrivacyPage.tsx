import PageHeader from '../components/ui/PageHeader'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

const SECTIONS: [StringKey, StringKey][] = [
  ['privacy.disclaimerTitle', 'privacy.disclaimerBody'],
  ['privacy.dataTitle', 'privacy.dataBody'],
  ['privacy.thirdPartyTitle', 'privacy.thirdPartyBody'],
  ['privacy.deleteTitle', 'privacy.deleteBody'],
]

export default function PrivacyPage() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('privacy.title')} />
      {/* Reads like a policy page: numbered sections separated by rules, not a stack of cards. */}
      <ol className="divide-y divide-line">
        {SECTIONS.map(([title, body], i) => (
          <li key={title} className="grid gap-2 py-6 first:pt-0 sm:grid-cols-[2.5rem_1fr]">
            <span className="font-display text-lg font-semibold text-terracotta-600" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 className="text-xl font-semibold text-ink">{t(title)}</h2>
              <p className="mt-2 max-w-[68ch] leading-relaxed text-slate-700">{t(body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
