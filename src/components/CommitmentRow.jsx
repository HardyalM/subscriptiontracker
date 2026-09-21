import { useEffect, useRef, useState } from 'react'
import { annualisedCost, remainingBnplBalance, bnplPaidSoFar, formatGBP } from '../lib/calculations.js'
import { IconPencil, IconBan, IconRestore } from './Icon.jsx'

const frequencyLabel = {
  weekly: '/week',
  monthly: '/month',
  'one-off installments': ' per instalment',
}

const CONFIRM_WINDOW_MS = 3000

function BnplProgress({ commitment }) {
  const paid = bnplPaidSoFar(commitment)
  const total = Number(commitment.totalOriginalAmount)
  if (paid === null || !total) return null
  const pct = Math.min(100, Math.round((paid / total) * 100))
  const doneLabel = commitment.instalmentsRemaining <= 0

  return (
    <div className="mt-2 max-w-xs">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/10">
        <div className="h-full rounded-full bg-series-2" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {doneLabel ? 'Paid off' : `${formatGBP(paid)} of ${formatGBP(total)} paid off (${pct}%)`}
      </p>
    </div>
  )
}

/**
 * One commitment's row on the dashboard — the present-bias countermeasure:
 * per-payment cost and the reframed cost always shown side by side, never
 * one without the other.
 */
export default function CommitmentRow({ commitment, onEdit, onToggleStatus }) {
  const isBnpl = commitment.type === 'bnpl'
  const isCancelled = commitment.status === 'cancelled'
  const secondaryLabel = isBnpl ? 'Remaining on plan' : 'Per year'
  const secondaryValue = isBnpl ? remainingBnplBalance(commitment) : annualisedCost(commitment)

  // Two-step confirmation before the destructive Cancel action — first tap
  // arms it, a second tap within a few seconds confirms. Reactivating is
  // non-destructive and needs no confirmation.
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const resetTimer = useRef(null)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  function handleStatusClick() {
    if (commitment.status !== 'active') {
      onToggleStatus(commitment)
      return
    }
    if (!confirmingCancel) {
      setConfirmingCancel(true)
      resetTimer.current = setTimeout(() => setConfirmingCancel(false), CONFIRM_WINDOW_MS)
      return
    }
    clearTimeout(resetTimer.current)
    setConfirmingCancel(false)
    onToggleStatus(commitment)
  }

  return (
    <div
      className={`group flex flex-col gap-3 rounded-xl px-3 py-3.5 transition sm:flex-row sm:items-center sm:justify-between ${
        isCancelled ? 'opacity-60' : 'hover:bg-surface-sunken'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-ink-primary">{commitment.name}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              isBnpl ? 'bg-series-2/15 text-series-2' : 'bg-series-1/15 text-series-1'
            }`}
          >
            {isBnpl ? 'BNPL' : 'Subscription'}
          </span>
          {isCancelled && (
            <span className="shrink-0 rounded-full bg-ink-muted/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Cancelled
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          {commitment.category} · {isBnpl ? `${commitment.instalmentsRemaining} instalments left` : commitment.frequency}
        </p>
        {isBnpl && <BnplProgress commitment={commitment} />}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end sm:gap-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-right">
            <p className="tabular text-sm text-ink-secondary">
              {formatGBP(commitment.costPerPayment)}
              {!isBnpl && (frequencyLabel[commitment.frequency] || '')}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">Per payment</p>
          </div>
          <div className="text-right">
            <p className="tabular text-sm font-semibold text-ink-primary">{formatGBP(secondaryValue)}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-muted">{secondaryLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {confirmingCancel && (
            <span className="text-xs font-medium text-status-critical">Confirm?</span>
          )}
          <div className="flex gap-1.5 opacity-0 transition group-hover:opacity-100 sm:opacity-100">
            <button
              onClick={() => onEdit(commitment)}
              title="Edit"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-muted/20 text-ink-secondary transition hover:border-brand-500 hover:text-brand-600"
            >
              <IconPencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleStatusClick}
              title={commitment.status === 'active' ? (confirmingCancel ? 'Click again to confirm' : 'Cancel') : 'Reactivate'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                confirmingCancel
                  ? 'border-status-critical bg-status-critical/10 text-status-critical'
                  : 'border-ink-muted/20 text-ink-secondary hover:border-status-critical hover:text-status-critical'
              }`}
            >
              {commitment.status === 'active' ? <IconBan className="h-4 w-4" /> : <IconRestore className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
