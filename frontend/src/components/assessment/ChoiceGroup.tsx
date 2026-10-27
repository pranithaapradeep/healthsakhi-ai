import { useId } from 'react'

interface Props<T extends string> {
  legend: string
  options: readonly T[]
  value: T | null
  onChange: (v: T) => void
  labelFor: (v: T) => string
  name: string
  /** Shown after a submit attempt when this question still has no answer. */
  invalid?: boolean
}

/** Accessible radio group: real radio inputs inside large tappable rows (comfortable on phones). */
export default function ChoiceGroup<T extends string>({ legend, options, value, onChange, labelFor, name, invalid = false }: Props<T>) {
  const id = useId()
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2 text-[1.0625rem] font-semibold leading-snug text-ink">
        {invalid && <span className="size-2 shrink-0 rounded-full bg-red-600" aria-hidden />}
        {legend}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o
          return (
            <label
              key={o}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[0.9375rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-700 ${
                selected
                  ? 'border-forest-700 bg-forest-50 font-medium text-forest-950 ring-1 ring-forest-700'
                  : invalid
                    ? 'border-red-300 bg-white text-slate-800 hover:bg-sage-50'
                    : 'border-line bg-white text-slate-800 hover:border-forest-300 hover:bg-sage-50'
              }`}
            >
              <input
                type="radio"
                name={`${name}-${id}`}
                value={o}
                checked={selected}
                onChange={() => onChange(o)}
                className="size-4 shrink-0 accent-forest-700 focus-visible:outline-none"
              />
              {labelFor(o)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
