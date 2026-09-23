import {
  annualisedCost,
  remainingBnplBalance,
  bnplPaidSoFar,
  daysUntil,
  formatGBP,
} from '../../lib/calculations.js'
import { RENEWAL_WINDOW_DAYS } from '../../lib/constants.js'
import { formatShortDate, describeDue } from '../../lib/format.js'
import { IconPencil, IconBan, IconRestore, IconTrash, IconWallet } from '../Icon.jsx'
import StatusBadge from './StatusBadge.jsx'
import RowMenu from './RowMenu.jsx'
import ErrorBoundary from '../ErrorBoundary.jsx'
import { useListMotion } from '../../lib/useListMotion.js'
import CancellationGuide from '../cancellation-guides/CancellationGuide.jsx'

const GRID = 'sm:grid sm:grid-cols-[minmax(0,1fr)_7.5rem_7rem_7.5rem_2.25rem] sm:items-center sm:gap-5'

const frequencySuffix = { weekly: '/wk', monthly: '/mo' }

/**
 * One table per kind of commitment.
 *
 * Subscriptions and BNPL plans are split rather than mixed because their
 * last column means different things: a year of a subscription, versus what
 * is still owed on a plan. Separate tables let each header say exactly what
 * its numbers are, instead of one header being true for half the rows.
 *
 * A real table from `sm` up; below that, each row becomes a card with the
 * money figures side by side, so the comparison the app is built on
 * survives a phone screen.
 */
