import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../../lib/notifications.js'
import { useSession } from '../../lib/session.jsx'
import { useEmailAlertPreference, setEmailAlerts } from '../../lib/guideQueries.js'
import { IconSignOut, IconRewind, IconBan, IconCheck } from '../Icon.jsx'

const MOTION_KEY = 'bnpl-tracker:reduce-motion'

/**
 * Reduce-motion preference, backed by localStorage but defaulting to the
 * OS-level `prefers-reduced-motion` setting when the user hasn't chosen
 * explicitly. Applied globally via a data attribute on <html> (see
 * index.css) rather than prop-drilled.
 *
 * Carried over unchanged from the settings menu this replaces.
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
      // best-effort — a missing preference just defaults again next load
    }
  }, [enabled])

  return [enabled, setEnabled]
}

/**
 * Account and preferences, behind an avatar in the top bar.
 *
 * Every behaviour from the previous settings menu is preserved — reduce
 * motion, opt-in browser reminders, opt-in email alerts, load example data,
 * clear everything, sign out — restyled and regrouped so account identity
 * leads rather than being the last item in a list of toggles.
 */
export default function UserMenu({ hasCommitments, onLoadDemo, onClearAll }) {
  const { user, signOut } = useSession()
  const queryClient = useQueryClient()
  const { data: emailAlerts = false } = useEmailAlertPreference()

  const [open, setOpen] = useState(false)
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [alertsError, setAlertsError] = useState('')
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
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
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
    setPermission(await requestNotificationPermission())
  }

  async function handleEmailAlerts() {
    setSavingAlerts(true)
    setAlertsError('')
    try {
      await setEmailAlerts(!emailAlerts)
      queryClient.invalidateQueries({ queryKey: ['email-alerts', user?.id] })
    } catch {
      // Without this the rejection escapes unhandled and the toggle
      // silently springs back with no explanation.
      setAlertsError("Couldn't save that. Your setting is unchanged.")
    } finally {
      setSavingAlerts(false)
    }
  }

  const remindersOn = permission === 'granted'
  const remindersBlocked = permission === 'denied'
  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and settings"
        className={`flex h-9 items-center gap-2 rounded-xl border pl-1 pr-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
          open
            ? 'border-brand-500/40 bg-brand-50'
            : 'border-ink-muted/20 bg-white hover:border-ink-muted/35 hover:bg-surface-sunken/60'
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-[13px] font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink-secondary sm:block">
          {user?.email}
        </span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-ink-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 8l4.5 4.5L14.5 8" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-11 z-30 w-[19rem] overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-elevated"
        >
          <div className="flex items-center gap-3 border-b border-ink-muted/10 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-primary" title={user?.email}>
                {user?.email}
              </p>
              <p className="text-xs text-ink-secondary">Personal workspace</p>
            </div>
          </div>

          <div className="px-2 py-2">
            <Section>Preferences</Section>
            <Toggle active={reducedMotion} onClick={() => setReducedMotion((v) => !v)}>
              Reduce motion
            </Toggle>

            {isNotificationSupported() && (
              <>
                <Toggle active={remindersOn} disabled={remindersBlocked} onClick={handleReminders}>
                  {remindersBlocked ? 'Reminders blocked in browser' : 'Browser reminders'}
                </Toggle>
                <Hint>Only fires while this tab is open — there's no background push.</Hint>
              </>
            )}

            <Toggle active={emailAlerts} disabled={savingAlerts} onClick={handleEmailAlerts}>
              Email me what's due
            </Toggle>
            <Hint>One email a day, only when something falls due in the next 48 hours.</Hint>
            {alertsError && (
              <p role="alert" className="px-3 pb-1 text-[11px] leading-snug text-status-critical-text">
                {alertsError}
              </p>
            )}

            <Section>Data</Section>
            <MenuItem
              icon={<IconRewind className="h-4 w-4" />}
              onClick={() => {
                onLoadDemo()
                setOpen(false)
              }}
            >
              Load example data
            </MenuItem>
            <MenuItem
              icon={<IconBan className="h-4 w-4" />}
              disabled={!hasCommitments}
              danger
              onClick={() => {
                onClearAll()
                setOpen(false)
              }}
            >
              Clear all data
            </MenuItem>
          </div>

          <div className="border-t border-ink-muted/10 px-2 py-2">
            <MenuItem
              icon={<IconSignOut className="h-4 w-4" />}
              onClick={() => {
                setOpen(false)
                signOut()
              }}
            >
              Sign out
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ children }) {
  return (
    <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary first:pt-1">
      {children}
    </p>
  )
}

function Hint({ children }) {
  return <p className="px-3 pb-1.5 text-[11px] leading-snug text-ink-secondary/80">{children}</p>
}

function MenuItem({ icon, children, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
        disabled
          ? 'cursor-not-allowed text-ink-muted'
          : danger
            ? 'text-status-critical-text hover:bg-status-critical/[0.07]'
            : 'text-ink-primary hover:bg-surface-sunken'
      }`}
    >
      <span className={disabled ? 'text-ink-muted' : danger ? 'text-status-critical-text' : 'text-ink-secondary'}>
        {icon}
      </span>
      {children}
    </button>
  )
}

function Toggle({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'text-ink-primary hover:bg-surface-sunken'
      }`}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          active ? 'bg-brand-600' : 'bg-ink-muted/25'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-card transition-all duration-200 ${
            active ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
