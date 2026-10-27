import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOSPITAL_TIMEOUTS, clearSuggestCache, type Hospital, type HospitalSearchResponse } from '../api/hospitals'
import type { HospitalMapProps } from '../components/hospitals/HospitalMap'
import { STRINGS, type Lang } from '../i18n/strings'
import { callsTo, mockApi } from '../test/mockApi'
import { renderApp } from '../test/renderApp'

// Leaflet needs a real browser layout engine, so the map is replaced by a stand-in that exposes the same
// props: one button per marker, pressed when that marker is the selected one.
vi.mock('../components/hospitals/HospitalMap', () => ({
  default: ({ hospitals, selectedId, onSelect, label }: HospitalMapProps) => (
    <div role="region" aria-label={label}>
      {hospitals.map((h) => (
        <button key={h.id} type="button" aria-pressed={h.id === selectedId} onClick={() => onSelect(h.id)}>
          marker {h.name}
        </button>
      ))}
    </div>
  ),
}))

const en = STRINGS.en
const SEARCH = 'POST /api/v1/hospitals/search'
const RESOLVE = 'POST /api/v1/hospitals/resolve'
const SUGGEST = 'POST /api/v1/hospitals/suggest'
const body = (init: RequestInit) => JSON.parse(String(init.body)) as Record<string, unknown>
// Typed places resolve to a fixed point in these tests; the label echoes the query.
const resolveOk = (init: RequestInit) => ({ status: 200, body: { lat: 13.083, lon: 80.271, label: `${String(body(init).query)}, India` } })
const guest = { 'GET /api/v1/auth/me': { status: 401 }, [RESOLVE]: resolveOk }
const DEFAULT_TIMEOUTS = { ...HOSPITAL_TIMEOUTS }

