import { describeWriteError, isRetryable } from '../lib/writeErrors.js'
import { IconBan, IconX } from './Icon.jsx'

/**
 * Tells the user when a write failed.
 *
 * Every action here is fired from a button that immediately looks finished —
 * a row toggling, a menu closing, a checkpoint tap. Without this, a failure
 * is completely invisible: the optimistic update rolls back and the app just
 * quietly looks the way it did before, as though the click never happened.
 * For an app about money, silently discarding an instruction is the worst
 * thing it can do.
 *
 * Deliberately persistent. An error about unsaved money should not fade away
 * on a timer while the user is looking somewhere else.
 *
 * "Try again" is only offered when retrying the identical request could
 * actually succeed — see isRetryable. Offering it on a violated constraint
 * would just fail again and teach people the button is decorative.
 */
export default function WriteFeedback({ actions }) {
  const failed = actions.find((action) => action.mutation.isError)
  if (!failed) return null

  const { label, mutation } = failed
  const canRetry = isRetryable(mutation.error)

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-status-critical/25 bg-white p-4 shadow-raised"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-status-critical/10 text-status-critical">
          <IconBan className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-primary">{label} didn't save.</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
            {describeWriteError(mutation.error)}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {canRetry && (
              <button
                type="button"
                disabled={mutation.isPending}
                // Retries with the exact variables the failed call used, so
                // the user does not have to redo the action.
                onClick={() => mutation.mutate(mutation.variables)}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending ? 'Trying…' : 'Try again'}
              </button>
            )}
            <button
              type="button"
              onClick={() => mutation.reset()}
              className="rounded-lg border border-ink-muted/20 px-3 py-1.5 text-sm font-medium text-ink-secondary transition hover:bg-surface-sunken"
            >
              {canRetry ? 'Not now' : 'OK'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => mutation.reset()}
          aria-label="Dismiss"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-sunken hover:text-ink-primary"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
