import type { Lang } from '../i18n/strings'
import { API_V1, ApiError, apiRequest } from './client'

export const RADII = [5, 10, 25, 50] as const
export type RadiusKm = (typeof RADII)[number]

export const SPECIALTIES = [
  'neurology',
  'paediatrics',
  'oncology',
  'cardiology',
  'emergency',
  'general_medicine',
  'obgyn',
  'orthopaedics',
  'dermatology',
  'psychiatry',
  'gastroenterology',
  'nephrology',
  'urology',
  'pulmonology',
  'ophthalmology',
  'ent',
  'endocrinology',
  'general_surgery',
  'dentistry',
  'physiotherapy',
] as const
export type Specialty = (typeof SPECIALTIES)[number]

export type SpecialtyStatus = 'verified' | 'listed_unverified' | 'not_listed' | 'unavailable'

export interface Hospital {
  id: string
  name: string
  kind: 'hospital' | 'clinic'
  lat: number
  lon: number
  distance_km: number
  address: string | null
  phones: string[]
  website: string | null
  opening_hours: string | null
  operator_type: 'government' | 'private' | 'charitable' | null
  emergency: 'listed' | 'not_listed' | 'unknown'
  specialties: string[]
  specialty_status: SpecialtyStatus | null
  source: { name: string; url: string | null; license: string }
}

export interface SearchCenter {
  lat: number
  lon: number
  label: string | null
  source: 'device' | 'search'
}

export interface HospitalSearchResponse {
  center: SearchCenter
  radius_km: number
  specialty: Specialty | null
  total: number
  results: Hospital[]
  attribution: string
  provider: string
  /** Date of the offline OpenStreetMap copy that answered; null/absent = live service. */
  data_as_of?: string | null
}

export type HospitalLocation =
  | { kind: 'device'; lat: number; lon: number }
  | { kind: 'query'; query: string }
  // A place already resolved to a point: a picked suggestion, or a typed place after lookup.
  | { kind: 'place'; lat: number; lon: number; label: string }

export interface PlacePoint {
  lat: number
  lon: number
  label: string
}

export interface PlaceSuggestion extends PlacePoint {
  detail: string
  kind: string
}

export interface HospitalFilters {
  radiusKm: RadiusKm
  specialty: Specialty | null
  includeClinics: boolean
  includeUnknown: boolean
}

/** Round to 3 decimals (~110 m) in the browser, before anything is sent. */
export const roundCoord = (v: number) => Math.round(v * 1000) / 1000

/**
 * Upper bounds in the browser, a little above the server's own budgets (place lookup ≤ ~15 s, hospital search ≤ 40 s),
 * so the page can never stay on "Searching…" indefinitely. Exported so tests can shorten them.
 */
export const HOSPITAL_TIMEOUTS = { resolveMs: 20_000, searchMs: 50_000, suggestMs: 8_000 }

/** Run a request with a hard time limit. On timeout the fetch is aborted and ApiError(408, 'client_timeout') thrown. */
async function bounded<T>(ms: number, signal: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  if (signal?.aborted) ctrl.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort()
      reject(new ApiError(408, 'client_timeout'))
    }, ms)
  })
  try {
    return await Promise.race([run(ctrl.signal), timeout])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** POST, so coordinates never appear in URLs, browser history or server access logs. */
export function searchHospitals(location: HospitalLocation, filters: HospitalFilters, language: Lang, signal?: AbortSignal) {
  const where =
    location.kind === 'query'
      ? { query: location.query }
      : location.kind === 'place'
        ? { lat: roundCoord(location.lat), lon: roundCoord(location.lon), place_label: location.label }
        : { lat: roundCoord(location.lat), lon: roundCoord(location.lon) }
  return bounded(HOSPITAL_TIMEOUTS.searchMs, signal, (s) =>
    apiRequest<HospitalSearchResponse>(`${API_V1}/hospitals/search`, {
      method: 'POST',
      signal: s,
      body: JSON.stringify({
        ...where,
        radius_km: filters.radiusKm,
        specialty: filters.specialty,
        include_clinics: filters.includeClinics,
        include_unknown: filters.specialty ? filters.includeUnknown : false,
        language,
      }),
    }),
  )
}

/** Step 1 of a typed search: city, locality, state, PIN code or hospital name → a point (rounded by the server). */
export function resolvePlace(query: string, language: Lang, signal?: AbortSignal) {
  return bounded(HOSPITAL_TIMEOUTS.resolveMs, signal, (s) =>
    apiRequest<PlacePoint>(`${API_V1}/hospitals/resolve`, { method: 'POST', signal: s, body: JSON.stringify({ query, language }) }),
  )
}

export interface SuggestResponse {
  suggestions: PlaceSuggestion[]
  attribution: string
}

// Per-session memory of answered suggestion queries, so retyping or going back costs no request.
const suggestCache = new Map<string, SuggestResponse>()
export const clearSuggestCache = () => suggestCache.clear()

/** Place suggestions while typing (Photon via our backend). Callers debounce; this adds caching and a time limit. */
export async function suggestPlaces(query: string, language: Lang, signal?: AbortSignal): Promise<SuggestResponse> {
  const key = `${language}|${query.trim().replace(/\s+/g, ' ').toLocaleLowerCase()}`
  const hit = suggestCache.get(key)
  if (hit) return hit
  const res = await bounded(HOSPITAL_TIMEOUTS.suggestMs, signal, (s) =>
    apiRequest<SuggestResponse>(`${API_V1}/hospitals/suggest`, { method: 'POST', signal: s, body: JSON.stringify({ query: query.trim(), language }) }),
  )
  if (suggestCache.size >= 100) suggestCache.delete(suggestCache.keys().next().value as string)
  suggestCache.set(key, res)
  return res
}

/** Directions open in the person's maps app. Only the hospital's position is in the link, not the user's. */
export const directionsUrl = (h: Pick<Hospital, 'lat' | 'lon'>) =>
  `https://www.google.com/maps/dir/?api=1&destination=${h.lat.toFixed(5)},${h.lon.toFixed(5)}`
