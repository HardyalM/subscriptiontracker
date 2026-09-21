import { describe, it, expect } from 'vitest'
import { validateCommitment, isIsoDate, normaliseCommitment } from './commitmentValidation.js'

const valid = {
  name: 'Video streaming',
  type: 'subscription',
  costPerPayment: 12.99,
  frequency: 'monthly',
  nextPaymentDate: '2026-10-01',
  category: 'Streaming',
}

const validBnpl = {
  ...valid,
  name: 'Trainers',
  type: 'bnpl',
  category: 'Retail BNPL',
  instalmentsRemaining: 3,
}

describe('validateCommitment', () => {
  it('accepts a well-formed subscription', () => {
    expect(validateCommitment(valid)).toBeNull()
  })

  it('accepts a well-formed BNPL plan', () => {
    expect(validateCommitment(validBnpl)).toBeNull()
  })

  it('requires a name', () => {
    expect(validateCommitment({ ...valid, name: '   ' })).toMatch(/name/i)
  })

  it('rejects a cost of zero or less — matching the database CHECK', () => {
    expect(validateCommitment({ ...valid, costPerPayment: 0 })).toMatch(/greater than 0/i)
    expect(validateCommitment({ ...valid, costPerPayment: -5 })).toMatch(/greater than 0/i)
  })

  it('rejects a non-numeric cost', () => {
    expect(validateCommitment({ ...valid, costPerPayment: 'free' })).toMatch(/number/i)
  })

  it('rejects an unknown type', () => {
    expect(validateCommitment({ ...valid, type: 'loan' })).toMatch(/type/i)
  })

  it('rejects an unknown frequency', () => {
    expect(validateCommitment({ ...valid, frequency: 'fortnightly' })).toMatch(/frequency/i)
  })

  it('rejects an unknown category, because Postgres would too', () => {
    expect(validateCommitment({ ...valid, category: 'Groceries' })).toMatch(/category/i)
  })

  it('requires a next payment date', () => {
    expect(validateCommitment({ ...valid, nextPaymentDate: '' })).toMatch(/date is required/i)
  })

  it('rejects a malformed date', () => {
    expect(validateCommitment({ ...valid, nextPaymentDate: '01/10/2026' })).toMatch(/YYYY-MM-DD/)
  })

  it('rejects a date that does not exist', () => {
    expect(validateCommitment({ ...valid, nextPaymentDate: '2026-02-31' })).toMatch(/YYYY-MM-DD/)
  })

  it('requires instalments on a BNPL plan', () => {
    expect(validateCommitment({ ...validBnpl, instalmentsRemaining: '' })).toMatch(/instalments/i)
  })

  it('rejects negative or fractional instalments', () => {
    expect(validateCommitment({ ...validBnpl, instalmentsRemaining: -1 })).toMatch(/0 or more/i)
    expect(validateCommitment({ ...validBnpl, instalmentsRemaining: 2.5 })).toMatch(/whole number/i)
  })

  it('does not require instalments on a subscription', () => {
    expect(validateCommitment({ ...valid, instalmentsRemaining: undefined })).toBeNull()
  })

  it('rejects an unknown bnplMode', () => {
    expect(validateCommitment({ ...validBnpl, bnplMode: 'rolling' })).toMatch(/BNPL mode/i)
  })

  it('accepts both valid bnplModes', () => {
    expect(validateCommitment({ ...validBnpl, bnplMode: 'fixed' })).toBeNull()
    expect(validateCommitment({ ...validBnpl, bnplMode: 'recurring' })).toBeNull()
  })

  it('rejects a negative original amount', () => {
    expect(validateCommitment({ ...valid, totalOriginalAmount: -1 })).toMatch(/0 or more/i)
  })

  it('allows an absent original amount', () => {
    expect(validateCommitment({ ...valid, totalOriginalAmount: '' })).toBeNull()
    expect(validateCommitment({ ...valid, totalOriginalAmount: null })).toBeNull()
  })

  it('reports the name problem before the cost problem', () => {
    expect(validateCommitment({ ...valid, name: '', costPerPayment: -1 })).toMatch(/name/i)
  })
})

describe('isIsoDate', () => {
  it('accepts a real date', () => {
    expect(isIsoDate('2026-10-01')).toBe(true)
  })

  it('accepts a leap day in a leap year', () => {
    expect(isIsoDate('2024-02-29')).toBe(true)
  })

  it('rejects a leap day in a non-leap year', () => {
    // new Date('2026-02-29') silently rolls to 1 March, which is why this
    // compares the parsed parts back to the input.
    expect(isIsoDate('2026-02-29')).toBe(false)
  })

  it('rejects other formats and non-strings', () => {
    expect(isIsoDate('2026/10/01')).toBe(false)
    expect(isIsoDate('1 Oct 2026')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
    expect(isIsoDate(20261001)).toBe(false)
  })
})

describe('normaliseCommitment', () => {
  it('coerces numeric strings into numbers', () => {
    const n = normaliseCommitment({ ...valid, costPerPayment: '12.99' })
    expect(n.costPerPayment).toBe(12.99)
  })

  it('nulls BNPL-only fields on a subscription', () => {
    const n = normaliseCommitment({ ...valid, instalmentsRemaining: 5 })
    expect(n.instalmentsRemaining).toBeNull()
    expect(n.bnplMode).toBe('fixed')
  })

  it('defaults a BNPL plan to fixed mode', () => {
    expect(normaliseCommitment(validBnpl).bnplMode).toBe('fixed')
  })

  it('keeps an explicit recurring mode', () => {
    expect(normaliseCommitment({ ...validBnpl, bnplMode: 'recurring' }).bnplMode).toBe('recurring')
  })

  it('defaults status to active and trims the name', () => {
    const n = normaliseCommitment({ ...valid, name: '  Spotify  ' })
    expect(n.name).toBe('Spotify')
    expect(n.status).toBe('active')
  })
})
