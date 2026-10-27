import { MapPin } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { suggestPlaces, type PlaceSuggestion } from '../../api/hospitals'
import { useLanguage } from '../../i18n/LanguageContext'

export const SUGGEST_MIN_CHARS = 3
export const SUGGEST_DEBOUNCE_MS = 400

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

interface Props {
  value: string
  onChange: (text: string) => void
  /** A suggestion was chosen. Fills the field; the parent decides when to search. */
  onPick: (place: PlaceSuggestion) => void
  label: string
  placeholder: string
}

/**
 * Combobox (WAI-ARIA pattern): debounced suggestions after 3+ characters, arrow keys / Enter / Escape,
 * hover highlight, click to pick. Older answers never replace newer ones.
 */
export default function LocationAutocomplete({ value, onChange, onPick, label, placeholder }: Props) {
  const { t, lang } = useLanguage()
  const ids = { input: useId(), list: useId(), hint: useId() }
  const [items, setItems] = useState<PlaceSuggestion[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [attribution, setAttribution] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const picked = useRef<string | null>(null) // text set by picking a suggestion: do not look it up again
  const typed = useRef(false) // only the person's own typing opens suggestions
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /** Stop everything pending and close (used on submit, Escape-like situations). */
  function close() {
    typed.current = false
    seq.current++ // ignore anything still in flight
    clearTimeout(timer.current)
    setOpen(false)
    setActive(-1)
  }

  useEffect(() => {
    const q = value.trim()
    const mine = ++seq.current
    if (!typed.current || q.length < SUGGEST_MIN_CHARS || value === picked.current) {
      setOpen(false)
      setStatus('idle')
      return
    }
    const ctrl = new AbortController()
    timer.current = setTimeout(() => {
      setOpen(true)
      setStatus('loading')
      setActive(-1)
      suggestPlaces(q, lang, ctrl.signal)
        .then((res) => {
          if (mine !== seq.current) return // a newer query has started; drop this answer
          setItems(res.suggestions)
          setAttribution(res.attribution)
          setStatus(res.suggestions.length ? 'ready' : 'empty')
        })
        .catch(() => {
          if (mine !== seq.current) return
          setItems([])
          setStatus('error')
        })
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer.current)
      ctrl.abort()
    }
  }, [value, lang])

  // Submitting the search form (button or Enter) stops pending suggestions: the search itself takes over.
  useEffect(() => {
    const form = rootRef.current?.closest('form')
    if (!form) return
    form.addEventListener('submit', close)
    return () => form.removeEventListener('submit', close)
  }, [])

  // Close when clicking or tapping outside. The listener is attached once, for as long as the field exists:
  // attaching it only after the list opened left a gap (until React ran that effect) in which an outside
  // click was missed and the list stayed open. Closing an already-closed list is a no-op.
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  function pick(item: PlaceSuggestion) {
    const text = item.detail ? `${item.label}, ${item.detail}` : item.label
    picked.current = text
    close()
    onChange(text)
    onPick(item)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const choices = status === 'ready' ? items : []
    if (e.key === 'ArrowDown' && choices.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % choices.length)
    } else if (e.key === 'ArrowUp' && choices.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i <= 0 ? choices.length - 1 : i - 1))
    } else if (e.key === 'Enter' && open && active >= 0 && choices[active]) {
      e.preventDefault() // choose the highlighted place instead of submitting the form
      pick(choices[active])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      setActive(-1)
    }
  }

  const showList = open && status !== 'idle'
  const optionId = (i: number) => `${ids.list}-${i}`

  return (
    <div ref={rootRef} className="relative flex-1">
      <label htmlFor={ids.input} className="sr-only">{label}</label>
      <input
        id={ids.input}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={ids.list}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        aria-describedby={ids.hint}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          typed.current = true
          picked.current = null
          onChange(e.target.value)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={120}
        lang={lang}
        className="min-h-12 w-full rounded-lg border border-line bg-white px-3.5 text-base text-ink placeholder:text-slate-400 hover:border-forest-300 focus:border-forest-600 focus:ring-2 focus:ring-forest-100 focus-visible:outline-none"
      />
      <span id={ids.hint} className="sr-only">{t('hospitals.suggestHint')}</span>
      {showList && (
        <div className="absolute inset-x-0 top-full z-[1000] mt-1 overflow-hidden rounded-lg border border-line bg-white shadow-lg">
          <ul id={ids.list} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto py-1">
            {status === 'ready' &&
              items.map((item, i) => (
                <li
                  key={`${item.label}|${item.detail}|${i}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the field
                  onClick={() => pick(item)}
                  className={`flex cursor-pointer gap-2 px-3 py-2 text-sm ${i === active ? 'bg-teal-50 text-teal-900' : 'text-slate-800'}`}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    {item.detail && <span className="block text-xs text-slate-500">{item.detail}</span>}
                  </span>
                </li>
              ))}
          </ul>
          {status !== 'ready' && (
            <p role="status" className="px-3 py-2 text-sm text-slate-600">
              {t(status === 'loading' ? 'hospitals.suggestLoading' : status === 'empty' ? 'hospitals.suggestEmpty' : 'hospitals.suggestError')}
            </p>
          )}
          {status === 'ready' && attribution && <p className="border-t border-slate-100 px-3 py-1 text-[11px] text-slate-500">{attribution}</p>}
        </div>
      )}
    </div>
  )
}