/** A response the test releases by hand, to control ordering. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const OSM = { name: 'OpenStreetMap', license: 'ODbL 1.0' }
function hospital(over: Partial<Hospital>): Hospital {
  return {
    id: 'node/1',
    name: 'Test Hospital',
    kind: 'hospital',
    lat: 13.08,
    lon: 80.27,
    distance_km: 1.2,
    address: null,
    phones: [],
    website: null,
    opening_hours: null,
    operator_type: null,
    emergency: 'unknown',
    specialties: [],
    specialty_status: null,
    source: { ...OSM, url: 'https://www.openstreetmap.org/node/1' },
    ...over,
  }
}

const GH = hospital({
  id: 'way/10',
  name: 'Government General Hospital',
  distance_km: 0.8,
  address: 'Park Town, Chennai, 600003',
  phones: ['+91 44 2530 5000'],
  website: 'https://example.org/ggh',
  opening_hours: '24/7',
  operator_type: 'government',
  emergency: 'listed',
  specialties: ['cardiology', 'emergency'],
})
const CITY = hospital({ id: 'node/20', name: 'City Care Hospital', distance_km: 3.4 })

function response(over: Partial<HospitalSearchResponse> = {}): HospitalSearchResponse {
  const results = over.results ?? [GH, CITY]
  return {
    center: { lat: 13.083, lon: 80.271, label: 'Chennai, Tamil Nadu', source: 'search' },
    radius_km: 10,
    specialty: null,
    total: results.length,
    results,
    attribution: '© OpenStreetMap contributors',
    provider: 'osm',
    ...over,
  }
}

type GeoMock = { getCurrentPosition: ReturnType<typeof vi.fn>; watchPosition: ReturnType<typeof vi.fn> }
function installGeolocation(impl: (ok: PositionCallback, fail: PositionErrorCallback) => void): GeoMock {
  const geo = { getCurrentPosition: vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => impl(ok, fail)), watchPosition: vi.fn() }
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geo })
  return geo
}
const position = (lat: number, lon: number) => ({ coords: { latitude: lat, longitude: lon, accuracy: 20 }, timestamp: 0 }) as GeolocationPosition
const geoError = (code: 1 | 2 | 3) => ({ code, message: 'x', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) as GeolocationPositionError

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
  clearSuggestCache()
  Object.assign(HOSPITAL_TIMEOUTS, DEFAULT_TIMEOUTS)
})

// The page has several comboboxes (language, distance, department, location): pick the location field by its label.
const field = (lang: Lang = 'en') => screen.getByRole('combobox', { name: STRINGS[lang]['hospitals.searchCity'] })
function searchFor(text: string) {
  fireEvent.change(field(), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
}
const results = () => screen.findByRole('heading', { level: 2, name: /found within/ })

describe('hospital finder — location permission', () => {
  it('does not ask for location until the button is clicked, and explains why', () => {
    mockApi(guest)
    const geo = installGeolocation(() => {})
    renderApp('/hospitals')
    expect(screen.getByText(en['hospitals.why'])).toBeInTheDocument()
    expect(geo.getCurrentPosition).not.toHaveBeenCalled()
    expect(geo.watchPosition).not.toHaveBeenCalled()
  })

  it('granted: takes one reading and sends rounded coordinates only', async () => {
    const api = mockApi({ ...guest, [SEARCH]: { status: 200, body: response({ center: { lat: 13.083, lon: 80.271, label: null, source: 'device' } }) } })
    const geo = installGeolocation((ok) => ok(position(13.0827123, 80.2707456)))
    renderApp('/hospitals')
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.findNearMe'] }))

    expect(await results()).toHaveTextContent('2 found within 10 km of your location')
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(geo.getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: false })
    expect(geo.watchPosition).not.toHaveBeenCalled()

    const [call] = callsTo(api, 'POST', '/hospitals/search')
    const sent = body(call[1] as RequestInit)
    expect(sent).toMatchObject({ lat: 13.083, lon: 80.271, radius_km: 10 })
    expect(sent).not.toHaveProperty('query')
    // Coordinates are never put in the URL.
    expect(String(call[0])).not.toMatch(/13\.08|80\.27/)
    // Location is not written to browser storage.
    const stored = Object.keys(window.localStorage).map((k) => window.localStorage.getItem(k)).join('|')
    expect(stored).not.toMatch(/13\.08|80\.27/)
  })

  it('denied: explains and offers manual search without calling the backend', async () => {
    const api = mockApi(guest)
    installGeolocation((_ok, fail) => fail(geoError(1)))
    renderApp('/hospitals')
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.findNearMe'] }))
    expect(await screen.findByText(en['hospitals.denied'])).toBeInTheDocument()
    expect(field()).toBeEnabled()
    expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(0)
  })

  it('unavailable: no geolocation API on the device', async () => {
    mockApi(guest)
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    renderApp('/hospitals')
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.findNearMe'] }))
    expect(await screen.findByText(en['hospitals.unavailable'])).toBeInTheDocument()
  })

  it('unavailable and timeout errors from the device', async () => {
    mockApi(guest)
    let code: 2 | 3 = 2
    installGeolocation((_ok, fail) => fail(geoError(code)))
    renderApp('/hospitals')
    const btn = screen.getByRole('button', { name: en['hospitals.findNearMe'] })
    fireEvent.click(btn)
    expect(await screen.findByText(en['hospitals.unavailable'])).toBeInTheDocument()
    code = 3
    fireEvent.click(btn)
    expect(await screen.findByText(en['hospitals.timeout'])).toBeInTheDocument()
  })
})

describe('hospital finder — manual search', () => {
  it.each([
    ['Chennai', 'Chennai, Tamil Nadu'],
    ['600003', 'Chennai, Tamil Nadu, 600003'],
    ['Guwahati', 'Guwahati, Assam'],
    ['Port Blair', 'Port Blair, Andaman and Nicobar Islands'],
    ['Leh', 'Leh, Ladakh'],
  ])('searches %s and shows the resolved place', async (q, label) => {
    const api = mockApi({ ...guest, [SEARCH]: { status: 200, body: response({ center: { lat: 20, lon: 80, label, source: 'search' } }) } })
    renderApp('/hospitals')
    searchFor(q)
    expect(await results()).toHaveTextContent(`2 found within 10 km of ${label}`)
    // Step 1: the typed text is looked up. Step 2: hospitals are searched around the point that came back.
    expect(body(callsTo(api, 'POST', '/hospitals/resolve')[0][1] as RequestInit)).toEqual({ query: q, language: 'en' })
    const sent = body(callsTo(api, 'POST', '/hospitals/search')[0][1] as RequestInit)
    expect(sent).toMatchObject({ lat: 13.083, lon: 80.271, place_label: `${q}, India`, radius_km: 10, language: 'en' })
    expect(sent).not.toHaveProperty('query')
  })

  it('needs at least two characters', () => {
    const api = mockApi(guest)
    renderApp('/hospitals')
    searchFor(' a ')
    expect(screen.getByText(en['hospitals.queryRequired'])).toBeInTheDocument()
    expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(0)
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(0)
  })

  it('sends the UI language', async () => {
    const api = mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals', 'ta')
    fireEvent.change(field('ta'), { target: { value: 'மதுரை' } })
    fireEvent.click(screen.getByRole('button', { name: STRINGS.ta['hospitals.searchButton'] }))
    await waitFor(() => expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(1))
    expect(body(callsTo(api, 'POST', '/hospitals/resolve')[0][1] as RequestInit)).toEqual({ query: 'மதுரை', language: 'ta' })
    expect(body(callsTo(api, 'POST', '/hospitals/search')[0][1] as RequestInit)).toMatchObject({ language: 'ta' })
  })
})

describe('hospital finder — results', () => {
  it('shows only listed details and says what is missing', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    const gh = screen.getByRole('article', { name: 'Government General Hospital' })
    expect(within(gh).getByRole('link', { name: '+91 44 2530 5000' })).toHaveAttribute('href', 'tel:+914425305000')
    expect(within(gh).getByRole('link', { name: en['hospitals.website'] })).toHaveAttribute('href', 'https://example.org/ggh')
    expect(within(gh).getByText(`${en['hospitals.hours']}: 24/7`)).toBeInTheDocument()
    expect(within(gh).getByText(en['hospitals.er.listed'])).toBeInTheDocument()
    expect(within(gh).getByText(en['hospitals.op.government'])).toBeInTheDocument()
    expect(within(gh).getByText(`${en['specialty.cardiology']}, ${en['specialty.emergency']}`, { exact: false })).toBeInTheDocument()
    // No specialty filter is active, so no verification badge is shown.
    expect(within(gh).queryByText(en['hospitals.status.listed_unverified'])).toBeNull()
    expect(within(gh).getByRole('link', { name: en['hospitals.directions'] })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=13.08000,80.27000',
    )

    const city = screen.getByRole('article', { name: 'City Care Hospital' })
    for (const k of ['addressMissing', 'phoneMissing', 'websiteMissing', 'hoursMissing', 'er.unknown'] as const) {
      expect(within(city).getByText(en[`hospitals.${k}`])).toBeInTheDocument()
    }
    expect(within(city).queryByRole('link', { name: /^\+?\d/ })).toBeNull()
    expect(within(city).queryByText(en['hospitals.listedDepartments'] + ':')).toBeNull()
    expect(screen.getByText(en['hospitals.dataNote'])).toBeInTheDocument()
    expect(screen.getByText(en['hospitals.emergencyNote'])).toBeInTheDocument()
  })

  it('keeps results in distance order as returned', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    const names = screen.getAllByRole('article').map((a) => within(a).getByRole('heading').textContent)
    expect(names).toEqual(['Government General Hospital', 'City Care Hospital'])
  })

  it('syncs map markers and list cards', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    const map = screen.getByRole('region', { name: en['hospitals.mapLabel'] })
    fireEvent.click(within(map).getByRole('button', { name: 'marker City Care Hospital' }))
    expect(screen.getByRole('article', { name: 'City Care Hospital' })).toHaveAttribute('data-selected', 'true')
    expect(within(map).getByRole('button', { name: 'marker City Care Hospital' })).toHaveAttribute('aria-pressed', 'true')

    const gh = screen.getByRole('article', { name: 'Government General Hospital' })
    fireEvent.click(within(gh).getByRole('button', { name: en['hospitals.showOnMap'] }))
    expect(within(map).getByRole('button', { name: 'marker Government General Hospital' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(map).getByRole('button', { name: 'marker City Care Hospital' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an empty state', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response({ results: [] }) } })
    renderApp('/hospitals')
    searchFor('Rann of Kutch')
    expect(await screen.findByText(en['hospitals.noResults'])).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: en['hospitals.mapLabel'] })).toBeNull()
  })
})

describe('hospital finder — filters', () => {
  it('re-runs the last search with the chosen radius', async () => {
    const api = mockApi({ ...guest, [SEARCH]: (init) => ({ status: 200, body: response({ radius_km: Number(body(init).radius_km) }) }) })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    fireEvent.change(screen.getByLabelText(en['hospitals.radius']), { target: { value: '50' } })
    expect(await screen.findByRole('heading', { level: 2, name: /within 50 km/ })).toBeInTheDocument()
    const calls = callsTo(api, 'POST', '/hospitals/search')
    expect(calls.map((c) => body(c[1] as RequestInit).radius_km)).toEqual([10, 50])
    // Same place both times, and it is not looked up again.
    expect(body(calls[1][1] as RequestInit)).toMatchObject({ lat: 13.083, lon: 80.271, place_label: 'Chennai, India' })
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(1)
  })

  it('offers all 20 departments', () => {
    mockApi(guest)
    renderApp('/hospitals')
    // 20 departments + "any".
    expect(within(screen.getByLabelText(en['hospitals.specialty'])).getAllByRole('option')).toHaveLength(21)
  })

  it('labels specialty matches as listed but not verified, and unknowns as unavailable', async () => {
    const neuro = hospital({ id: 'node/30', name: 'Neuro Centre', specialties: ['neurology'], specialty_status: 'listed_unverified' })
    const unknown = hospital({ id: 'node/31', name: 'Town Hospital', distance_km: 2, specialty_status: 'unavailable' })
    const api = mockApi({
      ...guest,
      [SEARCH]: (init) => {
        const b = body(init)
        if (!b.specialty) return { status: 200, body: response() }
        return { status: 200, body: response({ specialty: 'neurology', results: b.include_unknown ? [neuro, unknown] : [neuro] }) }
      },
    })
    renderApp('/hospitals')
    searchFor('Bengaluru')
    await results()
    fireEvent.change(screen.getByLabelText(en['hospitals.specialty']), { target: { value: 'neurology' } })
    const card = await screen.findByRole('article', { name: 'Neuro Centre' })
    expect(within(card).getByText(en['hospitals.status.listed_unverified'])).toBeInTheDocument()
    expect(within(card).getByText(en['specialty.neurology'], { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(en['hospitals.status.verified'])).toBeNull()
    expect(screen.getByText(en['hospitals.listedFirst'])).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Town Hospital' })).toBeNull()

    fireEvent.click(screen.getByLabelText(en['hospitals.includeUnknown']))
    const town = await screen.findByRole('article', { name: 'Town Hospital' })
    expect(within(town).getByText(en['hospitals.status.unavailable'])).toBeInTheDocument()

    const sent = callsTo(api, 'POST', '/hospitals/search').map((c) => body(c[1] as RequestInit))
    expect(sent[1]).toMatchObject({ specialty: 'neurology', include_unknown: false })
    expect(sent[2]).toMatchObject({ specialty: 'neurology', include_unknown: true })
  })

  it('includes clinics only when asked', async () => {
    const api = mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Patna')
    await results()
    fireEvent.click(screen.getByLabelText(en['hospitals.includeClinics']))
    await waitFor(() => expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(2))
    const sent = callsTo(api, 'POST', '/hospitals/search').map((c) => body(c[1] as RequestInit).include_clinics)
    expect(sent).toEqual([false, true])
  })
})

describe('hospital finder — errors', () => {
  it.each([
    [404, 'location_not_found', 'hospitals.notFound'],
    [429, 'too_many_requests', 'hospitals.tooMany'],
    [503, 'hospital_provider_busy', 'hospitals.busy'],
    [503, 'hospital_provider_rate_limited', 'hospitals.rateLimited'],
    [503, 'hospital_provider_overloaded', 'hospitals.overloaded'],
    [504, 'hospital_provider_timeout', 'hospitals.timeoutUpstream'],
    [503, 'hospital_provider_unavailable', 'hospitals.providerError'],
    [502, 'bad_gateway', 'hospitals.providerError'],
    [503, 'hospital_search_not_configured', 'hospitals.providerError'],
  ] as const)('%i %s', async (status, detail, key) => {
    mockApi({ ...guest, [SEARCH]: { status, body: { detail } } })
    renderApp('/hospitals')
    searchFor('Nowhere')
    expect(await screen.findByText(en[key])).toBeInTheDocument()
    // Emergency guidance stays on screen.
    expect(screen.getByRole('heading', { name: en['emergency.title'] })).toBeInTheDocument()
  })

  it('can retry after a provider failure', async () => {
    let fail = true
    mockApi({ ...guest, [SEARCH]: () => (fail ? { status: 503, body: { detail: 'hospital_provider_unavailable' } } : { status: 200, body: response() }) })
    renderApp('/hospitals')
    searchFor('Chennai')
    await screen.findByText(en['hospitals.providerError'])
    fail = false
    fireEvent.click(screen.getByRole('button', { name: en['common.retry'] }))
    expect(await results()).toBeInTheDocument()
  })

  it('reports a network failure', async () => {
    mockApi(guest)
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en['auth.errorNetwork'])).toBeInTheDocument()
  })
})

describe('hospital finder — stages, timeouts and stale answers', () => {
  it('shows each stage, then the results', async () => {
    const place = deferred<{ status: number; body: unknown }>()
    const found = deferred<{ status: number; body: unknown }>()
    mockApi({ ...guest, [RESOLVE]: () => place.promise, [SEARCH]: () => found.promise })
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en['hospitals.stageResolving'])).toBeInTheDocument()
    place.resolve({ status: 200, body: { lat: 13.083, lon: 80.271, label: 'Chennai, Tamil Nadu' } })
    expect(await screen.findByText(en['hospitals.stageSearching'])).toBeInTheDocument()
    expect(screen.getByText(en['hospitals.slowNote'])).toBeInTheDocument()
    found.resolve({ status: 200, body: response() })
    expect(await results()).toBeInTheDocument()
    expect(screen.queryByText(en['hospitals.stageSearching'])).toBeNull()
  })

  it('gives up after the time limit instead of searching forever, and can retry', async () => {
    HOSPITAL_TIMEOUTS.searchMs = 60
    let hang = true
    mockApi({ ...guest, [SEARCH]: () => (hang ? new Promise<never>(() => {}) : { status: 200, body: response() }) })
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en['hospitals.timeoutUpstream'])).toBeInTheDocument()
    expect(screen.queryByText(en['hospitals.stageSearching'])).toBeNull()
    hang = false
    fireEvent.click(screen.getByRole('button', { name: en['common.retry'] }))
    expect(await results()).toBeInTheDocument()
  })

  it('times out a slow place lookup too', async () => {
    HOSPITAL_TIMEOUTS.resolveMs = 60
    mockApi({ ...guest, [RESOLVE]: () => new Promise<never>(() => {}) })
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en['hospitals.timeoutUpstream'])).toBeInTheDocument()
  })

  it.each([
    [503, 'hospital_provider_rate_limited', 'hospitals.rateLimited'],
    [504, 'hospital_provider_timeout', 'hospitals.timeoutUpstream'],
    [404, 'location_not_found', 'hospitals.notFound'],
  ] as const)('place lookup failure %i %s', async (status, detail, key) => {
    const api = mockApi({ ...guest, [RESOLVE]: { status, body: { detail } } })
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en[key])).toBeInTheDocument()
    expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(0)
  })

  it('does not send the same search twice on repeated clicks', async () => {
    const place = deferred<{ status: number; body: unknown }>()
    const api = mockApi({ ...guest, [RESOLVE]: () => place.promise, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    place.resolve({ status: 200, body: { lat: 13.083, lon: 80.271, label: 'Chennai' } })
    await results()
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(1)
    expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(1)
  })

  it('ignores the answer for a place the person has moved away from', async () => {
    const slow = deferred<{ status: number; body: unknown }>()
    mockApi({
      ...guest,
      [SEARCH]: (init) =>
        body(init).place_label === 'Chennai, India'
          ? slow.promise
          : { status: 200, body: response({ center: { lat: 9.93, lon: 78.12, label: 'Madurai, Tamil Nadu', source: 'search' }, results: [CITY] }) },
    })
    renderApp('/hospitals')
    searchFor('Chennai')
    await screen.findByText(en['hospitals.stageSearching'])
    searchFor('Madurai')
    expect(await results()).toHaveTextContent('Madurai, Tamil Nadu')
    slow.resolve({ status: 200, body: response() }) // Chennai answers late
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('heading', { level: 2, name: /found within/ })).toHaveTextContent('1 found within 10 km of Madurai, Tamil Nadu')
    expect(screen.queryByRole('article', { name: 'Government General Hospital' })).toBeNull()
    // Map markers and cards come from the same answer.
    const map = screen.getByRole('region', { name: en['hospitals.mapLabel'] })
    expect(within(map).getAllByRole('button').map((b) => b.textContent)).toEqual(['marker City Care Hospital'])
  })

  it('cancel stops waiting and drops a late answer', async () => {
    const slow = deferred<{ status: number; body: unknown }>()
    mockApi({ ...guest, [SEARCH]: () => slow.promise })
    renderApp('/hospitals')
    searchFor('Chennai')
    await screen.findByText(en['hospitals.stageSearching'])
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.cancel'] }))
    expect(screen.queryByText(en['hospitals.stageSearching'])).toBeNull()
    slow.resolve({ status: 200, body: response() })
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('heading', { level: 2, name: /found within/ })).toBeNull()
    for (const k of ['providerError', 'timeoutUpstream', 'busy', 'rateLimited'] as const) expect(screen.queryByText(en[`hospitals.${k}`])).toBeNull()
  })

  it('keeps "no hospitals found" separate from "service unavailable"', async () => {
    let fail = false
    mockApi({ ...guest, [SEARCH]: () => (fail ? { status: 503, body: { detail: 'hospital_provider_unavailable' } } : { status: 200, body: response({ results: [] }) }) })
    renderApp('/hospitals')
    searchFor('Chennai')
    expect(await screen.findByText(en['hospitals.noResults'])).toBeInTheDocument()
    expect(screen.queryByText(en['hospitals.providerError'])).toBeNull()
    fail = true
    fireEvent.change(screen.getByLabelText(en['hospitals.radius']), { target: { value: '25' } })
    expect(await screen.findByText(en['hospitals.providerError'])).toBeInTheDocument()
    expect(screen.queryByText(en['hospitals.noResults'])).toBeNull()
  })
})

describe('hospital finder — place suggestions', () => {
  const ANNA = { label: 'Anna Nagar', detail: 'Chennai, Tamil Nadu', lat: 13.085, lon: 80.21, kind: 'district' }
  const CENTRAL = { label: 'Chennai Central', detail: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2753, kind: 'locality' }
  const suggest = (suggestions: unknown[]) => ({ status: 200, body: { suggestions, attribution: 'Photon by komoot · © OpenStreetMap contributors' } })
  const type = (text: string) => fireEvent.change(field(), { target: { value: text } })
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  // Only options inside the suggestion list — the language and department selectors have <option>s too.
  const suggestions = () => {
    const list = screen.queryByRole('listbox', { name: en['hospitals.searchCity'] })
    return list ? within(list).queryAllByRole('option') : []
  }

  it('waits for a pause in typing and needs 3 characters', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA]) })
    renderApp('/hospitals')
    type('Ch')
    await wait(600)
    expect(callsTo(api, 'POST', '/hospitals/suggest')).toHaveLength(0)
    type('Che')
    type('Chen')
    type('Chenn')
    await wait(200)
    expect(callsTo(api, 'POST', '/hospitals/suggest')).toHaveLength(0) // still inside the 400 ms pause
    expect(await screen.findByRole('option', { name: /Anna Nagar/ })).toBeInTheDocument()
    const calls = callsTo(api, 'POST', '/hospitals/suggest')
    expect(calls).toHaveLength(1)
    expect(body(calls[0][1] as RequestInit)).toEqual({ query: 'Chenn', language: 'en' })
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Photon by komoot/)).toBeInTheDocument()
  })

  it('hover highlights and click picks without searching', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA, CENTRAL]), [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    type('chen')
    const second = await screen.findByRole('option', { name: /Chennai Central/ })
    fireEvent.mouseEnter(second)
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /Anna Nagar/ })).toHaveAttribute('aria-selected', 'false')
    fireEvent.mouseDown(second)
    fireEvent.click(second)
    expect(field()).toHaveValue('Chennai Central, Chennai, Tamil Nadu')
    expect(suggestions()).toHaveLength(0)
    await wait(500)
    expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(0)
    expect(callsTo(api, 'POST', '/hospitals/suggest')).toHaveLength(1) // picking does not look it up again

    // Searching uses the picked point directly — no extra place lookup.
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    await waitFor(() => expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(1))
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(0)
    expect(body(callsTo(api, 'POST', '/hospitals/search')[0][1] as RequestInit)).toMatchObject({
      lat: 13.083,
      lon: 80.275,
      place_label: 'Chennai Central, Chennai, Tamil Nadu',
      radius_km: 10,
    })
  })

  it('keeps the chosen place and radius together', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA]), [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    fireEvent.change(screen.getByLabelText(en['hospitals.radius']), { target: { value: '25' } })
    type('anna')
    fireEvent.click(await screen.findByRole('option', { name: /Anna Nagar/ }))
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    await waitFor(() => expect(callsTo(api, 'POST', '/hospitals/search')).toHaveLength(1))
    expect(body(callsTo(api, 'POST', '/hospitals/search')[0][1] as RequestInit)).toMatchObject({ lat: 13.085, lon: 80.21, radius_km: 25 })
  })

  it('arrow keys move, Enter picks (without submitting), Escape closes', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA, CENTRAL]) })
    renderApp('/hospitals')
    type('chen')
    await screen.findByRole('option', { name: /Anna Nagar/ })
    const input = field()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /Chennai Central/ })).toHaveAttribute('aria-selected', 'true')
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: /Chennai Central/ }).id)
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // wraps around
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { name: /Anna Nagar/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue('Anna Nagar, Chennai, Tamil Nadu')
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(0)

    type('chenn')
    await screen.findByRole('option', { name: /Anna Nagar/ })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(suggestions()).toHaveLength(0)
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveValue('chenn')
  })

  it('closes when clicking outside', async () => {
    mockApi({ ...guest, [SUGGEST]: suggest([ANNA]) })
    renderApp('/hospitals')
    type('anna')
    await screen.findByRole('option', { name: /Anna Nagar/ })
    fireEvent.mouseDown(screen.getByRole('heading', { level: 1 }))
    expect(suggestions()).toHaveLength(0)
  })

  it('closes on a tap outside, but stays open when pressing inside the field', async () => {
    mockApi({ ...guest, [SUGGEST]: suggest([ANNA]) })
    renderApp('/hospitals')
    type('anna')
    await screen.findByRole('option', { name: /Anna Nagar/ })
    fireEvent.mouseDown(field()) // inside: keep the list
    expect(suggestions()).toHaveLength(1)
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.touchStart(screen.getByText(en['hospitals.why'])) // outside, on a phone
    expect(suggestions()).toHaveLength(0)
    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(field()).toHaveValue('anna') // closing never changes what was typed
  })

  it('an older, slower answer never replaces a newer one', async () => {
    const old = deferred<{ status: number; body: unknown }>()
    mockApi({ ...guest, [SUGGEST]: (init) => (body(init).query === 'chen' ? old.promise : suggest([CENTRAL])) })
    renderApp('/hospitals')
    type('chen')
    await wait(450) // first request sent and still waiting
    type('chennai c')
    expect(await screen.findByRole('option', { name: /Chennai Central/ })).toBeInTheDocument()
    old.resolve(suggest([ANNA]))
    await wait(20)
    expect(screen.queryByRole('option', { name: /Anna Nagar/ })).toBeNull()
    expect(suggestions()).toHaveLength(1)
  })

  it('shows friendly empty and error states, and Search still works', async () => {
    let fail = false
    const api = mockApi({ ...guest, [SUGGEST]: () => (fail ? { status: 503, body: { detail: 'hospital_provider_unavailable' } } : suggest([])), [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    type('zzzq')
    expect(await screen.findByText(en['hospitals.suggestEmpty'])).toBeInTheDocument()
    fail = true
    type('qqqz')
    expect(await screen.findByText(en['hospitals.suggestError'])).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    await results()
    expect(callsTo(api, 'POST', '/hospitals/resolve')).toHaveLength(1)
    expect(screen.queryByText(en['hospitals.suggestError'])).toBeNull()
  })

  it('repeating a query uses the answer already received', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA]) })
    renderApp('/hospitals')
    type('anna')
    await screen.findByRole('option', { name: /Anna Nagar/ })
    type('ann')
    await waitFor(() => expect(callsTo(api, 'POST', '/hospitals/suggest')).toHaveLength(2))
    await screen.findByRole('option', { name: /Anna Nagar/ })
    type('anna')
    await wait(500)
    expect(callsTo(api, 'POST', '/hospitals/suggest').map((c) => body(c[1] as RequestInit).query)).toEqual(['anna', 'ann'])
  })

  it('editing a picked place looks the new text up instead', async () => {
    const api = mockApi({ ...guest, [SUGGEST]: suggest([ANNA]), [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    type('anna')
    fireEvent.click(await screen.findByRole('option', { name: /Anna Nagar/ }))
    type('Anna Nagar West')
    fireEvent.click(screen.getByRole('button', { name: en['hospitals.searchButton'] }))
    await results()
    expect(body(callsTo(api, 'POST', '/hospitals/resolve')[0][1] as RequestInit)).toEqual({ query: 'Anna Nagar West', language: 'en' })
  })
})

describe('hospital finder — data source', () => {
  it('shows the date when an offline OpenStreetMap copy answered', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response({ provider: 'OpenStreetMap (offline copy)', data_as_of: '2026-10-26' }) } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    expect(screen.getByText(en['hospitals.dataAsOf'].replace('{date}', '2026-10-26'))).toBeInTheDocument()
    expect(screen.getByText(en['hospitals.dataNote'])).toBeInTheDocument() // the disclaimer stays
  })

  it('shows no date for live answers', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    expect(screen.queryByText(/offline copy of OpenStreetMap/)).toBeNull()
  })
})

describe('hospital finder — layout', () => {
  it('puts the result list before the map, so phones see hospitals first', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    const firstRow = screen.getAllByRole('article')[0]
    const map = screen.getByRole('region', { name: en['hospitals.mapLabel'] })
    expect(firstRow.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('"Show on map" brings the map into view on a phone-sized screen', async () => {
    mockApi({ ...guest, [SEARCH]: { status: 200, body: response() } })
    renderApp('/hospitals')
    searchFor('Chennai')
    await results()
    const scroll = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scroll
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('max-width'), media: q }))
    try {
      const gh = screen.getByRole('article', { name: 'Government General Hospital' })
      fireEvent.click(within(gh).getByRole('button', { name: en['hospitals.showOnMap'] }))
      expect(scroll).toHaveBeenCalled()
      expect(gh).toHaveAttribute('data-selected', 'true')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('labels the search choices in Tamil, including the "or" between them', () => {
    mockApi(guest)
    renderApp('/hospitals', 'ta')
    expect(screen.getByRole('button', { name: STRINGS.ta['hospitals.findNearMe'] })).toBeInTheDocument()
    expect(screen.getByText(STRINGS.ta['hospitals.or'])).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: STRINGS.ta['hospitals.searchCity'] })).toBeInTheDocument()
  })
})
