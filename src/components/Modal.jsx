import { useEffect, useRef } from 'react'
import { usePresence } from '../lib/usePresence.js'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A centred sheet, in the manner of a native macOS or Windows dialog: dimmed
 * and blurred backdrop, a card that eases up into place, focus moved inside
 * on open and handed back to whatever opened it on close.
 *
 * The focus handling is the part that makes it feel native rather than
 * looking native. Without it, Tab walks straight out of the dialog into the
 * page behind, and closing drops focus onto <body> — both of which a
 * keyboard user notices immediately.
 *
 * It animates out as well as in. Closing keeps the sheet mounted for one
 * short exit animation (see usePresence), showing the content it had at the
 * moment it closed: the parent has usually already cleared whatever the
 * dialog was about — the row being deleted, the record being edited — and
 * without that snapshot the title would blank out mid-animation.
 *
 * `size` widens it for content like the CSV preview table; the default suits
 * a form.
 */
export default function Modal({ open, onClose, labelledBy, size = 'md', children }) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const { mounted, exiting, onAnimationEnd } = usePresence(open, 200)
  const lastChildren = useRef(children)
  if (open) lastChildren.current = children

  useEffect(() => {
    if (!open) return undefined

    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Prefer the first form field over the close button, so a form opens
    // ready to type into.
    const panel = panelRef.current
    const first =
      panel?.querySelector('input:not([type="hidden"]):not([disabled]), textarea, select') ??
      panel?.querySelector(FOCUSABLE)
    first?.focus()

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      // Keep Tab inside the dialog.
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open])

  if (!mounted) return null

  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-lg'

  return (
    <div
      className={`fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink-primary/30 px-4 py-10 backdrop-blur-[3px] sm:items-center dark:bg-black/55 ${
        exiting ? 'pointer-events-none animate-fade-out' : 'animate-fade-in'
      }`}
      onMouseDown={(e) => {
        // mousedown, not click: a drag that starts inside a field and ends
        // on the backdrop would otherwise close the dialog mid-selection.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onAnimationEnd={onAnimationEnd}
        className={`w-full ${width} ${exiting ? 'animate-sheet-out' : 'animate-sheet-in'}`}
      >
        {open ? children : lastChildren.current}
      </div>
    </div>
  )
}
