import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconMore, IconSpinner } from '../Icon.jsx'
import { usePresence } from '../../lib/usePresence.js'

const MENU_WIDTH = 208 // px — matches w-52

/**
 * The per-row actions menu: a quiet "⋯" trigger that opens a small
 * floating menu, the way Linear and Stripe handle row actions.
 *
 * Rendered through a portal. The tables clip their overflow to keep their
 * rounded corners, so a menu rendered inline would be cut off on the last
 * rows of every table — which is exactly where people reach for it.
 *
 * Keyboard: Enter/Space opens, arrow keys move, Escape closes and returns
 * focus to the trigger. Scrolling or resizing closes it rather than leaving
 * it floating detached from its row.
 *
 * Closing plays a short exit (usePresence) rather than vanishing in one
 * frame, and the menu scales from the corner nearest its trigger.
 *
 * `busy` replaces the trigger's dots with a spinner and disables it, so an
 * action in flight is visible on the row it belongs to.
 */
export default function RowMenu({ label, items, busy = false }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const presence = usePresence(open, 160)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuHeight = items.length * 40 + 12
    const below = rect.bottom + 6 + menuHeight <= window.innerHeight
    setPosition({
      top: below ? rect.bottom + 6 : rect.top - 6 - menuHeight,
      left: Math.max(8, rect.right - MENU_WIDTH),
      origin: below ? 'top right' : 'bottom right',
    })
  }, [open, items.length])

  // Focus the first item once the menu is actually on screen. It renders
  // only after its position is measured, so this waits for that rather
  // than firing on `open` alone, when there is nothing to focus yet.
  useEffect(() => {
    if (open && position) menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus()
  }, [open, position])

  useEffect(() => {
    if (!open) return undefined

    function close() {
      setOpen(false)
    }
    function handlePointer(e) {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const entries = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])
        const index = entries.indexOf(document.activeElement)
        const step = e.key === 'ArrowDown' ? 1 : -1
        entries[(index + step + entries.length) % entries.length]?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function select(item) {
    // Return focus to the trigger before acting, so anything the action
    // opens (a dialog) hands focus back to a button that still exists.
    setOpen(false)
    triggerRef.current?.focus()
    item.onSelect()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={busy ? `${label} — working` : `Actions for ${label}`}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-wait ${
          open
            ? 'border-brand-500/40 bg-accent-soft text-accent-text'
            : 'border-transparent text-ink-secondary hover:border-ink-muted/20 hover:bg-surface-raised hover:text-ink-primary hover:shadow-sm'
        }`}
      >
        {busy ? <IconSpinner className="h-4 w-4 animate-spin" /> : <IconMore className="h-4 w-4" />}
      </button>

      {presence.mounted &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${label}`}
            onAnimationEnd={presence.onAnimationEnd}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH, transformOrigin: position.origin }}
            className={`fixed z-50 rounded-xl border border-ink-muted/12 bg-surface p-1.5 shadow-elevated ${
              presence.exiting ? 'pointer-events-none animate-menu-out' : 'animate-menu-in'
            }`}
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={`sep-${i}`} className="my-1 h-px bg-ink-muted/10" role="separator" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => select(item)}
                  disabled={item.disabled}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium outline-none transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                    item.danger
                      ? 'text-status-critical-text hover:bg-status-critical/[0.07] focus:bg-status-critical/[0.07]'
                      : 'text-ink-primary hover:bg-surface-sunken focus:bg-surface-sunken'
                  }`}
                >
                  <span className={item.danger ? 'text-status-critical-text' : 'text-ink-secondary'}>{item.icon}</span>
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
