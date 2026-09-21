import {
  getRenewalCheckpointItems,
  renewalCopy,
  decisionTally,
  reconsideredSavingsTotal,
  daysUntil,
  formatGBP,
} from '../lib/calculations.js'
import { IconCalendarClock, IconCheck, IconRewind } from './Icon.jsx'

function DaysBadge({ commitment }) {
  const days = daysUntil(commitment.nextPaymentDate)
  const overdue = days < 0
  const label = overdue
    ? `${Math.abs(days)}d overdue`
    : days === 0
      ? 'Today'
      : days === 1
        ? '1 day'
        : `${days} days`
  const urgent = overdue || days <= 2
  return (
    <span
      className={`tabular shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
        urgent ? 'bg-series-2/15 text-series-2' : 'bg-ink-muted/10 text-ink-secondary'
      }`}
    >
      {label}
    </span>
  )
}

/**
 * The signature feature. Anything due within 7 days — or already overdue —
 * gets pulled into its own highlighted section with calm, factual
 * reframing copy. "Keep it" logs the decision AND moves the commitment on
 * to its next cycle (renewal date advances, BNPL instalment count drops);
 * "Reconsider" just logs the moment, so it keeps surfacing here until
 * you've actually done something about it. That distinction is what makes
 * this a commitment device rather than a reminder.
 */
export default function RenewalCheckpoint({ commitments, onAction }) {
  const items = getRenewalCheckpointItems(commitments)
  const { kept, reconsidered } = decisionTally(commitments)
  const totalDecisions = kept + reconsidered
  const savedTotal = reconsideredSavingsTotal(commitments)

  return (
    <section className="overflow-hidden rounded-2xl border border-series-2/25 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-series-2/15 bg-series-2/5 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <IconCalendarClock className="h-4 w-4 text-series-2" />
          <h2 className="text-sm font-semibold text-ink-primary">Renewal checkpoint</h2>
          {items.length > 0 && (
            <span className="tabular rounded-full bg-series-2 px-2 py-0.5 text-xs font-bold text-white">
              {items.length}
            </span>
          )}
        </div>
        {totalDecisions > 0 && (
          <div className="flex flex-col items-end gap-0.5">
            <p className="tabular flex items-center gap-3 text-xs text-ink-secondary">
              <span className="flex items-center gap-1">
                <IconCheck className="h-3.5 w-3.5 text-status-good" />
                {kept} kept
              </span>
              <span className="flex items-center gap-1">
                <IconRewind className="h-3.5 w-3.5 text-ink-muted" />
                {reconsidered} reconsidered
              </span>
            </p>
            {savedTotal > 0 && (
              <p className="tabular text-xs font-medium text-status-good">
                {formatGBP(savedTotal)} kept back by reconsidering
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <p className="text-sm text-ink-secondary">Nothing renewing in the next 7 days.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-muted">
              Keep it moves this on to its next cycle automatically. Reconsider just logs the moment — it'll keep
              showing here until you edit or cancel it.
            </p>
            <ul className="space-y-3">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-ink-muted/10 bg-surface-page p-4 transition hover:border-ink-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink-primary">{c.name}</p>
                        <DaysBadge commitment={c} />
                      </div>
                      <p className="mt-1 text-sm text-ink-secondary">{renewalCopy(c)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => onAction(c, 'kept')}
                        className="rounded-lg border border-ink-muted/25 bg-white px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:border-status-good hover:text-status-good"
                      >
                        Keep it
                      </button>
                      <button
                        onClick={() => onAction(c, 'reconsidered')}
                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white shadow-card transition hover:bg-brand-600"
                      >
                        Reconsider
                      </button>
                    </div>
                  </div>
                  {c.decisionLog && c.decisionLog.length > 0 && (
                    <p className="mt-2 text-xs text-ink-muted">
                      Last decision: {c.decisionLog[c.decisionLog.length - 1].decision} on{' '}
                      {c.decisionLog[c.decisionLog.length - 1].date}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