export default function CommitmentTable({
  kind,
  commitments,
  onEdit,
  onToggleStatus,
  onDelete,
  pending,
}) {
  const isBnpl = kind === 'bnpl'
  const title = isBnpl ? 'BNPL plans' : 'Subscriptions'
  const valueHeading = isBnpl ? 'Left to pay' : 'Per year'

  const activeCount = commitments.filter((c) => c.status === 'active').length
  const listRef = useListMotion()

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-muted/[0.13] bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${isBnpl ? 'bg-series-2' : 'bg-series-1'}`}
            aria-hidden="true"
          />
          <h3 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">{title}</h3>
        </div>
        <span className="text-xs font-medium text-ink-secondary">
          <span className="tabular font-semibold text-ink-primary">{activeCount}</span> active
          {commitments.length > activeCount && (
            <>
              {' · '}
              <span className="tabular">{commitments.length - activeCount}</span> cancelled
            </>
          )}
        </span>
      </div>

      {commitments.length === 0 ? (
        <div className="flex flex-col items-center border-t border-ink-muted/10 px-6 py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-ink-secondary">
            <IconWallet className="h-5 w-5" />
          </div>
          <p className="text-sm text-ink-secondary">None yet.</p>
        </div>
      ) : (
        <>
          <div className={`hidden border-y border-ink-muted/10 bg-surface-sunken/50 px-5 py-2.5 ${GRID}`}>
            <ColHead>Commitment</ColHead>
            <ColHead>Next payment</ColHead>
            <ColHead align="right">Per payment</ColHead>
            <ColHead align="right">{valueHeading}</ColHead>
            <span className="sr-only">Actions</span>
          </div>

          <ul ref={listRef} className="divide-y divide-ink-muted/[0.08] border-t border-ink-muted/10 sm:border-t-0">
            {commitments.map((commitment) => (
              <Row
                key={commitment.id}
                commitment={commitment}
                isBnpl={isBnpl}
                valueLabel={valueHeading}
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                busy={pending?.isPending(`row:${commitment.id}`)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function ColHead({ children, align = 'left' }) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      {children}
    </span>
  )
}

/**
 * The status a row is in, as one word and one colour. Consolidates what
 * used to be two separate badges ("due in 3d", "overdue") into a single
 * state, so each row carries at most one status.
 */
function statusOf(commitment) {
  if (commitment.status === 'cancelled') return { tone: 'cancelled', label: 'Cancelled' }
  const days = daysUntil(commitment.nextPaymentDate)
  if (days < 0) return { tone: 'overdue', label: 'Overdue' }
  if (days <= RENEWAL_WINDOW_DAYS) return { tone: 'review', label: 'Reviewing' }
  return { tone: 'active', label: 'Active' }
}

function Row({ commitment, isBnpl, valueLabel, onEdit, onToggleStatus, onDelete, busy }) {
  const isCancelled = commitment.status === 'cancelled'
  const value = isBnpl ? remainingBnplBalance(commitment) : annualisedCost(commitment)
  const days = daysUntil(commitment.nextPaymentDate)
  const status = statusOf(commitment)

  const menuItems = [
    { label: 'Edit', icon: <IconPencil className="h-4 w-4" />, onSelect: () => onEdit(commitment) },
    isCancelled
      ? { label: 'Reactivate', icon: <IconRestore className="h-4 w-4" />, onSelect: () => onToggleStatus(commitment) }
      : { label: 'Cancel', icon: <IconBan className="h-4 w-4" />, onSelect: () => onToggleStatus(commitment) },
    { separator: true },
    { label: 'Delete…', icon: <IconTrash className="h-4 w-4" />, danger: true, onSelect: () => onDelete(commitment) },
  ]

  return (
    <li
      className={`group px-5 py-row-y transition-colors duration-150 ${GRID} ${
        isCancelled ? 'bg-surface-sunken/30' : 'hover:bg-surface-sunken/45'
      }`}
    >
      {/* Identity */}
      <div className={`min-w-0 ${isCancelled ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-3 sm:block">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-ink-primary">{commitment.name}</span>
            <StatusBadge tone={status.tone}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {status.label}
            </StatusBadge>
          </div>
          {/* On mobile the menu sits on the name line; on desktop it has
              its own column. */}
          <div className="sm:hidden">
            <RowMenu label={commitment.name} items={menuItems} busy={busy} />
          </div>
        </div>

        <p className="mt-1 truncate text-[13px] text-ink-secondary">
          {commitment.category}
          {isBnpl
            ? ` · ${commitment.instalmentsRemaining} ${commitment.instalmentsRemaining === 1 ? 'instalment' : 'instalments'} left`
            : ` · ${commitment.frequency}`}
        </p>

        {isBnpl && <BnplProgress commitment={commitment} />}

        {!isCancelled && (
          <ErrorBoundary fallback={null}>
            <CancellationGuide commitment={commitment} />
          </ErrorBoundary>
        )}
      </div>

      {/* Next payment — the date is the thing to act on, so it gets its own
          column rather than being buried in the subline. */}
      <Cell label="Next payment" className={isCancelled ? 'opacity-60' : ''}>
        <p className="tabular text-sm font-semibold text-ink-primary">{formatShortDate(commitment.nextPaymentDate)}</p>
        <p
          className={`mt-0.5 text-xs ${
            isCancelled
              ? 'text-ink-secondary'
              : days < 0
                ? 'font-semibold text-status-critical-text'
                : days <= RENEWAL_WINDOW_DAYS
                  ? 'font-medium text-status-warning-text'
                  : 'text-ink-secondary'
          }`}
        >
          {isCancelled ? 'Stopped' : describeDue(days)}
        </p>
      </Cell>

      <Cell label="Per payment" align="right" className={isCancelled ? 'opacity-60' : ''}>
        <p className="tabular text-sm font-medium text-ink-secondary">
          {formatGBP(commitment.costPerPayment)}
          {!isBnpl && <span className="text-ink-secondary/80">{frequencySuffix[commitment.frequency] ?? ''}</span>}
        </p>
      </Cell>

      <Cell label={valueLabel} align="right" className={isCancelled ? 'opacity-60' : ''}>
        <p className="tabular font-display text-base font-bold tracking-tight text-ink-primary">{formatGBP(value)}</p>
      </Cell>

      <div className="hidden justify-end sm:flex">
        <RowMenu label={commitment.name} items={menuItems} busy={busy} />
      </div>
    </li>
  )
}

/**
 * A table cell that becomes a labelled stat on mobile. The label is hidden
 * from `sm` up, where the column header already says it.
 */
function Cell({ label, align = 'left', className = '', children }) {
  return (
    <div
      className={`mt-3 inline-block w-1/3 align-top sm:mt-0 sm:block sm:w-auto ${
        align === 'right' ? 'sm:text-right' : ''
      } ${className}`}
    >
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-secondary sm:hidden">
        {label}
      </p>
      {children}
    </div>
  )
}

function BnplProgress({ commitment }) {
  const paid = bnplPaidSoFar(commitment)
  const total = Number(commitment.totalOriginalAmount)
  if (paid === null || !total) return null

  const pct = Math.min(100, Math.round((paid / total) * 100))
  const done = commitment.instalmentsRemaining <= 0

  return (
    <div className="mt-2.5 max-w-[15rem]">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/12"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${commitment.name}: ${pct}% paid`}
      >
        <div className="h-full rounded-full bg-series-2 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-secondary">
        {done ? 'Paid off' : `${formatGBP(paid)} of ${formatGBP(total)} paid · ${pct}%`}
      </p>
    </div>
  )
}
