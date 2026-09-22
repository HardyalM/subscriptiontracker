/**
 * Skeleton placeholders.
 *
 * These mirror the real layout's geometry rather than being generic grey
 * bars: same card heights, same column positions, same number of rows. A
 * skeleton whose shape disagrees with what loads is worse than a spinner,
 * because the page visibly jumps when the data lands.
 *
 * The shimmer is a plain pulse, which `data-reduce-motion` already
 * neutralises globally (see index.css) — no special-casing needed here.
 */

function Bar({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-ink-muted/15 ${className}`} />
}

export function StatGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* The first card is the tall hero, so its skeleton is tall too. */}
      <div className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:col-span-2">
        <Bar className="h-3 w-40" />
        <Bar className="mt-4 h-10 w-52" />
        <Bar className="mt-3 h-3 w-60" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card">
          <Bar className="h-3 w-24" />
          <Bar className="mt-4 h-7 w-20" />
          <Bar className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-card">
      <div className="border-b border-ink-muted/10 px-5 py-4">
        <Bar className="h-4 w-44" />
      </div>
      <div className="divide-y divide-ink-muted/8">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <Bar className="h-4 w-40" />
              <Bar className="mt-2 h-3 w-28" />
            </div>
            <Bar className="hidden h-4 w-20 sm:block" />
            <Bar className="h-4 w-24" />
            <Bar className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReviewQueueSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
      <Bar className="h-4 w-36" />
      <Bar className="mt-2 h-3 w-64" />
      <div className="mt-5 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-ink-muted/10 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <Bar className="h-4 w-36" />
              <Bar className="mt-2 h-3 w-56" />
            </div>
            <Bar className="h-9 w-20 rounded-lg" />
            <Bar className="h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
