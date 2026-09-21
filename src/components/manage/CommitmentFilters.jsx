import { SORT_OPTIONS, DEFAULT_FILTERS, hasActiveFilters } from '../../lib/commitmentFilters.js'
import { COMMITMENT_TYPES, CATEGORIES, STATUSES } from '../../lib/constants.js'
import { IconSearch, IconX } from '../Icon.jsx'

const selectClass =
  'rounded-lg border border-ink-muted/20 bg-white px-2.5 py-1.5 text-sm text-ink-primary shadow-sm transition focus-ring'

/**
 * Search, filters and sort in one row above the list. Everything here is
 * derived state over the cache — no refetch, no spinner.
 */
export default function CommitmentFilters({ filters, onChange, shown, total }) {
  const set = (key, value) => onChange({ ...filters, [key]: value })
  const active = hasActiveFilters(filters)

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search by name"
            aria-label="Search commitments by name"
            className="w-full rounded-lg border border-ink-muted/20 bg-white py-1.5 pl-8 pr-2.5 text-sm text-ink-primary shadow-sm transition focus-ring"
          />
        </div>

        <select className={selectClass} value={filters.type} onChange={(e) => set('type', e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {COMMITMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'bnpl' ? 'BNPL' : 'Subscription'}</option>
          ))}
        </select>

        <select className={selectClass} value={filters.category} onChange={(e) => set('category', e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className={selectClass} value={filters.status} onChange={(e) => set('status', e.target.value)} aria-label="Filter by status">
          <option value="all">Active &amp; cancelled</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'active' ? 'Active only' : 'Cancelled only'}</option>)}
        </select>

        <select className={selectClass} value={filters.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort by">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {active && (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>
            Showing {shown} of {total}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-brand-600 transition hover:bg-brand-50"
          >
            <IconX className="h-3 w-3" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
