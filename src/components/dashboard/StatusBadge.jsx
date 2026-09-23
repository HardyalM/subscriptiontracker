/**
 * Status and type badges.
 *
 * Deliberately low-saturation: on a dashboard where every row carries one,
 * loud badges turn into visual noise and stop meaning anything. Colour is
 * carried by the text and a hairline ring rather than a filled block, so a
 * screenful of them still reads calmly.
 *
 * Each badge pairs colour with a word — never colour alone — so it survives
 * colour-blindness and greyscale printing.
 */

const TONES = {
  active: 'text-status-good-text bg-status-good/8 ring-status-good/20',
  cancelled: 'text-ink-secondary bg-ink-muted/10 ring-ink-muted/20',
  review: 'text-status-warning-text bg-status-warning/10 ring-status-warning/25',
  overdue: 'text-status-critical-text bg-status-critical/8 ring-status-critical/25',
  subscription: 'text-series-1 bg-series-1/8 ring-series-1/20',
  bnpl: 'text-series-2 bg-series-2/10 ring-series-2/25',
  neutral: 'text-ink-secondary bg-surface-sunken ring-ink-muted/15',
}

export default function StatusBadge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
        TONES[tone] ?? TONES.neutral
      } ${className}`}
    >
      {children}
    </span>
  )
}
