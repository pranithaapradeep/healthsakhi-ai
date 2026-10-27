import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STRINGS } from '../i18n/strings'
import { USER, callsTo, mockApi } from '../test/mockApi'
import { renderApp } from '../test/renderApp'

const ME = 'GET /api/v1/auth/me'
const guest = { [ME]: { status: 401, body: { detail: 'not_authenticated' } } }
const signedIn = { [ME]: { status: 200, body: USER } }

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(STRINGS.en['auth.email']), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(STRINGS.en['auth.password']), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: STRINGS.en['auth.submitLogin'] }))
}

describe('authentication', () => {
  it('logs in, sends credentials safely, applies the saved language and shows the dashboard', async () => {
    const fetchMock = mockApi({ ...guest, 'POST /api/v1/auth/login': { status: 200, body: { ...USER, preferred_language: 'ta' } } })
    renderApp('/login')
    fillLogin('asha@example.com', 'correct-horse-battery')

    expect(await screen.findByRole('heading', { level: 1, name: `${STRINGS.ta['dashboard.welcome']}, Asha` })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ta')

    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/auth/login')
    const headers = new Headers((init as RequestInit).headers)
    expect(headers.get('X-HS-Client')).toBe('web')
    expect((init as RequestInit).credentials).toBe('include')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ email: 'asha@example.com', password: 'correct-horse-battery' })

    // Nothing sensitive is persisted in browser storage — only the UI language.
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i))
    expect(keys).toEqual(['healthsakhi.lang'])
  })

  it('shows a generic message for wrong credentials', async () => {
    mockApi({ ...guest, 'POST /api/v1/auth/login': { status: 401, body: { detail: 'invalid_credentials' } } })
    renderApp('/login')
    fillLogin('asha@example.com', 'wrong-password')
    expect(await screen.findByText(STRINGS.en['auth.errorInvalidCredentials'])).toBeInTheDocument()
  })

  it('explains rate limiting and network failures', async () => {
    mockApi({ ...guest, 'POST /api/v1/auth/login': { status: 429, body: { detail: 'too_many_attempts' } } })
    renderApp('/login')
    fillLogin('asha@example.com', 'whatever-123')
    expect(await screen.findByText(STRINGS.en['auth.errorRateLimited'])).toBeInTheDocument()
  })

  it('reports an unreachable server on login', async () => {
    renderApp('/login') // default setup: every request fails like a network error
    fillLogin('asha@example.com', 'whatever-123')
    expect(await screen.findByText(STRINGS.en['auth.errorNetwork'])).toBeInTheDocument()
  })

  it('registers a new account in the currently selected language', async () => {
    const fetchMock = mockApi({ ...guest, 'POST /api/v1/auth/register': (init) => ({ status: 201, body: { ...USER, ...JSON.parse(String(init.body)) } }) })
    renderApp('/register', 'hi')
    fireEvent.change(screen.getByLabelText(STRINGS.hi['auth.displayName']), { target: { value: 'Asha' } })
    fireEvent.change(screen.getByLabelText(STRINGS.hi['auth.email']), { target: { value: 'asha@example.com' } })
    fireEvent.change(screen.getByLabelText(STRINGS.hi['auth.password']), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: STRINGS.hi['auth.submitRegister'] }))

    expect(await screen.findByRole('heading', { level: 1, name: `${STRINGS.hi['dashboard.welcome']}, Asha` })).toBeInTheDocument()
    const [[, init]] = callsTo(fetchMock, 'POST', '/api/v1/auth/register')
    expect(JSON.parse(String((init as RequestInit).body)).preferred_language).toBe('hi')
  })

  it('reports an already-registered email', async () => {
    mockApi({ ...guest, 'POST /api/v1/auth/register': { status: 409, body: { detail: 'email_already_registered' } } })
    renderApp('/register')
    fireEvent.change(screen.getByLabelText(STRINGS.en['auth.displayName']), { target: { value: 'Asha' } })
    fireEvent.change(screen.getByLabelText(STRINGS.en['auth.email']), { target: { value: 'asha@example.com' } })
    fireEvent.change(screen.getByLabelText(STRINGS.en['auth.password']), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['auth.submitRegister'] }))
    expect(await screen.findByText(STRINGS.en['auth.errorEmailTaken'])).toBeInTheDocument()
  })

  it('restores the session on load and logs out', async () => {
    const fetchMock = mockApi({ ...signedIn, 'POST /api/v1/auth/logout': { status: 204 } })
    renderApp('/')
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['auth.logout'] }))
    expect(await screen.findByRole('link', { name: STRINGS.en['nav.login'] })).toBeInTheDocument()
    expect(callsTo(fetchMock, 'POST', '/api/v1/auth/logout')).toHaveLength(1)
  })

  it('stays signed in and says so when logout cannot reach the server', async () => {
    mockApi(signedIn) // POST /auth/logout is unmocked → fails like a network error
    renderApp('/')
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['auth.logout'] }))
    expect(await screen.findByRole('alert')).toHaveTextContent(STRINGS.en['auth.logoutFailed'])
    expect(screen.getByRole('button', { name: STRINGS.en['auth.logout'] })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: STRINGS.en['nav.login'] })).not.toBeInTheDocument()
  })

  it('keeps emergency guidance visible for signed-in users', async () => {
    mockApi(signedIn)
    renderApp('/')
    await screen.findByRole('button', { name: STRINGS.en['auth.logout'] })
    expect(screen.getByRole('heading', { name: STRINGS.en['emergency.title'] })).toBeInTheDocument()
    screen.getAllByRole('link', { name: /112/ }).forEach((a) => expect(a).toHaveAttribute('href', 'tel:112'))
  })

  it('saves a language change to the signed-in profile', async () => {
    const fetchMock = mockApi({
      ...signedIn,
      'PATCH /api/v1/profile': (init) => ({ status: 200, body: { ...USER, ...JSON.parse(String(init.body)) } }),
    })
    renderApp('/')
    await screen.findByRole('button', { name: STRINGS.en['auth.logout'] })
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'ta' } })
    await waitFor(() => expect(callsTo(fetchMock, 'PATCH', '/api/v1/profile')).toHaveLength(1))
    const [[, init]] = callsTo(fetchMock, 'PATCH', '/api/v1/profile')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ preferred_language: 'ta' })
  })
})

