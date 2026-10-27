import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { updateProfile } from '../api/profile'
import type { User } from '../api/types'
import { useLanguage } from '../i18n/LanguageContext'

type AuthStatus = 'loading' | 'ready'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<User>
  register: (data: authApi.RegisterInput) => Promise<User>
  logout: () => Promise<void>
  /** Forget the local user after the server has already ended the session (e.g. account deleted). */
  clear: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLanguage()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const signIn = useCallback(
    (u: User) => {
      setUser(u)
      setLang(u.preferred_language)
      return u
    },
    [setLang],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    authApi
      .fetchMe(ctrl.signal)
      .then((u) => u && signIn(u))
      .catch(() => {
        /* server error: stay a guest; pages still work and emergency guidance never depends on this */
      })
      .finally(() => !ctrl.signal.aborted && setStatus('ready'))
    return () => ctrl.abort()
  }, [signIn])

  // Keep the saved preference in sync when a signed-in user changes the UI language.
  useEffect(() => {
    if (!user || user.preferred_language === lang) return
    let cancelled = false
    updateProfile({ preferred_language: lang })
      .then((u) => !cancelled && setUser(u))
      .catch(() => {
        /* non-critical; the UI language still changes locally */
      })
    return () => {
      cancelled = true
    }
  }, [lang, user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login: async (email, password) => signIn(await authApi.login(email, password)),
      register: async (data) => signIn(await authApi.register(data)),
      // Only forget the user once the server has revoked the session. If the request fails, the session is
      // still valid server-side, so the UI must not pretend the user is logged out (e.g. on a shared device).
      logout: async () => {
        await authApi.logout()
        setUser(null)
      },
      clear: () => setUser(null),
    }),
    [user, status, signIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
