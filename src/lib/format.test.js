import { describe, it, expect } from 'vitest'
import { formatShortDate, describeDue } from './format.js'

describe('formatShortDate', () => {
  it('formats an ISO date as day and short month', () => {
    expect(formatShortDate('2026-09-25')).toBe('25 Sep')
  })

  it('does not shift the day across a timezone boundary', () => {
    // Parsed as a local date. A UTC parse would print 31 Dec in the Americas.
    expect(formatShortDate('2027-01-01')).toBe('1 Jan')
  })

  it('returns an empty string for anything that is not an ISO date', () => {
    expect(formatShortDate('')).toBe('')
    expect(formatShortDate(null)).toBe('')
    expect(formatShortDate('25/09/2026')).toBe('')
  })
})

describe('describeDue', () => {
  it('reads today and tomorrow in words', () => {
    expect(describeDue(0)).toBe('Today')
    expect(describeDue(1)).toBe('Tomorrow')
  })

  it('counts forward', () => {
    expect(describeDue(5)).toBe('In 5 days')
  })

  it('counts overdue calmly, with correct pluralisation', () => {
    expect(describeDue(-1)).toBe('1 day overdue')
    expect(describeDue(-3)).toBe('3 days overdue')
  })

  it('returns an empty string for a non-number', () => {
    expect(describeDue(NaN)).toBe('')
  })
})
