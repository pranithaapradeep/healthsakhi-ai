// Thin fetch wrapper. All backend calls go through here so UI components never touch fetch directly.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** Versioned API prefix. */
export const API_V1 = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  // Required by the backend on state-changing requests (CSRF defence; see backend ClientHeaderMiddleware).
  headers.set('X-HS-Client', 'web')

  let res: Response
  try {
    // The session lives in an httpOnly cookie that JavaScript cannot read; no token is ever stored in the frontend.
    // credentials: 'include' is needed when frontend and backend are on different origins.
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error')
  }

  if (!res.ok) {
    let detail = res.statusText || 'request_failed'
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
