import {
  getRenewalCheckpointItems,
  renewalCopy,
  decisionTally,
  reconsideredSavingsTotal,
  daysUntil,
  formatGBP,
} from '../../lib/calculations.js'
import { IconCalendarClock, IconCheck, IconRewind } from '../Icon.jsx'
import StatusBadge from './StatusBadge.jsx'

/**
 * The decision engine.
 *
 * This is the feature the product is actually for. Everything else reports;
 * this one asks. So it gets the strongest framing on the page after the
 * headline figure — a distinct surface, not another card in the stack.
 *
 * Both answers are given equal visual weight. Making "Reconsider" louder
 * would be the app pushing people to cancel things, and making "Keep it"
 * louder would be the opposite; neither is this app's business. It surfaces
 * the moment and the number, and the person decides.
 *
 * All figures come from the same pure functions the original checkpoint
 * used — getRenewalCheckpointItems, renewalCopy, decisionTally,
 * reconsideredSavingsTotal — so the behaviour is unchanged and still covered
 * by the calculations suite.
 */
export default function ReviewQueue({ commitments, onAction, id }) {
  const items = getRenewalCheckpointItems(commitments)
  const { kept, reconsidered } = decisionTally(commitments)
  const saved = reconsideredSavingsTotal(commitments)
  const decisionsMade = kept + reconsidered

  if (items.length === 0) {
    return (
      <section
        id={id}
        className="rounded-2xl border border-ink-muted/12 bg-white p-6 shadow-card"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-good/10 text-status-good ring-1 ring-inset ring-status-good/20">
            <IconCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">
              Nothing to review
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Nothing renews in the next 7 days. Anything due — or overdue — will appear here.
            </p>
            {decisionsMade > 0 && <Tally kept={kept} reconsidered={reconsidered} saved={saved} />}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id={id}
      className="overflow-hidden rounded-2xl border border-status-warning/25 bg-white shadow-elevated"
    >
      <div className="border-b border-status-warning/20 bg-status-warning/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <IconCalendarClock className="h-4 w-4 shrink-0 text-status-warning" />
          <h2 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">Review queue</h2>
          <StatusBadge tone="review">{items.length}</StatusBadge>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
          Keep it moves this on to its next cycle automatically. Reconsider just logs the moment — it'll keep
          showing here until you edit or cancel it.
        </p>
      </div>

      <ul className="divide-y divide-ink-muted/8">
        {items.map((commitment) => {
          const days = daysUntil(commitment.nextPaymentDate)
          return (
            <li
              key={commitment.id}
              className="flex flex-col gap-3.5 px-5 py-4 transition-colors duration-150 hover:bg-surface-sunken/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink-primary">{commitment.name}</span>
                  {days < 0 ? (
                    <StatusBadge tone="overdue">
                      {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} overdue
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="review">{days === 0 ? 'Today' : `${days}d`}</StatusBadge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{renewalCopy(commitment)}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => onAction(commitment, 'kept')}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-muted/20 bg-white px-4 text-sm font-semibold text-ink-primary transition-all duration-150 hover:border-status-good/40 hover:bg-status-good/[0.06] hover:text-status-good focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-good/40 active:translate-y-px"
                >
                  <IconCheck className="h-4 w-4" />
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => onAction(commitment, 'reconsidered')}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-muted/20 bg-white px-4 text-sm font-semibold text-ink-primary transition-all duration-150 hover:border-brand-500/40 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:translate-y-px"
                >
                  <IconRewind className="h-4 w-4" />
                  Reconsider
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {decisionsMade > 0 && (
        <div className="border-t border-ink-muted/10 bg-surface-sunken/40 px-5 py-3.5 sm:px-6">
          <Tally kept={kept} reconsidered={reconsidered} saved={saved} inline />
        </div>
      )}
    </section>
  )
}

/**
 * The running score. This is what turns a reminder into a commitment
 * device: it is evidence that the decisions were made and that they added
 * up to something.
 */
function Tally({ kept, reconsidered, saved, inline = false }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm ${inline ? '' : 'mt-3'}`}>
      <span className="text-ink-secondary">
        <span className="tabular font-bold text-ink-primary">{kept}</span> kept
      </span>
      <span className="text-ink-secondary">
        <span className="tabular font-bold text-ink-primary">{reconsidered}</span> reconsidered
      </span>
      {saved > 0 && (
        <span className="text-ink-secondary">
          <span className="tabular font-bold text-status-good">{formatGBP(saved)}</span> kept back by reconsidering
        </span>
      )}
    </div>
  )
}