describe('profile and history (signed in)', () => {
  it('opens and cancels the delete-account confirmation', async () => {
    const fetchMock = mockApi(signedIn)
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['profile.deleteData'] }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['common.cancel'] }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'DELETE', '/api/v1/profile')).toHaveLength(0)
  })

  it('requires the password to delete the account and handles a wrong password', async () => {
    let attempts = 0
    const fetchMock = mockApi({
      ...signedIn,
      'DELETE /api/v1/profile': () => (++attempts === 1 ? { status: 403, body: { detail: 'password_incorrect' } } : { status: 204 }),
    })
    renderApp('/profile')
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['profile.deleteData'] }))
    const confirm = screen.getByRole('button', { name: STRINGS.en['common.confirm'] })
    expect(confirm).toBeDisabled()

    const pw = screen.getByLabelText(STRINGS.en['profile.passwordPrompt'])
    fireEvent.change(pw, { target: { value: 'wrong-one' } })
    fireEvent.click(confirm)
    expect(await screen.findByText(STRINGS.en['profile.passwordIncorrect'])).toBeInTheDocument()

    fireEvent.change(pw, { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: STRINGS.en['common.confirm'] }))
    expect(await screen.findByText(STRINGS.en['profile.deleted'])).toBeInTheDocument()
    expect(screen.getByText(STRINGS.en['profile.loginRequired'])).toBeInTheDocument()
    const deletes = callsTo(fetchMock, 'DELETE', '/api/v1/profile')
    expect(JSON.parse(String((deletes[1][1] as RequestInit).body))).toEqual({ password: 'correct-horse-battery' })
  })

  it('lists the signed-in user’s conversations', async () => {
    mockApi({
      ...signedIn,
      'GET /api/v1/conversations': {
        status: 200,
        body: [
          { id: 'c1', title: 'தலைவலி', language: 'ta', created_at: '2026-10-24T10:00:00Z', updated_at: '2026-10-24T10:05:00Z' },
          { id: 'c2', title: '', language: 'en', created_at: '2026-10-23T10:00:00Z', updated_at: '2026-10-23T10:05:00Z' },
        ],
      },
    })
    renderApp('/history')
    expect(await screen.findByText('தலைவலி')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.en['history.untitled'])).toBeInTheDocument()
  })

  it('shows an error with retry when history fails to load', async () => {
    let calls = 0
    mockApi({
      ...signedIn,
      'GET /api/v1/conversations': () => (++calls === 1 ? { status: 500, body: { detail: 'internal_error' } } : { status: 200, body: [] }),
    })
    renderApp('/history')
    fireEvent.click(await screen.findByRole('button', { name: STRINGS.en['common.retry'] }))
    expect(await screen.findByText(STRINGS.en['history.empty'])).toBeInTheDocument()
  })
})
