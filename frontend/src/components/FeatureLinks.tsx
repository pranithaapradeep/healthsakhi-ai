import { ArrowRight, ClipboardList, Lightbulb, MapPin, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

/** The four main services. Each has its own accent so they are easy to tell apart. */
export const FEATURES: { to: string; title: StringKey; body: StringKey; nav: StringKey; Icon: typeof MessageCircle; tint: string }[] = [
  { to: '/chat', title: 'feature.chat.title', body: 'feature.chat.body', nav: 'nav.chat', Icon: MessageCircle, tint: 'bg-forest-100 text-forest-800' },
  { to: '/assessment', title: 'feature.assessment.title', body: 'feature.assessment.body', nav: 'nav.assessment', Icon: ClipboardList, tint: 'bg-terracotta-100 text-terracotta-700' },
  { to: '/hospitals', title: 'feature.hospitals.title', body: 'feature.hospitals.body', nav: 'nav.hospitals', Icon: MapPin, tint: 'bg-sky-100 text-sky-800' },
  { to: '/tips', title: 'feature.tips.title', body: 'feature.tips.body', nav: 'nav.tips', Icon: Lightbulb, tint: 'bg-amber-100 text-amber-800' },
]

/** A divided list of service links (not a grid of identical cards). */
export default function FeatureLinks({ items = FEATURES, label = 'title' }: { items?: typeof FEATURES; label?: 'title' | 'nav' }) {
  const { t } = useLanguage()
  return (
    <ul className="divide-y divide-line">
      {items.map(({ to, title, body, nav, Icon, tint }) => (
        <li key={to}>
          <Link to={to} className="group flex items-start gap-4 px-1 py-4 transition-colors hover:bg-sage-50 sm:px-2">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${tint}`} aria-hidden>
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink group-hover:text-forest-900">{t(label === 'nav' ? nav : title)}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{t(body)}</span>
            </span>
            <ArrowRight
              className="mt-3 size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-forest-700"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
