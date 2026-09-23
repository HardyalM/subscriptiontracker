import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../lib/session.jsx'
import { usePresence } from '../../lib/usePresence.js'
import { IconSignOut, IconGear } from '../Icon.jsx'

/**
 * Account menu behind the avatar: who you are, a way into Settings, and
 * sign out.
 *
 * Preferences and data actions used to live in here as a column of
 * toggles. They moved to the Settings page, which has room to explain each
 * one — and "Load example data", which silently replaced everything, moved
 * to the Danger Zone behind a confirmation.
 */
export default function UserMenu({ onOpenSettings }) {
  const { user, workspace, signOut } = useSession()
  const [open, setOpen] = useState(false)
  const presence = usePresence(open)
  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    panelRef.current?.querySelector('[role="menuitem"]')?.focus()
    function handlePointer(e) {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = Array.from(panelRef.current?.querySelectorAll('[role="menuitem"]') ?? [])
        const i = items.indexOf(document.activeElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className={`flex h-9 items-center gap-2 rounded-xl border pl-1 pr-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
          open
            ? 'border-brand-500/40 bg-accent-soft'
            : 'border-ink-muted/20 bg-surface hover:border-ink-muted/35 hover:bg-surface-sunken'
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-accent-fg">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink-secondary lg:block">{user?.email}</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 text-ink-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" />
        </svg>
      </button>

      {presence.mounted && (
        <div
          ref={panelRef}
          role="menu"
          onAnimationEnd={presence.onAnimationEnd}
          className={`absolute right-0 top-11 z-30 w-64 origin-top-right overflow-hidden rounded-2xl border border-ink-muted/12 bg-surface shadow-elevated ${
            presence.exiting ? 'pointer-events-none animate-menu-out' : 'animate-menu-in'
          }`}
        >
          <div className="flex items-center gap-3 border-b border-ink-muted/12 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-fg">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-primary" title={user?.email}>
                {user?.email}
              </p>
              <p className="truncate text-xs text-ink-secondary">{workspace?.name ?? 'Personal'} workspace</p>
            </div>
          </div>

          <div className="p-1.5">
            <MenuItem
              icon={<IconGear className="h-4 w-4" />}
              onClick={() => {
                setOpen(false)
                onOpenSettings()
              }}
            >
              Settings
            </MenuItem>
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

function MenuItem({ icon, children, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium text-ink-primary outline-none transition-colors duration-100 hover:bg-surface-sunken focus:bg-surface-sunken"
    >
      <span className="text-ink-secondary">{icon}</span>
      {children}
    </button>
  )
}
