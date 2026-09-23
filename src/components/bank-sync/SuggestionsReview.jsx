import { usePendingSuggestions, useResolveSuggestion } from '../../lib/bankSyncQueries.js'
import { formatGBP } from '../../lib/calculations.js'
import { IconCheck, IconX } from '../Icon.jsx'

/**
 * Recurring payments spotted in synced transactions, waiting on a decision.
 *
 * Every one requires an explicit accept. The same reasoning as the renewal
 * checkpoint: the app surfaces something and the person decides. A charge
 * that looks like a subscription might be a one-off, and quietly adding it
 * would make the headline number wrong in a way nobody would think to check.
 */
export default function SuggestionsReview() {
  const { data: suggestions = [], isPending } = usePendingSuggestions()
  const resolve = useResolveSuggestion()

  if (isPending || suggestions.length === 0) return null

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent-soft/50 p-5 sm:p-6">
      <h2 className="font-display text-sm font-bold text-ink-primary">
        {suggestions.length === 1 ? 'One payment worth a look' : `${suggestions.length} payments worth a look`}
      </h2>
      <p className="mt-0.5 text-xs text-ink-secondary">
        Found in your synced transactions. Nothing is added until you say so.
      </p>

      <ul className="mt-3 space-y-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-muted/12 bg-surface px-3.5 py-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-primary">{suggestion.name}</p>
              <p className="truncate text-xs text-ink-secondary">
                {formatGBP(Number(suggestion.cost_per_payment))} · {suggestion.category}
                {suggestion.transactions?.description && (
                  <span className="text-ink-muted"> · seen as “{suggestion.transactions.description}”</span>
                )}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ suggestion, decision: 'accepted' })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconCheck className="h-3.5 w-3.5" />
                Add it
              </button>
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ suggestion, decision: 'dismissed' })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-muted/20 px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconX className="h-3.5 w-3.5" />
                Not this
              </button>
            </div>
          </li>
        ))}
      </ul>

      {resolve.isError && (
        <p role="alert" className="mt-2.5 rounded-lg bg-status-critical/8 px-3 py-2 text-sm text-status-critical-text">
          That didn't save. Nothing was changed — try again?
        </p>
      )}
    </section>
  )
}
