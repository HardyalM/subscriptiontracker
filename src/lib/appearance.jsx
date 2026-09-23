import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Appearance preferences: theme, accent, density and motion.
 *
 * Stored per device in localStorage, deliberately not in the database. These
 * are the same kind of choice as your OS's light/dark setting — a laptop and
 * a phone can reasonably differ — and keeping them local means the right
 * theme is known before first paint, with no network round trip. The boot
 * script in index.html reads the same keys.
 *
 * Everything is applied as attributes on <html>, where the CSS variables in
 * index.css pick it up. Components never branch on theme; the variables do.
 */

const KEY = (name) => `bnpl-tracker:${name}`

export const THEMES = ['light', 'dark', 'system']
export const DENSITIES = ['spacious', 'compact']

/**
 * Curated accents. Each scale was checked at WCAG AA for every role it
 * plays in both themes — white text on the button, link text on the
 * surface, text on the tinted background. Amber sits close to the warning
 * colour, so it was pushed towards bronze to keep a primary button from
 * reading as an alert.
 */
export const ACCENTS = [
  { id: 'cobalt', label: 'Cobalt', swatch: '#1e5fb5' },
  { id: 'emerald', label: 'Emerald', swatch: '#047857' },
  { id: 'violet', label: 'Violet', swatch: '#6d28d9' },
  { id: 'amber', label: 'Amber', swatch: '#a8520a' },
]

function read(name, fallback, allowed) {
  try {
    const value = window.localStorage.getItem(KEY(name))
    if (value !== null && (!allowed || allowed.includes(value))) return value
  } catch {
    // Storage blocked (private mode, disabled cookies) — use the default.
  }
  return fallback
}

function write(name, value) {
  try {
    window.localStorage.setItem(KEY(name), value)
  } catch {
    // Best-effort. The preference still applies for this session.
  }
}

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
const systemPrefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const AppearanceContext = createContext(null)

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) throw new Error('useAppearance() must be called inside <AppearanceProvider>')
  return value
}

export function AppearanceProvider({ children }) {
  const [theme, setThemeState] = useState(() => read('theme', 'system', THEMES))
  const [accent, setAccentState] = useState(() =>
    read('accent', 'cobalt', ACCENTS.map((a) => a.id)),
  )
  const [density, setDensityState] = useState(() => read('density', 'spacious', DENSITIES))
  const [reducedMotion, setReducedMotionState] = useState(() => {
    const stored = read('reduce-motion', null, ['true', 'false'])
    return stored === null ? systemPrefersReducedMotion() : stored === 'true'
  })
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Follow the OS when the choice is "System", including a change made
  // while the app is open.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return undefined
    const onChange = (e) => setSystemDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.dataset.accent = accent
    root.dataset.density = density
    root.dataset.reduceMotion = String(reducedMotion)
  }, [resolvedTheme, accent, density, reducedMotion])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    write('theme', next)
  }, [])
  const setAccent = useCallback((next) => {
    setAccentState(next)
    write('accent', next)
  }, [])
  const setDensity = useCallback((next) => {
    setDensityState(next)
    write('density', next)
  }, [])
  const setReducedMotion = useCallback((next) => {
    setReducedMotionState(next)
    write('reduce-motion', String(next))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      accent,
      density,
      reducedMotion,
      setTheme,
      setAccent,
      setDensity,
      setReducedMotion,
    }),
    [theme, resolvedTheme, accent, density, reducedMotion, setTheme, setAccent, setDensity, setReducedMotion],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}
