import { useEffect, useState } from 'react'
import {
  useCommitments,
  useSaveCommitment,
  useToggleCommitmentStatus,
  useRecordDecision,
  useReplaceCommitments,
  useClearCommitments,
} from './lib/commitmentQueries.js'
import { getRenewalCheckpointItems } from './lib/calculations.js'
import { notifyIfDue } from './lib/notifications.js'
import { buildDemoCommitments } from './lib/demoData.js'
import { IconLogo, IconPlus } from './components/Icon.jsx'
import HeadlineExposure from './components/HeadlineExposure.jsx'
import RenewalCheckpoint from './components/RenewalCheckpoint.jsx'
import Dashboard from './components/Dashboard.jsx'
import CategoryBreakdown from './components/CategoryBreakdown.jsx'
import CommitmentForm from './components/CommitmentForm.jsx'
import ExportButton from './components/ExportButton.jsx'
import SettingsMenu from './components/SettingsMenu.jsx'
import Modal from './components/Modal.jsx'
import ImportLocalData from './components/ImportLocalData.jsx'

export default function App() {
  const { data: commitments = [], isPending, isError, refetch } = useCommitments()
  const saveCommitment = useSaveCommitment()
  const toggleStatus = useToggleCommitmentStatus()
  const recordDecision = useRecordDecision()
  const replaceCommitments = useReplaceCommitments()
  const clearCommitments = useClearCommitments()
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const editingCommitment = commitments.find((c) => c.id === editingId) || null

  // Browser reminders — only fires while this tab is open (see
  // src/lib/notifications.js for the honest caveat on what this can and
  // can't do without a backend).
  useEffect(() => {
    notifyIfDue(getRenewalCheckpointItems(commitments))
  }, [commitments])

  function handleSave(record) {
    // The form still produces a client-side id for new records; the database
    // assigns the real one, so only an edit carries an id through.
    saveCommitment.mutate(editingCommitment ? { ...record, id: editingCommitment.id } : { ...record, id: null })
    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(commitment) {
    setEditingId(commitment.id)
    setShowForm(true)
  }

  // Seeds a realistic set of commitments so the effect (headline number,
  // renewal checkpoint) is visible in seconds instead of on an empty
  // dashboard — mainly for a first look/demo, not day-to-day use.
  function handleLoadDemo() {
    replaceCommitments.mutate(buildDemoCommitments())
  }

  function handleClearAll() {
    if (commitments.length === 0) return
    const confirmed = window.confirm('Clear all commitments? This removes everything in your account and cannot be undone.')
    if (confirmed) clearCommitments.mutate()
  }

  function handleToggleStatus(commitment) {
    toggleStatus.mutate(commitment)
  }

  // The renewal checkpoint's "Keep it" / "Reconsider" taps. "Keep it" also
  // moves the commitment on to its next cycle (see applyKeepDecision) —
  // that's the fix for renewal dates silently going stale. Both taps log
  // the decision with the £ amount at that moment, so the running
  // kept/reconsidered totals stay meaningful even as costs change later.
  function handleRenewalAction(commitment, decision) {
    recordDecision.mutate({ commitment, decision })
  }

  return (
    <div className="min-h-screen bg-surface-page pb-20">
      <header className="sticky top-0 z-10 border-b border-ink-muted/10 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-card">
              <IconLogo className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold leading-tight text-ink-primary sm:text-lg">
                Subscription &amp; BNPL Tracker
              </h1>
              <p className="hidden text-xs text-ink-secondary sm:block sm:text-sm">
                What your recurring costs actually add up to.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ExportButton commitments={commitments} />
            <SettingsMenu hasCommitments={commitments.length > 0} onLoadDemo={handleLoadDemo} onClearAll={handleClearAll} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6 sm:px-6">
        {isError ? (
          <div className="rounded-xl border border-status-critical/25 bg-status-critical/5 px-4 py-3.5">
            <p className="text-sm font-semibold text-ink-primary">Couldn't load your commitments</p>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Nothing has been lost — this is a problem reading them, not a problem with your data.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600"
            >
              Try again
            </button>
          </div>
        ) : (
          <ImportLocalData />
        )}

        <HeadlineExposure commitments={commitments} />

        <RenewalCheckpoint commitments={commitments} onAction={handleRenewalAction} />

        <CategoryBreakdown commitments={commitments} />

        <div className="space-y-2">
          <button
            onClick={() => setShowForm(true)}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-muted/25 py-5 text-sm font-semibold text-ink-secondary transition hover:border-brand-500 hover:bg-brand-50/60 hover:text-brand-600"
          >
            <IconPlus className="h-4 w-4" />
            Add a subscription or BNPL commitment
          </button>
          {commitments.length === 0 && !isPending && (
            <p className="text-center text-xs text-ink-muted">
              New here?{' '}
              <button onClick={handleLoadDemo} className="font-medium text-brand-600 underline-offset-2 hover:underline">
                Load example data
              </button>{' '}
              to see how it works.
            </p>
          )}
        </div>

        <Dashboard commitments={commitments} onEdit={handleEdit} onToggleStatus={handleToggleStatus} />

        <footer className="flex flex-col items-center gap-1 pt-4 text-center text-xs text-ink-muted">
          <p>
            Your commitments are still stored in this browser — only your account details are on the server.
          </p>
          <p className="text-ink-muted/70">Settings (top right) has example data and a reset if you need one.</p>
        </footer>
      </main>

      <Modal
        open={showForm || Boolean(editingCommitment)}
        labelledBy="commitment-form-heading"
        onClose={() => {
          setEditingId(null)
          setShowForm(false)
        }}
      >
        <CommitmentForm
          editingCommitment={editingCommitment}
          onSave={handleSave}
          onCancel={() => {
            setEditingId(null)
            setShowForm(false)
          }}
        />
      </Modal>
    </div>
  )
}
