import { ApiError, apiRequest } from './client'

export type ServerHealth = 'online' | 'degraded'

/** 'online' when the API and database are up; 'degraded' when the API answers but the database is down. */
export async function checkHealth(signal?: AbortSignal): Promise<ServerHealth> {
  try {
    const res = await apiRequest<{ status: string }>('/api/health', { signal })
    return res.status === 'ok' ? 'online' : 'degraded'
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return 'degraded'
    throw err
  }
}
