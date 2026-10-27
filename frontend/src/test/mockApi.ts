import { vi } from 'vitest'
import type { User } from '../api/types'

export interface MockResponse {
  status: number
  body?: unknown
}
type Handler = MockResponse | ((init: RequestInit) => MockResponse | Promise<MockResponse>)

export const USER: User = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Asha',
  email: 'asha@example.com',
  preferred_language: 'en',
  voice_autoplay: false,
  created_at: '2026-10-25T10:00:00Z',
}

/**
 * Replace fetch with a router keyed by "METHOD /path" (query string ignored).
 * Unmatched requests fail like a network error. Returns the mock so tests can inspect calls.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
    const key = `${(init.method ?? 'GET').toUpperCase()} ${path}`
    const handler = routes[key]
    if (!handler) throw new TypeError(`Failed to fetch (unmocked ${key})`)
    const { status, body } = typeof handler === 'function' ? await handler(init) : handler
    return fakeResponse(status, body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function callsTo(fetchMock: ReturnType<typeof mockApi>, method: string, path: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) => String(input).split('?')[0].endsWith(path) && ((init as RequestInit | undefined)?.method ?? 'GET') === method,
  )
}

export function fakeResponse(status: number, body?: unknown): Response {
  return { ok: status >= 200 && status < 300, status, statusText: '', json: async () => body } as unknown as Response
}
