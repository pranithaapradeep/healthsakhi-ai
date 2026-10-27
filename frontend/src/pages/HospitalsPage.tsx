import { LocateFixed, MapPin, RotateCw, Search, ShieldCheck, X } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import {
  RADII,
  SPECIALTIES,
  resolvePlace,
  searchHospitals,
  type HospitalFilters,
  type HospitalLocation,
  type HospitalSearchResponse,
  type PlaceSuggestion,
  type RadiusKm,
  type Specialty,
} from '../api/hospitals'
import EmergencyBanner from '../components/EmergencyBanner'
import HospitalCard from '../components/hospitals/HospitalCard'
import LocationAutocomplete from '../components/hospitals/LocationAutocomplete'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import { fmt } from '../i18n/format'
import { useLanguage } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

// Leaflet is loaded only when there are results to map, keeping it out of the main bundle.
const HospitalMap = lazy(() => import('../components/hospitals/HospitalMap'))

type GeoState = 'idle' | 'locating' | 'denied' | 'unavailable' | 'timeout'
type Stage = 'idle' | 'resolving' | 'searching'

function errorKey(err: unknown): StringKey {
  if (!(err instanceof ApiError)) return 'hospitals.providerError'
  if (err.status === 0) return 'auth.errorNetwork'
  if (err.status === 404) return 'hospitals.notFound'
  if (err.status === 429) return 'hospitals.tooMany' // our own per-person limit
  if (err.status === 408 || err.status === 504) return 'hospitals.timeoutUpstream' // too slow (browser or server limit)
  if (err.status === 503 && err.message === 'hospital_provider_rate_limited') return 'hospitals.rateLimited'
  if (err.status === 503 && err.message === 'hospital_provider_overloaded') return 'hospitals.overloaded'
  if (err.status === 503 && err.message === 'hospital_provider_busy') return 'hospitals.busy'
  return 'hospitals.providerError'
}

