import { IconSpinner } from '../Icon.jsx'

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg shadow-action hover:bg-accent-strong hover:shadow-action-hover focus-visible:ring-brand-500/50',
  secondary:
    'border border-ink-muted/20 bg-surface text-ink-primary shadow-sm hover:border-ink-muted/35 hover:bg-surface-sunken focus-visible:ring-brand-500/40',
  danger:
    'border border-status-critical/30 bg-surface text-status-critical-text shadow-sm hover:border-status-critical/50 hover:bg-status-critical/[0.06] focus-visible:ring-status-critical/40',
  ghost: 'text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary focus-visible:ring-brand-500/40',
}

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  // The header's action row — between the two, to sit beside the menu.
  toolbar: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
}

/**
 * A button with the app's variants and a built-in loading state. While
 * `loading`, the label swaps for `loadingLabel` beside a spinner and the
 * button disables itself, so a second press can't send the request twice.
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  loadingLabel,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${loading ? 'disabled:cursor-wait disabled:opacity-80' : ''} ${className}`}
      {...rest}
    >
      {loading ? <IconSpinner className="h-4 w-4 animate-spin" /> : icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}
