import { useEffect } from 'react'

/**
 * Small reusable centred-dialog wrapper. Used for the add/edit commitment
 * form so it no longer pushes the rest of the page down when it's open —
 * closes on Escape, on a backdrop click, or via whatever close control the
 * content itself provides.
 */
export default function Modal({ open, onClose, labelledBy, children }) {
  useEffect(() => {
    if (!open) return undefined
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink-primary/45 px-4 py-8 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        {children}
      </div>
    </div>
  )
}
