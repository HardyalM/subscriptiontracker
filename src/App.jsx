import { useEffect, useMemo, useState } from 'react'
import {
  useCommitments,
  useSaveCommitment,
  useToggleCommitmentStatus,
  useRecordDecision,
  useReplaceCommitments,
  useClearCommitments,
  useImportCommitments,
  useDeleteCommitment,
} from './lib/commitmentQueries.js'
import { usePendingActions } from './lib/usePendingActions.js'
import { filterAndSortCommitments, DEFAULT_FILTERS, hasActiveFilters } from './lib/commitmentFilters.js'
import { getRenewalCheckpointItems } from './lib/calculations.js'
import { notifyIfDue } from './lib/notifications.js'
import { buildDemoCommitments } from './lib/demoData.js'

import { IconPlus, IconUpload, IconCamera } from './components/Icon.jsx'
import AppShell, { SectionHeading } from './components/shell/AppShell.jsx'
import UserMenu from './components/shell/UserMenu.jsx'
import StatGrid from './components/dashboard/StatGrid.jsx'
import ReviewQueue from './components/dashboard/ReviewQueue.jsx'
import CommitmentTable from './components/dashboard/CommitmentTable.jsx'
import { StatGridSkeleton, TableSkeleton, ReviewQueueSkeleton } from './components/dashboard/Skeletons.jsx'

import CategoryBreakdown from './components/CategoryBreakdown.jsx'
import ExportButton from './components/ExportButton.jsx'
import CommitmentForm from './components/CommitmentForm.jsx'
import Modal from './components/Modal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import ImportLocalData from './components/ImportLocalData.jsx'
import WriteFeedback from './components/WriteFeedback.jsx'
import CommitmentFilters from './components/manage/CommitmentFilters.jsx'
import CsvImport from './components/manage/CsvImport.jsx'
import ReceiptImport from './components/receipts/ReceiptImport.jsx'
import ExposureTrend from './components/manage/ExposureTrend.jsx'
import BankSyncCard from './components/bank-sync/BankSyncCard.jsx'
import SuggestionsReview from './components/bank-sync/SuggestionsReview.jsx'
import CalendarMonth from './components/calendar/CalendarMonth.jsx'
import CashFlowForecast from './components/calendar/CashFlowForecast.jsx'

