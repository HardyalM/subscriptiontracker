import { useEffect, useMemo, useState } from 'react'
import {
  useCommitments,
  useSaveCommitment,
  useToggleCommitmentStatus,
  useRecordDecision,
  useReplaceCommitments,
  useImportCommitments,
  useDeleteCommitment,
} from './lib/commitmentQueries.js'
import { usePendingActions } from './lib/usePendingActions.js'
import { useHashRoute } from './lib/useHashRoute.js'
import { notify } from './lib/notify.jsx'
import { filterAndSortCommitments, DEFAULT_FILTERS, hasActiveFilters } from './lib/commitmentFilters.js'
import { getRenewalCheckpointItems, applyKeepDecision, exposureFor, formatGBP } from './lib/calculations.js'
import { formatShortDate } from './lib/format.js'
import { notifyIfDue } from './lib/notifications.js'
import { buildDemoCommitments } from './lib/demoData.js'

import { IconPlus, IconUpload, IconCamera, IconLayout, IconGear, IconWallet, IconSearch } from './components/Icon.jsx'
import AppShell, { SectionHeading } from './components/shell/AppShell.jsx'
import UserMenu from './components/shell/UserMenu.jsx'
import StatGrid from './components/dashboard/StatGrid.jsx'
import ReviewQueue from './components/dashboard/ReviewQueue.jsx'
import CommitmentTable from './components/dashboard/CommitmentTable.jsx'
import { StatGridSkeleton, TableSkeleton, ReviewQueueSkeleton } from './components/dashboard/Skeletons.jsx'
import SettingsPage from './components/settings/SettingsPage.jsx'
import Button from './components/ui/Button.jsx'
import EmptyState from './components/ui/EmptyState.jsx'

import CategoryBreakdown from './components/CategoryBreakdown.jsx'
import ExportButton from './components/ExportButton.jsx'
import CommitmentForm from './components/CommitmentForm.jsx'
import Modal from './components/Modal.jsx'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import ImportLocalData from './components/ImportLocalData.jsx'
import CommitmentFilters from './components/manage/CommitmentFilters.jsx'
import CsvImport from './components/manage/CsvImport.jsx'
import ReceiptImport from './components/receipts/ReceiptImport.jsx'
import ExposureTrend from './components/manage/ExposureTrend.jsx'
import BankSyncCard from './components/bank-sync/BankSyncCard.jsx'
import SuggestionsReview from './components/bank-sync/SuggestionsReview.jsx'
import CalendarMonth from './components/calendar/CalendarMonth.jsx'
import CashFlowForecast from './components/calendar/CashFlowForecast.jsx'