export default function HospitalsPage() {
  const { t, lang } = useLanguage()
  const [geo, setGeo] = useState<GeoState>('idle')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<{ text: string; place: PlaceSuggestion } | null>(null)
  const [queryError, setQueryError] = useState(false)
  const [location, setLocation] = useState<HospitalLocation | null>(null)
  const [filters, setFilters] = useState<HospitalFilters>({ radiusKm: 10, specialty: null, includeClinics: false, includeUnknown: false })
  const [data, setData] = useState<HospitalSearchResponse | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<StringKey | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inflightKey = useRef<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const ids = { radius: useId(), specialty: useId() }

  const run = useCallback(
    async (loc: HospitalLocation, f: HospitalFilters) => {
      // The same search is already running (double click, repeated Enter): do not send it again.
      const key = JSON.stringify([loc, f, lang])
      if (abortRef.current && inflightKey.current === key) return
      abortRef.current?.abort() // a different search replaces the running one
      const ctrl = new AbortController()
      abortRef.current = ctrl
      inflightKey.current = key
      const current = () => abortRef.current === ctrl // false once replaced or cancelled: ignore late answers
      setError(null)
      setData(null)
      setSelectedId(null)
      try {
        let point = loc
        if (loc.kind === 'query') {
          setStage('resolving')
          const place = await resolvePlace(loc.query, lang, ctrl.signal)
          if (!current()) return
          point = { kind: 'place', lat: place.lat, lon: place.lon, label: place.label }
          setLocation(point) // filter changes reuse the point instead of looking the place up again
        }
        setStage('searching')
        const res = await searchHospitals(point, f, lang, ctrl.signal)
        if (!current()) return
        setData(res)
      } catch (err) {
        if (!current()) return
        setError(errorKey(err))
      } finally {
        if (current()) {
          abortRef.current = null
          inflightKey.current = null
          setStage('idle')
        }
      }
    },
    [lang],
  )

  function cancel() {
    abortRef.current?.abort()
    abortRef.current = null
    inflightKey.current = null
    setStage('idle')
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  // Re-run the last search when filters change.
  function updateFilters(patch: Partial<HospitalFilters>) {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (location) void run(location, next)
  }

  function locateMe() {
    if (!('geolocation' in navigator) || !navigator.geolocation) {
      setGeo('unavailable')
      return
    }
    setGeo('locating')
    // One-off reading only — no watchPosition, nothing stored.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo('idle')
        const loc: HospitalLocation = { kind: 'device', lat: pos.coords.latitude, lon: pos.coords.longitude }
        setLocation(loc)
        void run(loc, filters)
      },
      (err) => setGeo(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    )
  }

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) {
      setQueryError(true)
      return
    }
    setQueryError(false)
    // A picked suggestion already has its point; typed text is looked up first.
    const loc: HospitalLocation =
      picked && picked.text === query
        ? { kind: 'place', lat: picked.place.lat, lon: picked.place.lon, label: picked.text }
        : { kind: 'query', query: q }
    setLocation(loc)
    void run(loc, filters)
  }

  function select(id: string, scroll: boolean) {
    setSelectedId(id)
    if (!scroll) {
      // "Show on map" from the list: on phones the map sits below the list, so bring it into view.
      if (window.matchMedia?.('(max-width: 1023px)').matches) mapRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      return
    }
    const items: Element[] = listRef.current ? Array.from(listRef.current.children) : []
    const item = items.find((el) => el instanceof HTMLElement && el.dataset.hid === id)
    item?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }

  const km = t('hospitals.kmUnit')
  const placeLabel = data ? (data.center.source === 'device' ? t('hospitals.yourLocation') : (data.center.label ?? '')) : ''
  const geoMessage: Partial<Record<GeoState, StringKey>> = { denied: 'hospitals.denied', unavailable: 'hospitals.unavailable', timeout: 'hospitals.timeout' }
  const selectClass =
    'mt-1.5 block min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink hover:border-forest-300 focus:border-forest-600 focus-visible:outline-none focus:ring-2 focus:ring-forest-100'
  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'


  return (
    <div className="space-y-8">
      <PageHeader title={t('hospitals.title')} />
      {/* Emergency guidance always comes first and never waits for a search. */}
      <EmergencyBanner />

      {/* Where to search: your location, or a typed place. Then optional filters. */}
      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <Button
              onClick={locateMe}
              loading={geo === 'locating'}
              className="min-h-12 shrink-0 px-5 text-[0.9375rem]"
              icon={<LocateFixed className="size-4" aria-hidden />}
            >
              {t('hospitals.findNearMe')}
            </Button>
            <span className="hidden self-center text-sm text-slate-500 lg:block" aria-hidden>{t('hospitals.or')}</span>
            <form onSubmit={onSearch} className="flex flex-1 flex-col gap-2 sm:flex-row" role="search">
              <LocationAutocomplete
                value={query}
                onChange={(text) => {
                  setQuery(text)
                  if (picked && text !== picked.text) setPicked(null)
                }}
                onPick={(place) => setPicked({ text: place.detail ? `${place.label}, ${place.detail}` : place.label, place })}
                label={t('hospitals.searchCity')}
                placeholder={t('hospitals.searchCity')}
              />
              <Button type="submit" variant="secondary" className="min-h-12" icon={<Search className="size-4" aria-hidden />}>
                {t('hospitals.searchButton')}
              </Button>
            </form>
          </div>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest-700" aria-hidden />
            {t('hospitals.why')}
          </p>
          {geo === 'locating' && <Spinner label={t('hospitals.locating')} />}
          {geoMessage[geo] && <Alert tone="warning">{t(geoMessage[geo]!)}</Alert>}
          {queryError && <Alert tone="danger">{t('hospitals.queryRequired')}</Alert>}
        </div>

        <div className="grid gap-4 border-t border-line bg-sage-50/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[10rem_1fr_auto] lg:items-end">
          <div>
            <label htmlFor={ids.radius} className={labelClass}>{t('hospitals.radius')}</label>
            <select
              id={ids.radius}
              value={filters.radiusKm}
              onChange={(e) => updateFilters({ radiusKm: Number(e.target.value) as RadiusKm })}
              className={selectClass}
            >
              {RADII.map((r) => <option key={r} value={r}>{r} {km}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={ids.specialty} className={labelClass}>{t('hospitals.specialty')}</label>
            <select
              id={ids.specialty}
              value={filters.specialty ?? ''}
              onChange={(e) => updateFilters({ specialty: (e.target.value || null) as Specialty | null })}
              className={selectClass}
            >
              <option value="">{t('hospitals.anySpecialty')}</option>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{t(`specialty.${s}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 text-sm text-slate-700 sm:col-span-2 lg:col-span-1 lg:pb-2">
            <label className="flex min-h-8 cursor-pointer items-start gap-2">
              <input type="checkbox" checked={filters.includeClinics} onChange={(e) => updateFilters({ includeClinics: e.target.checked })} className="mt-1 size-4 accent-forest-700" />
              {t('hospitals.includeClinics')}
            </label>
            {filters.specialty && (
              <label className="flex min-h-8 cursor-pointer items-start gap-2">
                <input type="checkbox" checked={filters.includeUnknown} onChange={(e) => updateFilters({ includeUnknown: e.target.checked })} className="mt-1 size-4 accent-forest-700" />
                {t('hospitals.includeUnknown')}
              </label>
            )}
          </div>
        </div>
      </div>

      {stage !== 'idle' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white px-5 py-4" aria-live="polite">
          <Spinner label={t(stage === 'resolving' ? 'hospitals.stageResolving' : 'hospitals.stageSearching')} />
          <Button variant="ghost" onClick={cancel} className="min-h-10" icon={<X className="size-4" aria-hidden />}>{t('hospitals.cancel')}</Button>
          {stage === 'searching' && <p className="w-full text-xs leading-relaxed text-slate-500">{t('hospitals.slowNote')}</p>}
        </div>
      )}
      {error && (
        <Alert
          tone="warning"
          title={t(error)}
          action={
            location && error !== 'hospitals.notFound' ? (
              <Button variant="secondary" onClick={() => void run(location, filters)} icon={<RotateCw className="size-4" aria-hidden />}>{t('common.retry')}</Button>
            ) : undefined
          }
        />
      )}

      {data && stage === 'idle' && (
        <section aria-labelledby="results-title" className="space-y-4">
          <div className="space-y-1.5 border-b border-line pb-4">
            <h2 id="results-title" className="text-xl font-semibold leading-snug text-ink sm:text-2xl">
              {fmt(t('hospitals.resultsSummary'), { count: data.total, radius: `${data.radius_km} ${km}`, place: placeLabel })}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{t('hospitals.dataNote')}</p>
            {data.data_as_of && <p className="text-sm text-slate-600">{fmt(t('hospitals.dataAsOf'), { date: data.data_as_of })}</p>}
            {filters.specialty && data.results.length > 0 && <p className="text-sm text-slate-600">{t('hospitals.listedFirst')}</p>}
          </div>

          {data.results.length === 0 ? (
            <EmptyState icon={<MapPin className="size-8" aria-hidden />} title={t('hospitals.noResults')} />
          ) : (
            // Phones: the list comes first, the map follows. Desktop: list left, map right (sticky).
            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              <ol
                ref={listRef}
                className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white lg:col-span-5 lg:max-h-[36rem] lg:overflow-y-auto"
              >
                {data.results.map((h) => (
                  <li key={h.id} data-hid={h.id}>
                    <HospitalCard hospital={h} selected={h.id === selectedId} onSelect={() => select(h.id, false)} specialty={filters.specialty} />
                  </li>
                ))}
              </ol>
              <div ref={mapRef} className="scroll-mt-20 lg:sticky lg:top-20 lg:col-span-7 lg:self-start">
                <Suspense fallback={<div className="flex h-72 items-center justify-center rounded-xl border border-line bg-sage-50"><Spinner label={t('common.loading')} /></div>}>
                  <HospitalMap
                    center={data.center}
                    radiusKm={data.radius_km}
                    hospitals={data.results}
                    selectedId={selectedId}
                    onSelect={(id) => select(id, true)}
                    label={t('hospitals.mapLabel')}
                  />
                </Suspense>
              </div>
            </div>
          )}
          <p className="flex items-start gap-2 border-t border-line pt-4 text-sm font-medium text-red-800">{t('hospitals.emergencyNote')}</p>
        </section>
      )}
    </div>
  )
}
