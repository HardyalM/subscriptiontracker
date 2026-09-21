import { useState } from 'react'
import { readLocalCommitments, clearLocalCommitments } from '../lib/storage.js'
import { useImportCommitments } from '../lib/commitmentQueries.js'
import { IconDownload, IconX } from './Icon.jsx'

/**
 * Offers to move data saved by v1 — which lived only in this browser — into
 * the signed-in account.
 *
 * It appends rather than replaces, and only clears the local copy once the
 * insert has actually succeeded. Dismissing leaves the local data untouched,
 * so nothing is destroyed by ignoring this.
 */
export default function ImportLocalData() {
  // Read once on mount: the list must not change under the user while the
  // banner is on screen.
  const [local] = useState(readLocalCommitments)
  const [dismissed, setDismissed] = useState(false)
  const [done, setDone] = useState(0)
  const importer = useImportCommitments()

  if (done > 0) {
    return (
      <div className="rounded-xl border border-status-good/25 bg-status-good/5 px-4 py-3 text-sm text-ink-secondary">
        Moved {done} {done === 1 ? 'commitment' : 'commitments'} into your account.
      </div>
    )
  }

  if (dismissed || local.length === 0) return null

  async function handleImport() {
    try {
      await importer.mutateAsync(local)
      clearLocalCommitments()
      setDone(local.length)
    } catch {
      // The error surfaces below via importer.isError; the local copy is
      // deliberately left alone so the import can be retried.
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <IconDownload className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-primary">
            {local.length} {local.length === 1 ? 'commitment' : 'commitments'} saved in this browser
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
            These were stored before you had an account. Move them across and they'll follow you to any device.
          </p>

          {importer.isError && (
            <p role="alert" className="mt-2 text-sm text-status-critical">
              That didn't work — nothing was moved, and your local copy is untouched. Try again?
            </p>
          )}

          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={importer.isPending}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importer.isPending ? 'Moving…' : 'Move them across'}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:bg-white/70"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-white/70 hover:text-ink-primary"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
