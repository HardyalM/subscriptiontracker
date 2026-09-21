// Sorting, filtering and search — derived state over the commitments already
// in the React Query cache.
//
// Deliberately client-side. At this data scale (tens of rows, not thousands)
// pushing this into Postgres would add a network round-trip per keystroke to
// make an instant operation slower. Pure and tested, like the rest of lib/.

import { exposureFor, daysUntil } from './calculations.js'

export const SORT_OPTIONS = [
  { value: 'next-payment', label: 'Next payment' },
  { value: 'cost-high', label: 'Cost (high to low)' },
  { value: 'cost-low', label: 'Cost (low to high)' },
  { value: 'name', label: 'Name' },
]

export const DEFAULT_FILTERS = {
  search: '',
  type: 'all',
  category: 'all',
  status: 'all',
  sort: 'next-payment',
}

/**
 * Applies search, filters and sort in that order.
 *
 * Sorting by cost uses exposureFor() rather than the raw per-payment figure,
 * so a £25 BNPL instalment with £300 left outranks a £30 monthly
 * subscription — the same reframe the headline number is built on.
 */
export function filterAndSortCommitments(commitments, filters = DEFAULT_FILTERS) {
  const { search, type, category, status, sort } = { ...DEFAULT_FILTERS, ...filters }
  const needle = search.trim().toLowerCase()

  const filtered = commitments.filter((c) => {
    if (needle && !String(c.name ?? '').toLowerCase().includes(needle)) return false
    if (type !== 'all' && c.type !== type) return false
    if (category !== 'all' && c.category !== category) return false
    if (status !== 'all' && c.status !== status) return false
    return true
  })

  return sortCommitments(filtered, sort)
}

export function sortCommitments(commitments, sort = 'next-payment') {
  // Copy first: Array.prototype.sort mutates, and this receives the React
  // Query cache's array.
  const list = [...commitments]

  switch (sort) {
    case 'cost-high':
      return list.sort((a, b) => (exposureFor(b) || 0) - (exposureFor(a) || 0))
    case 'cost-low':
      return list.sort((a, b) => (exposureFor(a) || 0) - (exposureFor(b) || 0))
    case 'name':
      return list.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), 'en-GB', { sensitivity: 'base' }),
      )
    case 'next-payment':
    default:
      return list.sort((a, b) => daysUntil(a.nextPaymentDate) - daysUntil(b.nextPaymentDate))
  }
}

/** True when anything is narrowing the list — drives the "clear" affordance. */
export function hasActiveFilters(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters }
  return f.search.trim() !== '' || f.type !== 'all' || f.category !== 'all' || f.status !== 'all'
}
