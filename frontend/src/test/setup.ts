import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Node 25+ ships an experimental global `localStorage` that is enabled by default. Without a valid
// `--localstorage-file` it is a non-functional object, and because it already exists on globalThis it
// shadows jsdom's window.localStorage in Vitest's jsdom environment. Restore jsdom's real Web Storage
// implementation so tests exercise genuine browser-like storage behaviour (not a hand-written mock).
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
for (const name of ['localStorage', 'sessionStorage'] as const) {
  const current = (globalThis as Record<string, unknown>)[name] as Storage | undefined
  if (typeof current?.getItem !== 'function') {
    if (!jsdomWindow) throw new Error(`${name} is unusable and no jsdom window is available to restore it`)
    Object.defineProperty(globalThis, name, { configurable: true, enumerable: true, get: () => jsdomWindow[name] })
  }
}
if (typeof window.localStorage.getItem !== 'function') {
  throw new Error('Test environment error: window.localStorage is still not a Web Storage object')
}

// By default the backend is "not running": every request fails like a network error.
// Tests that need API responses install their own handlers with mockApi().
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})
