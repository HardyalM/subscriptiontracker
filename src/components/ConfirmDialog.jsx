import { useState } from 'react'
import Modal from './Modal.jsx'
import { IconSpinner, IconTrash } from './Icon.jsx'
import { describeWriteError } from '../lib/writeErrors.js'

/**
 * Confirmation for an action that can't be undone.
 *
 * Replaces window.confirm, which can't be styled, can't show progress, and
 * gives no way to explain what happens next. This one waits for the action
 * to actually finish before closing, shows a spinner on the button while it
 * runs, and reports a failure in place instead of closing as if it worked.
 *
 * `onConfirm` must return a promise.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busyLabel = 'Working…',
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function close() {
    if (busy) return
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      setBusy(false)
      onClose()
    } catch (err) {
      setBusy(false)
      setError(err)
    }
  }

  return (
    <Modal open={open} onClose={close} labelledBy="confirm-dialog-title" size="sm">
      <div className="overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-elevated">
        <div className="px-6 pb-5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-critical/10 text-status-critical-text ring-1 ring-inset ring-status-critical/20">
            <IconTrash className="h-5 w-5" />
          </div>
          <h2 id="confirm-dialog-title" className="mt-4 font-display text-lg font-bold tracking-tight text-ink-primary">
            {title}
          </h2>
          <div className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{body}</div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-status-critical/20 bg-status-critical/[0.06] px-3.5 py-2.5 text-sm text-status-critical-text"
            >
              {describeWriteError(error)} Nothing was removed.
            </p>
          )}
        </div>

        {/* Native dialog footer: a sunken bar with the actions right-aligned,
            the safe choice first so it is what a stray Enter lands on. */}
        <div className="flex flex-col-reverse gap-2 border-t border-ink-muted/10 bg-surface-sunken/60 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-muted/20 bg-white px-4 text-sm font-semibold text-ink-primary shadow-sm transition-all duration-150 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-status-critical-text px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/50 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-80"
          >
            {busy && <IconSpinner className="h-4 w-4 animate-spin" />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
