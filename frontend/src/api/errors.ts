import type { StringKey } from '../i18n/strings'
import { ApiError } from './client'

/** Maps an API failure to a user-facing, translated message key. Never shows raw server text. */
export function errorMessageKey(err: unknown): StringKey {
  if (!(err instanceof ApiError)) return 'common.error'
  switch (err.status) {
    case 0:
      return 'auth.errorNetwork'
    case 401:
      return 'auth.errorInvalidCredentials'
    case 409:
      return 'auth.errorEmailTaken'
    case 422:
      return 'auth.invalid'
    case 429:
      return 'auth.errorRateLimited'
    default:
      return 'common.error'
  }
}
