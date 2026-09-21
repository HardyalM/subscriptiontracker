import { useEffect, useRef, useState } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../lib/notifications.js'
import { IconSliders, IconX, IconRewind, IconBan, IconSignOut } from './Icon.jsx'
import { useSession } from '../lib/session.jsx'

const MOTION_KEY = 'bnpl-tracker:reduce-motion'

/**
 * Reduce-motion preference, backed by localStorage but defaulting to the
 * OS-level `prefers-reduced-motion` setting when the user hasn't chosen
 * explicitly yet. Applied globally via a data attribute on <html> (see
 * index.css) rather than prop-drilling into every component.
 */
function useReducedMotion() {
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = window.localStorage.getItem(MOTION_KEY)
      if (stored !== null) return stored === 'true'
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = enabled ? 'true' : 'false'
    try {
      window.localStorage.setItem(MOTION_KEY, String(enabled))
    } catch {
      // best-effort — a missing preference just means it defaults again next load
    }
  }, [enabled])

  return [enabled, setEnabled]
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted first:pt-2">
      {children}
    </p>
  )
}

function Toggle({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-sunken'
      }`}
    >
      <span className="text-ink-primary">{children}</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? 'bg-brand-500' : 'bg-ink-muted/25'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-card transition ${
            active ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * Settings, consolidated into one place: Appearance (reduce motion),
 * Notifications (opt-in browser reminders), and Data (load example data /
 * clear everything) — previously a loose pill row above the fold plus a
 * footer link, now a single dropdown off a header icon like most apps do
 * their settings.
 */
export default function SettingsMenu({ hasCommitments, onLoadDemo, onClearAll }) {
  const { user, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const [reducedMotion, setReducedMotion] = useReducedMotion()
  const [permission, setPermission] = useState(getNotificationPermission)
  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handlePointer(e) {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function handleReminders() {
    if (permission !== 'default') return
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  const remindersOn = permission === 'granted'
  const remindersDisabled = permission === 'denied'
  const remindersLabel = permission === 'denied' ? 'Reminders blocked in browser' : 'Browser reminders'

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-haspopup="true"
        aria-expanded={open}
        title="Settings"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
          open
            ? 'border-brand-500/30 bg-brand-50 text-brand-600'
            : 'border-ink-muted/20 text-ink-secondary hover:bg-surface-sunken'
        }`}
      >
        <IconSliders className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-20 w-72 overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-raised"
        >
          <div className="flex items-center justify-between border-b border-ink-muted/10 px-3.5 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">Settings</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close settings"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-sunken hover:text-ink-primary"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-2 pb-2.5">
            <SectionLabel>Account</SectionLabel>
            <p className="truncate px-3 pb-1 text-sm text-ink-primary" title={user?.email}>
              {user?.email}
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-primary transition hover:bg-surface-sunken"
            >
              <IconSignOut className="h-4 w-4 text-ink-muted" />
              Sign out
            </button>

            <SectionLabel>Appearance</SectionLabel>
            <Toggle active={reducedMotion} onClick={() => setReducedMotion((v) => !v)}>
              Reduce motion
            </Toggle>

            {isNotificationSupported() && (
              <>
                <SectionLabel>Notifications</SectionLabel>
                <Toggle active={remindersOn} disabled={remindersDisabled} onClick={handleReminders}>
                  {remindersLabel}
                </Toggle>
                <p className="px-3 pb-1 text-[11px] leading-snug text-ink-muted">
                  Only fires while this tab is open — there's no background push.
                </p>
              </>
            )}

            <SectionLabel>Data</SectionLabel>
            <button
              type="button"
              onClick={() => {
                onLoadDemo()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink-primary transition hover:bg-surface-sunken"
            >
              <IconRewind className="h-4 w-4 text-ink-muted" />
              Load example data
            </button>
            <button
              type="button"
              disabled={!hasCommitments}
              onClick={() => {
                onClearAll()
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                hasCommitments
                  ? 'text-status-critical hover:bg-status-critical/8'
                  : 'cursor-not-allowed text-ink-muted/50'
              }`}
            >
              <IconBan className="h-4 w-4" />
              Clear all data
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
