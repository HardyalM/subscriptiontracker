import { useEffect, useRef, useState } from 'react'
import {
  annualisedCost,
  remainingBnplBalance,
  bnplPaidSoFar,
  daysUntil,
  formatGBP,
} from '../../lib/calculations.js'
import { IconPencil, IconBan, IconRestore, IconWallet } from '../Icon.jsx'
import StatusBadge from './StatusBadge.jsx'
import ErrorBoundary from '../ErrorBoundary.jsx'
import CancellationGuide from '../cancellation-guides/CancellationGuide.jsx'

const CONFIRM_WINDOW_MS = 3000

const frequencyLabel = {
  weekly: '/week',
  monthly: '/month',
  'one-off installments': ' per instalment',
}

/**
 * The commitment list.
 *
 * A real table on desktop and stacked cards below `sm` — not a table with
 * horizontal scroll, which is where financial data usually goes to die on a
 * phone. Both render from the same row component so the two can't drift.
 *
 * The column order is the argument: name, then what you pay each time, then
 * what that actually comes to. The two money columns sit adjacent and
 * right-aligned with tabular figures, because the whole point of this app is
 * that you see them together and can compare them at a glance.
 */
export default function CommitmentTable({ title, commitments, onEdit, onToggleStatus, emptyMessage }) {
  if (commitments.length === 0) {
    return (
      <section className="rounded-2xl border border-ink-muted/12 bg-white shadow-card">
        <Header title={title} count={0} />
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-secondary">
            <IconWallet className="h-5 w-5" />
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">{emptyMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-card">
      <Header title={title} count={commitments.length} />

      {/* Column headings exist only where there are real columns to head. */}
      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_5.5rem] gap-4 border-b border-ink-muted/10 bg-surface-sunken/40 px-5 py-2.5 sm:grid">
        <ColHead>Commitment</ColHead>
        <ColHead align="right">Per payment</ColHead>
        {/* Not "Annualised": this column holds a yearly figure for
            subscriptions and a remaining balance for BNPL, and one header
            cannot honestly mean both. "Adds up to" is true of each, and is
            the phrase the rest of the product already uses. */}
        <ColHead align="right">Adds up to</ColHead>
        <ColHead align="right">Actions</ColHead>
      </div>

      <div className="divide-y divide-ink-muted/8">
        {commitments.map((commitment) => (
          <Row
            key={commitment.id}
            commitment={commitment}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
          />
        ))}
      </div>
    </section>
  )
}

function Header({ title, count }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-muted/10 px-5 py-4">
      <h2 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">{title}</h2>
      <span className="tabular rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-ink-secondary">
        {count}
      </span>
    </div>
  )
}

function ColHead({ children, align = 'left' }) {
  return (
    <span
      className={`text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      {children}
    </span>
  )
}

function Row({ commitment, onEdit, onToggleStatus }) {
  const isBnpl = commitment.type === 'bnpl'
  const isCancelled = commitment.status === 'cancelled'
  const secondary = isBnpl ? remainingBnplBalance(commitment) : annualisedCost(commitment)
  const days = daysUntil(commitment.nextPaymentDate)

  // Two-step confirm before cancelling, carried over from the original row:
  // the first tap arms it, a second within a few seconds commits.
  // Reactivating is non-destructive and needs no confirmation.
  const [confirming, setConfirming] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function handleStatusClick() {
    if (!commitment.status || commitment.status !== 'active') {
      onToggleStatus(commitment)
      return
    }
    if (!confirming) {
      setConfirming(true)
      timer.current = setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS)
      return
    }
    clearTimeout(timer.current)
    setConfirming(false)
    onToggleStatus(commitment)
  }

  return (
    <div
      className={`group px-5 py-4 transition-colors duration-150 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_8rem_5.5rem] sm:items-center sm:gap-4 ${
        isCancelled ? 'opacity-65' : 'hover:bg-surface-sunken/50'
      }`}
    >
      {/* Identity */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink-primary">{commitment.name}</span>
          <StatusBadge tone={isBnpl ? 'bnpl' : 'subscription'}>{isBnpl ? 'BNPL' : 'Sub'}</StatusBadge>
          {isCancelled && <StatusBadge tone="cancelled">Cancelled</StatusBadge>}
          {!isCancelled && days < 0 && <StatusBadge tone="overdue">{Math.abs(days)}d overdue</StatusBadge>}
          {!isCancelled && days >= 0 && days <= 7 && <StatusBadge tone="review">Due in {days}d</StatusBadge>}
        </div>

        <p className="mt-1 truncate text-sm text-ink-secondary">
          {commitment.category} ·{' '}
          {isBnpl ? `${commitment.instalmentsRemaining} left` : commitment.frequency} · next{' '}
          {commitment.nextPaymentDate}
        </p>

        {isBnpl && <BnplProgress commitment={commitment} />}

        {/* Contained: losing a cancellation guide is nothing next to losing
            the table it sits in. */}
        {!isCancelled && (
          <ErrorBoundary fallback={null}>
            <CancellationGuide commitment={commitment} />
          </ErrorBoundary>
        )}
      </div>

      {/* Money — the two figures the app exists to show together. On mobile
          they sit side by side under the name rather than stacking, so the
          comparison survives the narrow layout. */}
      <div className="mt-3 flex items-end justify-between gap-6 sm:contents">
        <Money
          label="Per payment"
          value={`${formatGBP(commitment.costPerPayment)}${!isBnpl ? frequencyLabel[commitment.frequency] || '' : ''}`}
        />
        <Money
          label={isBnpl ? 'Left to pay' : 'Per year'}
          value={formatGBP(secondary)}
          strong
        />

        {/* Actions live inline on mobile, in their own column on desktop. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">
          {confirming && <span className="text-xs font-semibold text-status-critical-text">Confirm?</span>}
          <IconButton label="Edit" onClick={() => onEdit(commitment)}>
            <IconPencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={isCancelled ? 'Reactivate' : confirming ? 'Click again to confirm' : 'Cancel'}
            onClick={handleStatusClick}
            danger={confirming}
          >
            {isCancelled ? <IconRestore className="h-4 w-4" /> : <IconBan className="h-4 w-4" />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function Money({ label, value, strong = false }) {
  return (
    <div className="sm:text-right">
      <p
        className={`tabular text-[15px] leading-tight ${
          strong ? 'font-bold text-ink-primary' : 'font-medium text-ink-secondary'
        }`}
      >
        {value}
      </p>
      {/* The column already carries this heading on desktop; repeating it
          under every value would be noise. It only appears on mobile, where
          there is no header row. */}
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-secondary sm:hidden">{label}</p>
    </div>
  )
}

function IconButton({ label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
        danger
          ? 'border-status-critical bg-status-critical/10 text-status-critical-text'
          : 'border-ink-muted/20 text-ink-secondary hover:border-brand-500/40 hover:bg-brand-50 hover:text-brand-600'
      }`}
    >
      {children}
    </button>
  )
}

function BnplProgress({ commitment }) {
  const paid = bnplPaidSoFar(commitment)
  const total = Number(commitment.totalOriginalAmount)
  if (paid === null || !total) return null

  const pct = Math.min(100, Math.round((paid / total) * 100))
  const done = commitment.instalmentsRemaining <= 0

  return (
    <div className="mt-2.5 max-w-xs">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/12">
        <div
          className="h-full rounded-full bg-series-2 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-ink-secondary">
        {done ? 'Paid off' : `${formatGBP(paid)} of ${formatGBP(total)} paid (${pct}%)`}
      </p>
    </div>
  )
}
