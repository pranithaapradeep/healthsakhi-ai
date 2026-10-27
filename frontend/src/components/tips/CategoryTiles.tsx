import { useId } from 'react'
import { TIP_IMAGES } from '../../data/tipImages.generated'
import { TIP_IMAGE_ALT } from '../../data/tipImageAlt'
import { TIP_CATEGORIES, type TipCategory } from '../../data/tipTypes'
import { useLanguage } from '../../i18n/LanguageContext'
import TipImage from './TipImage'

interface Props {
  selected: TipCategory | 'all'
  onSelect: (c: TipCategory | 'all') => void
}

/** A compact navigation tile: small thumbnail beside the category name. */
function Tile({ value, selected, onSelect }: { value: TipCategory | 'all'; selected: boolean; onSelect: () => void }) {
  const { t, lang } = useLanguage()
  const ids = { title: useId(), sub: useId() }
  const title = value === 'all' ? t('tips.allTitle') : t(`tips.cat.${value}`)
  const sub = t(`tips.sub.${value}`)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-labelledby={ids.title}
      aria-describedby={ids.sub}
      title={sub}
      onClick={onSelect}
      className={`flex min-h-14 items-center gap-2.5 rounded-lg p-1.5 pr-2.5 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 ${
        selected ? 'bg-forest-50 ring-2 ring-forest-700' : 'bg-white ring-line hover:bg-sage-50 hover:ring-forest-300'
      }`}
    >
      {/* "All tips" uses its illustrated icon; categories use their photo (or illustration if it is missing). */}
      <TipImage
        image={value === 'all' ? undefined : TIP_IMAGES[`cat:${value}`]}
        category={value}
        alt={value === 'all' ? '' : (TIP_IMAGE_ALT[`cat:${value}`]?.[lang] ?? '')}
        decorative
        className="size-11 shrink-0 rounded-md"
        small
      />
      <span className="flex min-w-0 flex-col">
        <span
          id={ids.title}
          className={`line-clamp-2 text-sm font-semibold leading-tight ${selected ? 'text-forest-900' : 'text-ink'}`}
        >
          {title}
        </span>
        {/* Short subtitle on wider screens only; screen readers always get it as the description. */}
        <span id={ids.sub} className="hidden truncate text-xs leading-snug text-slate-500 sm:block">
          {sub}
        </span>
      </span>
    </button>
  )
}

export default function CategoryTiles({ selected, onSelect }: Props) {
  const { t } = useLanguage()
  return (
    <div role="group" aria-label={t('tips.categories')} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {(['all', ...TIP_CATEGORIES] as const).map((c) => (
        <Tile key={c} value={c} selected={c === selected} onSelect={() => onSelect(c)} />
      ))}
    </div>
  )
}
