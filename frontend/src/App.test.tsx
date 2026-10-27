import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from './i18n/strings'
import { mockApi } from './test/mockApi'
import { renderApp } from './test/renderApp'

describe('App shell', () => {
  it('renders the landing page with a start-conversation link', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.en['landing.heroTitle'] })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: STRINGS.en['landing.start'] })).toHaveAttribute('href', '/chat')
  })

  it('shows emergency guidance with a tel:112 link without login', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: STRINGS.en['emergency.title'] })).toBeInTheDocument()
    const callLinks = screen.getAllByRole('link', { name: /112/ })
    expect(callLinks.length).toBeGreaterThan(0)
    callLinks.forEach((a) => expect(a).toHaveAttribute('href', 'tel:112'))
  })

  it('shows emergency guidance before hospital search', () => {
    renderApp('/hospitals')
    const emergency = screen.getByRole('heading', { name: STRINGS.en['emergency.title'] })
    const findBtn = screen.getByRole('button', { name: STRINGS.en['hospitals.findNearMe'] })
    expect(emergency.compareDocumentPosition(findBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('switches the UI to Tamil and Hindi and updates <html lang>', () => {
    renderApp('/')
    const [select] = screen.getAllByRole('combobox')
    fireEvent.change(select, { target: { value: 'ta' } })
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.ta['landing.heroTitle'] })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ta')
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'hi' } })
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.hi['landing.heroTitle'] })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('hi')
  })

  it('remembers the chosen language', () => {
    renderApp('/')
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'hi' } })
    expect(window.localStorage.getItem('healthsakhi.lang')).toBe('hi')
  })

  it('restores the saved language on a fresh render', () => {
    const first = renderApp('/')
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'hi' } })
    first.unmount()
    document.documentElement.lang = 'en'

    renderApp('/') // no initialLang: must come from storage
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.hi['landing.heroTitle'] })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('hi')
    expect(document.documentElement.lang).toBe('hi')
  })

  it('ignores an invalid saved language and falls back to English', () => {
    window.localStorage.setItem('healthsakhi.lang', 'fr')
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.en['landing.heroTitle'] })).toBeInTheDocument()
  })

  it.each([
    ['/login', 'auth.loginTitle'],
    ['/register', 'auth.registerTitle'],
    ['/chat', 'chat.title'],
    ['/assessment', 'assessment.title'],
    ['/hospitals', 'hospitals.title'],
    ['/tips', 'tips.title'],
    ['/history', 'history.title'],
    ['/profile', 'profile.title'],
    ['/privacy', 'privacy.title'],
    ['/no-such-page', 'notFound.title'],
  ] as const)('route %s renders its page', (path, key) => {
    renderApp(path)
    expect(screen.getByRole('heading', { level: 1, name: STRINGS.en[key] })).toBeInTheDocument()
  })

  it('rejects invalid login input on the client', () => {
    renderApp('/login')
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['auth.submitLogin'] }))
    expect(screen.getByRole('alert')).toHaveTextContent(STRINGS.en['auth.invalid'])
  })

  it('shows the server as not reachable when the API is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderApp('/dashboard')
    await waitFor(() => expect(screen.getByText(STRINGS.en['status.offline'])).toBeInTheDocument())
  })

  it('shows "database unavailable" when the API answers 503', async () => {
    mockApi({ 'GET /api/health': { status: 503, body: { status: 'degraded', database: 'unavailable', version: '0.2.0' } } })
    renderApp('/dashboard')
    expect(await screen.findByText(STRINGS.en['status.degraded'])).toBeInTheDocument()
  })

  it('shows the server as connected when the API is healthy', async () => {
    mockApi({ 'GET /api/health': { status: 200, body: { status: 'ok', database: 'ok', version: '0.2.0' } } })
    renderApp('/dashboard')
    expect(await screen.findByText(STRINGS.en['status.online'])).toBeInTheDocument()
  })

  it('asks guests to log in on the profile page and offers no account deletion', async () => {
    renderApp('/profile')
    expect(await screen.findByText(STRINGS.en['profile.loginRequired'])).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: STRINGS.en['profile.deleteData'] })).not.toBeInTheDocument()
  })
})
