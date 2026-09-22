import { useEffect, useMemo, useState } from 'react'
import {
  useCommitments,
  useSaveCommitment,
  useToggleCommitmentStatus,
  useRecordDecision,
  useReplaceCommitments,
  useClearCommitments,
  useImportCommitments,
} from './lib/commitmentQueries.js'
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

  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  // A draft produced by the receipt parser. It seeds the normal add form
  // rather than being written anywhere — a model's reading of a receipt is a
  // suggestion, not a fact.
  const [prefillDraft, setPrefillDraft] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const editingCommitment = commitments.find((c) => c.id === editingId) || null

  // Derived state over the cache — no refetch, no round-trip per keystroke.
  const visible = useMemo(() => filterAndSortCommitments(commitments, filters), [commitments, filters])
  const active = useMemo(() => visible.filter((c) => c.status === 'active'), [visible])
  const cancelled = useMemo(() => visible.filter((c) => c.status === 'cancelled'), [visible])
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
    const confirmed = window.confirm(
      'Clear all commitments? This removes everything in your account and cannot be undone.',
    )
    if (confirmed) clearCommitments.mutate()
  }

  function handleToggleStatus(commitment) {
    toggleStatus.mutate(commitment)
  }

  // "Keep it" also moves the commitment on to its next cycle (see
  // applyKeepDecision) — that's the fix for renewal dates silently going
  // stale. Both taps log the decision with the £ amount at that moment, so
  // the running totals stay meaningful even as costs change later.
  function handleRenewalAction(commitment, decision) {
    recordDecision.mutate({ commitment, decision })
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

          <ReviewQueue id="review-queue" commitments={commitments} onAction={handleRenewalAction} />

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

            <div className="space-y-5">
              <CommitmentTable
                title="Active"
                commitments={active}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                emptyMessage={
                  filtered
                    ? 'Nothing matches those filters. Clear them to see everything again.'
                    : 'No commitments yet — add your first subscription or BNPL plan to see it here.'
                }
              />

              {cancelled.length > 0 && (
                <CommitmentTable
                  title="Cancelled"
                  commitments={cancelled}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                  emptyMessage="Nothing cancelled."
                />
              )}
            </div>
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
          { label: 'Clearing your data', mutation: clearCommitments },
        ]}
      />

      <Modal open={showImport} labelledBy="csv-import-heading" onClose={() => setShowImport(false)}>
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
