import { toast } from 'sonner'
import { describeWriteError, isRetryable } from './writeErrors.js'
import { IconCheck, IconBan, IconX } from '../components/Icon.jsx'

/**
 * Toasts, in the app's own voice and design.
 *
 * Rendered with toast.custom so the card matches the rest of the UI —
 * surface, hairline border, layered shadow, accent-coloured action — while
 * Sonner keeps doing the parts that are genuinely hard: stacking, swipe to
 * dismiss, pause on hover, and announcing to screen readers.
 *
 * Success is brief and factual. Failure is different: a write that didn't
 * save means something the user believes is recorded isn't, so error
 * toasts stay until dismissed rather than fading while someone looks away.
 * "Try again" appears only when retrying could succeed (isRetryable) — a
 * violated rule fails the same way every time.
 */

function ToastCard({ id, tone, title, description, action }) {
  const icon =
    tone === 'error' ? (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-status-critical/12 text-status-critical-text">
        <IconBan className="h-4 w-4" />
      </span>
    ) : tone === 'success' ? (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-status-good/12 text-status-good-text">
        <IconCheck className="h-4 w-4" />
      </span>
    ) : null

  return (
    <div className="flex w-[min(22.5rem,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-ink-muted/12 bg-surface p-3.5 shadow-elevated">
      {icon}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">{description}</p>}
        {action && (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id)
              action.onClick()
            }}
            className="mt-2.5 inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg shadow-sm transition-colors duration-150 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors duration-150 hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export const notify = {
  success(title, { description, action } = {}) {
    return toast.custom((id) => <ToastCard id={id} tone="success" title={title} description={description} action={action} />, {
      duration: action ? 6000 : 3500,
    })
  },

  error(title, error, { retry } = {}) {
    const action = retry && isRetryable(error) ? { label: 'Try again', onClick: retry } : null
    return toast.custom(
      (id) => <ToastCard id={id} tone="error" title={title} description={describeWriteError(error)} action={action} />,
      { duration: Infinity },
    )
  },
}
