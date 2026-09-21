import { describe, it, expect } from 'vitest'
import { filterAndSortCommitments, sortCommitments, hasActiveFilters, DEFAULT_FILTERS } from './commitmentFilters.js'

const sub = (over) => ({
  type: 'subscription',
  frequency: 'monthly',
  costPerPayment: 10,
  status: 'active',
  category: 'Streaming',
  nextPaymentDate: '2026-10-01',
  decisionLog: [],
  ...over,
})

const list = [
  sub({ id: '1', name: 'Video streaming', costPerPayment: 12, nextPaymentDate: '2026-10-05' }),
  sub({ id: '2', name: 'Music streaming', costPerPayment: 8, nextPaymentDate: '2026-10-01' }),
  sub({
    id: '3',
    name: 'Trainers',
    type: 'bnpl',
    category: 'Retail BNPL',
    costPerPayment: 25,
    instalmentsRemaining: 4,
    nextPaymentDate: '2026-10-10',
  }),
  sub({ id: '4', name: 'Old gym', status: 'cancelled', nextPaymentDate: '2026-09-01' }),
]

describe('filterAndSortCommitments', () => {
  it('returns everything by default', () => {
    expect(filterAndSortCommitments(list)).toHaveLength(4)
  })

  it('searches on name, case-insensitively', () => {
    expect(filterAndSortCommitments(list, { search: 'STREAMING' }).map((c) => c.id)).toEqual(['2', '1'])
  })

  it('ignores surrounding whitespace in the search', () => {
    expect(filterAndSortCommitments(list, { search: '  trainers  ' }).map((c) => c.id)).toEqual(['3'])
  })

  it('filters by type', () => {
    expect(filterAndSortCommitments(list, { type: 'bnpl' }).map((c) => c.id)).toEqual(['3'])
  })

  it('filters by category', () => {
    expect(filterAndSortCommitments(list, { category: 'Retail BNPL' }).map((c) => c.id)).toEqual(['3'])
  })

  it('filters by status', () => {
    expect(filterAndSortCommitments(list, { status: 'cancelled' }).map((c) => c.id)).toEqual(['4'])
  })

  it('combines filters', () => {
    expect(filterAndSortCommitments(list, { type: 'subscription', status: 'active', search: 'music' })
      .map((c) => c.id)).toEqual(['2'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterAndSortCommitments(list, { search: 'nothing here' })).toEqual([])
  })

  it('does not mutate the input array', () => {
    const order = list.map((c) => c.id)
    filterAndSortCommitments(list, { sort: 'name' })
    expect(list.map((c) => c.id)).toEqual(order)
  })
})

describe('sortCommitments', () => {
  it('sorts by next payment date, soonest first', () => {
    expect(sortCommitments(list, 'next-payment').map((c) => c.id)).toEqual(['4', '2', '1', '3'])
  })

  it('sorts by name', () => {
    expect(sortCommitments(list, 'name').map((c) => c.name)).toEqual([
      'Music streaming', 'Old gym', 'Trainers', 'Video streaming',
    ])
  })

  it('sorts by exposure, not per-payment cost', () => {
    // The BNPL plan is £25 a payment but £100 still owed, so it outranks the
    // £12/month subscription's £144 a year? No — £144 > £100, so the
    // subscription leads. This is the reframe working.
    const [first] = sortCommitments(list, 'cost-high')
    expect(first.name).toBe('Video streaming')
  })

  it('cost-low is the reverse end of the same ordering', () => {
    const high = sortCommitments(list, 'cost-high').map((c) => c.id)
    const low = sortCommitments(list, 'cost-low').map((c) => c.id)
    expect(low[0]).toBe(high[high.length - 1])
  })

  it('falls back to next-payment for an unknown sort', () => {
    expect(sortCommitments(list, 'nonsense').map((c) => c.id)).toEqual(['4', '2', '1', '3'])
  })
})

describe('hasActiveFilters', () => {
  it('is false for the defaults', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
  })

  it('is false when only the sort changed — sorting narrows nothing', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'name' })).toBe(false)
  })

  it('is true when any filter narrows the list', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, type: 'bnpl' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: 'cancelled' })).toBe(true)
  })
})