export default function App() {
  const { segments, navigate } = useHashRoute()
  const view = segments[0] === 'settings' ? 'settings' : 'dashboard'

  const { data: commitments = [], isPending, isError, refetch } = useCommitments()
  const saveCommitment = useSaveCommitment()
  const toggleStatus = useToggleCommitmentStatus()
  const recordDecision = useRecordDecision()
  const replaceCommitments = useReplaceCommitments()
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
  const hasData = commitments.length > 0
  const filtered = hasData && hasActiveFilters(filters)

  // Browser reminders — only fires while this tab is open (see
  // src/lib/notifications.js for the honest caveat on what this can and
  // can't do without a backend).
  useEffect(() => {
    notifyIfDue(getRenewalCheckpointItems(commitments))
  }, [commitments])

  // ── Writes ──────────────────────────────────────────────────────────
  //
  // Every write ends in a toast. Success is brief; failure stays until it
  // is dismissed, and offers "Try again" only where retrying could work
  // (see src/lib/notify.jsx).
  //
  // Two writes report failure in place instead of in a toast: the form and
  // the delete confirmation. Both are dialogs the user is looking straight
  // at, and both stay open on failure, so the error belongs beside the
  // button they just pressed rather than in a corner behind a backdrop.

  // Awaited on purpose. Closing the modal before the write lands means a
  // failure silently discards everything the user typed, with the form gone
  // and nothing to explain it.
  async function handleSave(record) {
    const isEdit = Boolean(editingCommitment)
    const payload = isEdit ? { ...record, id: editingCommitment.id } : { ...record, id: null }
    try {
      await saveCommitment.mutateAsync(payload)
    } catch {
      // Shown inside the form, from saveCommitment.error.
      return
    }
    closeForm()
    notify.success(isEdit ? 'Changes saved' : `${record.name} added`, {
      description: isEdit ? undefined : `Now counted in your totals.`,
    })
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

  // Each action is keyed to what was actually pressed, so its spinner lands
  // on that row and a second tap can't fire it twice.
  async function handleToggleStatus(commitment) {
    const cancelling = commitment.status === 'active'
    try {
      await pending.run(`row:${commitment.id}`, () => toggleStatus.mutateAsync(commitment))
    } catch (error) {
      notify.error(
        cancelling ? `Couldn't cancel ${commitment.name}` : `Couldn't reactivate ${commitment.name}`,
        error,
        { retry: () => handleToggleStatus(commitment) },
      )
      return
    }
    if (cancelling) {
      notify.success(`${commitment.name} cancelled`, {
        description: 'It no longer counts towards your totals.',
        // Undo is the same toggle again, from the state it is in now.
        action: { label: 'Undo', onClick: () => handleToggleStatus({ ...commitment, status: 'cancelled' }) },
      })
    } else {
      notify.success(`${commitment.name} reactivated`, { description: 'Back in your totals.' })
    }
  }

  // "Keep it" also moves the commitment on to its next cycle (see
  // applyKeepDecision) — that's the fix for renewal dates silently going
  // stale. Both taps log the decision with the £ amount at that moment, so
  // the running totals stay meaningful even as costs change later.
  async function handleRenewalAction(commitment, decision) {
    const key = `decision:${commitment.id}:${decision}`
    if (pending.isPendingPrefix(`decision:${commitment.id}:`)) return
    try {
      await pending.run(key, () => recordDecision.mutateAsync({ commitment, decision }))
    } catch (error) {
      notify.error(`Couldn't record that decision`, error, {
        retry: () => handleRenewalAction(commitment, decision),
      })
      return
    }
    if (decision === 'kept') {
      const next = applyKeepDecision(commitment).nextPaymentDate
      notify.success(`Kept ${commitment.name}`, {
        description: next ? `Moved on to its next payment, ${formatShortDate(next)}.` : 'Logged.',
      })
    } else {
      notify.success(`Reconsidering ${commitment.name}`, {
        description: `${formatGBP(exposureFor(commitment) || 0)} added to what you've kept back.`,
      })
    }
  }

  async function handleDelete(commitment) {
    // Errors propagate to ConfirmDialog, which shows them in place and
    // stays open.
    await pending.run(`row:${commitment.id}`, () => deleteCommitment.mutateAsync(commitment))
    notify.success(`${commitment.name} deleted`)
  }

  async function handleImport(rows) {
    try {
      await importCommitments.mutateAsync(rows)
    } catch (error) {
      notify.error("Couldn't import that file", error, { retry: () => handleImport(rows) })
      return
    }
    setShowImport(false)
    notify.success(`Imported ${rows.length} ${rows.length === 1 ? 'commitment' : 'commitments'}`)
  }

  async function handleLoadExamples() {
    try {
      await replaceCommitments.mutateAsync(buildDemoCommitments())
    } catch (error) {
      notify.error("Couldn't load example data", error, { retry: handleLoadExamples })
      return
    }
    notify.success('Example data loaded', { description: 'Replace or delete it any time in Settings.' })
  }

  function scrollToReview() {
    document.getElementById('review-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: IconLayout, href: '#/', active: view === 'dashboard', onSelect: () => navigate('') },
    {
      id: 'settings',
      label: 'Settings',
      icon: IconGear,
      href: '#/settings/profile',
      active: view === 'settings',
      onSelect: () => navigate(view === 'settings' ? segments.join('/') : 'settings/profile'),
    },
  ]

  const pageActions =
    view === 'dashboard' ? (
      <>
        <ExportButton commitments={commitments} />
        <Button variant="primary" size="toolbar" icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
          Add
        </Button>
      </>
    ) : null

  return (
    <AppShell actions={pageActions} nav={nav} menu={<UserMenu onOpenSettings={() => navigate('settings/profile')} />}>
      {view === 'settings' ? (
        <SettingsPage section={segments[1]} onNavigate={navigate} />
      ) : isError ? (
        <div className="rounded-2xl border border-status-critical/25 bg-surface p-6 shadow-card">
          <p className="font-display text-[15px] font-bold text-ink-primary">Couldn't load your commitments</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
            Nothing has been lost — this is a problem reading them, not a problem with your data.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <div className="space-y-10">
          <StatGridSkeleton />
          <ReviewQueueSkeleton />
          <TableSkeleton />
        </div>
      ) : !hasData ? (
        <div className="space-y-10">
          <ImportLocalData />
          <EmptyState
            icon={IconWallet}
            title="Start with what you pay for"
            description="Add a subscription or a BNPL plan by hand, import a spreadsheet, or read one straight off a receipt. Everything you add is totalled here."
            actions={
              <>
                <Button variant="primary" icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
                  Add a commitment
                </Button>
                <Button icon={<IconUpload className="h-4 w-4" />} onClick={() => setShowImport(true)}>
                  Import CSV
                </Button>
                <Button icon={<IconCamera className="h-4 w-4" />} onClick={() => setShowReceipt(true)}>
                  Read a receipt
                </Button>
              </>
            }
            footnote={
              <>
                Just looking around?{' '}
                <button
                  type="button"
                  onClick={handleLoadExamples}
                  disabled={replaceCommitments.isPending}
                  className="focus-ring rounded font-semibold text-accent-text underline decoration-accent-text/30 underline-offset-4 transition-colors hover:decoration-accent-text disabled:cursor-wait disabled:opacity-60"
                >
                  {replaceCommitments.isPending ? 'Loading examples…' : 'Load example data'}
                </button>
              </>
            }
          />
          <section>
            <SectionHeading title="Connections" description="Optional ways to get data in without typing it." />
            <BankSyncCard />
          </section>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
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

            <div className="mb-4">
              <CommitmentFilters filters={filters} onChange={setFilters} shown={visible.length} total={commitments.length} />
            </div>

            {visible.length === 0 ? (
              <EmptyState
                compact
                icon={IconSearch}
                title="Nothing matches these filters"
                description={`None of your ${commitments.length} commitments match. Try a different search, or clear the filters to see everything.`}
                actions={
                  filtered && (
                    <Button onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>
                  )
                }
              />
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

        </div>
      )}

      <Modal open={showImport} labelledBy="csv-import-heading" size="lg" onClose={() => setShowImport(false)}>
        <CsvImport isImporting={importCommitments.isPending} onClose={() => setShowImport(false)} onImport={handleImport} />
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
        onConfirm={() => handleDelete(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null)
          deleteCommitment.reset()
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
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-muted/20 bg-surface px-3 text-sm font-semibold text-ink-secondary shadow-sm transition-all duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}