export default function App() {
  const { data: commitments = [], isPending, isError, refetch } = useCommitments()
  const saveCommitment = useSaveCommitment()
  const toggleStatus = useToggleCommitmentStatus()
  const recordDecision = useRecordDecision()
  const replaceCommitments = useReplaceCommitments()
  const clearCommitments = useClearCommitments()
  const importCommitments = useImportCommitments()
  const deleteCommitment = useDeleteCommitment()
  const pending = usePendingActions()

  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  // A draft produced by the receipt parser. It seeds the normal add form
  // rather than being written anywhere — a model's reading of a receipt is a
  // suggestion, not a fact.
  const [prefillDraft, setPrefillDraft] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const editingCommitment = commitments.find((c) => c.id === editingId) || null

  // Derived state over the cache — no refetch, no round-trip per keystroke.
  const visible = useMemo(() => filterAndSortCommitments(commitments, filters), [commitments, filters])
  // Split by kind so each table's headers are exactly true of its rows.
  // Within each, active before cancelled — a stable sort, so the user's
  // chosen ordering survives inside each group.
  const byKind = useMemo(() => {
    const ordered = [...visible].sort(
      (a, b) => Number(a.status === 'cancelled') - Number(b.status === 'cancelled'),
    )
    return {
      subscriptions: ordered.filter((c) => c.type === 'subscription'),
      bnpl: ordered.filter((c) => c.type === 'bnpl'),
    }
  }, [visible])
  const filtered = commitments.length > 0 && hasActiveFilters(filters)

  // Browser reminders — only fires while this tab is open (see
  // src/lib/notifications.js for the honest caveat on what this can and
  // can't do without a backend).
  useEffect(() => {
    notifyIfDue(getRenewalCheckpointItems(commitments))
  }, [commitments])

  // Awaited on purpose. Closing the modal before the write lands means a
  // failure silently discards everything the user typed, with the form gone
  // and nothing to explain it.
  async function handleSave(record) {
    const payload = editingCommitment ? { ...record, id: editingCommitment.id } : { ...record, id: null }
    try {
      await saveCommitment.mutateAsync(payload)
    } catch {
      // Surfaced through saveCommitment.error, passed into the form below.
      return
    }
    closeForm()
  }

  function closeForm() {
    setEditingId(null)
    setShowForm(false)
    setPrefillDraft(null)
    saveCommitment.reset()
  }

  function handleEdit(commitment) {
    setEditingId(commitment.id)
    setShowForm(true)
  }

  function handleLoadDemo() {
    replaceCommitments.mutate(buildDemoCommitments())
  }

  function handleClearAll() {
    if (commitments.length === 0) return
    setConfirmClear(true)
  }

  // Each action is keyed to what was actually pressed, so its spinner lands
  // on that row and a second tap can't fire it twice. Failures are shown by
  // WriteFeedback from the mutation's own error state; the catch only stops
  // them also surfacing as unhandled rejections.
  function handleToggleStatus(commitment) {
    pending.run(`row:${commitment.id}`, () => toggleStatus.mutateAsync(commitment)).catch(() => {})
  }

  // "Keep it" also moves the commitment on to its next cycle (see
  // applyKeepDecision) — that's the fix for renewal dates silently going
  // stale. Both taps log the decision with the £ amount at that moment, so
  // the running totals stay meaningful even as costs change later.
  function handleRenewalAction(commitment, decision) {
    const key = `decision:${commitment.id}:${decision}`
    if (pending.isPendingPrefix(`decision:${commitment.id}:`)) return
    pending.run(key, () => recordDecision.mutateAsync({ commitment, decision })).catch(() => {})
  }

  function scrollToReview() {
    document.getElementById('review-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pageActions = (
    <>
      <ExportButton commitments={commitments} />
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-action transition-all duration-150 hover:bg-brand-700 hover:shadow-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:translate-y-px"
      >
        <IconPlus className="h-4 w-4" />
        Add
      </button>
    </>
  )

  return (
    <AppShell
      actions={pageActions}
      menu={
        <UserMenu
          hasCommitments={commitments.length > 0}
          onLoadDemo={handleLoadDemo}
          onClearAll={handleClearAll}
        />
      }
    >
      {isError ? (
        <div className="rounded-2xl border border-status-critical/25 bg-white p-6 shadow-card">
          <p className="font-display text-[15px] font-bold text-ink-primary">Couldn't load your commitments</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
            Nothing has been lost — this is a problem reading them, not a problem with your data.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-action transition-all duration-150 hover:bg-brand-700 hover:shadow-action-hover"
          >
            Try again
          </button>
        </div>
      ) : isPending ? (
        <div className="space-y-8">
          <StatGridSkeleton />
          <ReviewQueueSkeleton />
          <TableSkeleton />
        </div>
      ) : (
        <div className="space-y-10">
          <ImportLocalData />

          <StatGrid commitments={commitments} onReviewClick={scrollToReview} />

          <ReviewQueue
            id="review-queue"
            commitments={commitments}
            onAction={handleRenewalAction}
            pending={pending}
          />

          <SuggestionsReview />

          <section>
            <SectionHeading title="Your commitments" description="Everything you're currently signed up to.">
              <div className="flex gap-2">
                <SecondaryButton onClick={() => setShowImport(true)} icon={<IconUpload className="h-4 w-4" />}>
                  Import CSV
                </SecondaryButton>
                <SecondaryButton onClick={() => setShowReceipt(true)} icon={<IconCamera className="h-4 w-4" />}>
                  Read a receipt
                </SecondaryButton>
              </div>
            </SectionHeading>

            {commitments.length > 0 && (
              <div className="mb-4">
                <CommitmentFilters
                  filters={filters}
                  onChange={setFilters}
                  shown={visible.length}
                  total={commitments.length}
                />
              </div>
            )}

            {visible.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-muted/25 bg-white/60 px-6 py-14 text-center">
                <p className="font-display text-[15px] font-bold text-ink-primary">
                  {filtered ? 'Nothing matches those filters' : 'No commitments yet'}
                </p>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-secondary">
                  {filtered
                    ? 'Clear them to see everything again.'
                    : 'Add your first subscription or BNPL plan and it will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {byKind.subscriptions.length > 0 && (
                  <CommitmentTable
                    kind="subscription"
                    commitments={byKind.subscriptions}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    onDelete={setDeleteTarget}
                    pending={pending}
                  />
                )}
                {byKind.bnpl.length > 0 && (
                  <CommitmentTable
                    kind="bnpl"
                    commitments={byKind.bnpl}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    onDelete={setDeleteTarget}
                    pending={pending}
                  />
                )}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Where it goes"
              description="The same commitments, seen by category, by date, and over time."
            />
            <div className="space-y-5">
              <CategoryBreakdown commitments={commitments} />
              <CashFlowForecast commitments={commitments} />
              <CalendarMonth commitments={commitments} />
              <ExposureTrend commitments={commitments} />
            </div>
          </section>

          <section>
            <SectionHeading title="Connections" description="Optional ways to get data in without typing it." />
            <BankSyncCard />
          </section>

          <footer className="border-t border-ink-muted/10 pt-6 text-center text-xs leading-relaxed text-ink-secondary">
            <p>Your commitments are stored in your own account. This app is not connected to any bank.</p>
            <p className="mt-1 text-ink-secondary/70">Not financial advice.</p>
          </footer>
        </div>
      )}

      <WriteFeedback
        actions={[
          { label: 'That change', mutation: toggleStatus },
          { label: 'That decision', mutation: recordDecision },
          { label: 'The example data', mutation: replaceCommitments },
        ]}
      />

      <Modal open={showImport} labelledBy="csv-import-heading" size="lg" onClose={() => setShowImport(false)}>
        <CsvImport
          isImporting={importCommitments.isPending}
          onClose={() => setShowImport(false)}
          onImport={async (rows) => {
            await importCommitments.mutateAsync(rows)
            setShowImport(false)
          }}
        />
      </Modal>

      <Modal open={showReceipt} labelledBy="receipt-import-heading" onClose={() => setShowReceipt(false)}>
        <ReceiptImport
          onClose={() => setShowReceipt(false)}
          onDraft={(draft) => {
            setShowReceipt(false)
            setPrefillDraft(draft)
          }}
        />
      </Modal>

      <Modal
        open={showForm || Boolean(editingCommitment) || Boolean(prefillDraft)}
        labelledBy="commitment-form-heading"
        onClose={closeForm}
      >
        <CommitmentForm
          editingCommitment={editingCommitment || prefillDraft}
          saveError={saveCommitment.error}
          isSaving={saveCommitment.isPending}
          onSave={handleSave}
          onCancel={closeForm}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        body={
          <>
            <p>
              This permanently removes it, along with its decision history — including anything it added to your
              "kept back by reconsidering" total.
            </p>
            <p className="mt-2">If you only want to stop tracking it, cancel it instead. That can be undone.</p>
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        onConfirm={() =>
          pending.run(`row:${deleteTarget.id}`, () => deleteCommitment.mutateAsync(deleteTarget))
        }
        onClose={() => {
          setDeleteTarget(null)
          deleteCommitment.reset()
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all commitments?"
        body={
          <p>
            This removes all {commitments.length} commitments in your account and their decision history. It
            can't be undone.
          </p>
        }
        confirmLabel="Clear everything"
        busyLabel="Clearing…"
        onConfirm={() => clearCommitments.mutateAsync()}
        onClose={() => {
          setConfirmClear(false)
          clearCommitments.reset()
        }}
      />
    </AppShell>
  )
}

function SecondaryButton({ onClick, icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-muted/20 bg-white px-3 text-sm font-semibold text-ink-secondary shadow-sm transition-all duration-150 hover:border-brand-500/40 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}
