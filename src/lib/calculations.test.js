// Real test suite — run with `npm test` (vitest). Mirrors the checks in
// calculations.manual-check.mjs (the zero-dependency script written before
// this had npm access) one-for-one; this is the version CI runs.

import { describe, it, expect } from 'vitest'
import {
  annualisedCost,
  remainingBnplBalance,
  bnplPaidSoFar,
  totalAnnualExposure,
  isRenewingSoon,
  getRenewalCheckpointItems,
  renewalCopy,
  categoryBreakdown,
  decisionTally,
  reconsideredSavingsTotal,
  daysUntil,
  addDays,
  addMonthsClamped,
  advanceDate,
  applyKeepDecision,
  formatGBP,
  applyKeepDecision,
  exposureTrend,
} from './calculations.js'

const today = new Date('2026-09-21')

describe('annualisedCost', () => {
  it('monthly subscription: £12.99 -> £155.88/yr', () => {
    expect(annualisedCost({ type: 'subscription', costPerPayment: 12.99, frequency: 'monthly' })).toBeCloseTo(155.88, 9)
  })
  it('weekly subscription: £5 -> £260/yr', () => {
    expect(annualisedCost({ type: 'subscription', costPerPayment: 5, frequency: 'weekly' })).toBe(260)
  })
  it('bnpl returns null (not annualised)', () => {
    expect(annualisedCost({ type: 'bnpl', costPerPayment: 25, frequency: 'monthly' })).toBeNull()
  })
})

describe('remainingBnplBalance / bnplPaidSoFar', () => {
  it('£25 x 3 remaining instalments = £75', () => {
    expect(remainingBnplBalance({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 3 })).toBe(75)
  })
  it('subscription returns null', () => {
    expect(remainingBnplBalance({ type: 'subscription', costPerPayment: 25 })).toBeNull()
  })
  it('paid-so-far uses totalOriginalAmount minus remaining balance', () => {
    expect(
      bnplPaidSoFar({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, totalOriginalAmount: 100 }),
    ).toBe(50)
  })
  it('paid-so-far is null when totalOriginalAmount was never entered', () => {
    expect(
      bnplPaidSoFar({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, totalOriginalAmount: null }),
    ).toBeNull()
  })
})

describe('totalAnnualExposure', () => {
  it('sums subscriptions annualised + bnpl remaining, active only', () => {
    const commitments = [
      { type: 'subscription', frequency: 'monthly', costPerPayment: 12.99, status: 'active' }, // 155.88
      { type: 'subscription', frequency: 'weekly', costPerPayment: 5, status: 'active' }, // 260
      { type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, status: 'active' }, // 50
      { type: 'bnpl', costPerPayment: 999, instalmentsRemaining: 5, status: 'cancelled' }, // excluded
    ]
    expect(totalAnnualExposure(commitments)).toBeCloseTo(155.88 + 260 + 50, 9)
  })
})

describe('addDays / addMonthsClamped / advanceDate', () => {
  it('addDays adds whole days across a month boundary', () => {
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05')
  })
  it('31 Jan + 1 month lands on 28 Feb (non-leap)', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('31 Jan + 1 month lands on 29 Feb in a leap year', () => {
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29')
  })
  it('rolls over into the next year', () => {
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15')
  })
  it('advanceDate: weekly -> +7 days, monthly -> +1 calendar month', () => {
    expect(advanceDate('2026-09-21', 'weekly')).toBe('2026-09-28')
    expect(advanceDate('2026-09-21', 'monthly')).toBe('2026-10-21')
  })
  it('advanceDate: one-off installments is left unchanged', () => {
    expect(advanceDate('2026-09-21', 'one-off installments')).toBe('2026-09-21')
  })
})

describe('applyKeepDecision', () => {
  it('subscription: advances nextPaymentDate by its frequency', () => {
    expect(applyKeepDecision({ type: 'subscription', frequency: 'monthly', nextPaymentDate: '2026-09-21' })).toEqual({
      nextPaymentDate: '2026-10-21',
    })
  })
  it('subscription with one-off installments: no change', () => {
    expect(
      applyKeepDecision({ type: 'subscription', frequency: 'one-off installments', nextPaymentDate: '2026-09-21' }),
    ).toEqual({})
  })
  it('bnpl weekly: decrements instalments AND advances the date', () => {
    expect(
      applyKeepDecision({ type: 'bnpl', frequency: 'weekly', nextPaymentDate: '2026-09-21', instalmentsRemaining: 3 }),
    ).toEqual({ instalmentsRemaining: 2, nextPaymentDate: '2026-09-28' })
  })
  it('bnpl one-off installments: decrements instalments, leaves date alone', () => {
    expect(
      applyKeepDecision({
        type: 'bnpl',
        frequency: 'one-off installments',
        nextPaymentDate: '2026-09-21',
        instalmentsRemaining: 1,
      }),
    ).toEqual({ instalmentsRemaining: 0 })
  })
  it('bnpl never goes negative on remaining instalments', () => {
    const patch = applyKeepDecision({
      type: 'bnpl',
      frequency: 'monthly',
      nextPaymentDate: '2026-09-21',
      instalmentsRemaining: 0,
    })
    expect(patch.instalmentsRemaining).toBe(0)
  })
})

describe('daysUntil / isRenewingSoon', () => {
  it('exactly 7 days out counts as renewing soon (inclusive window)', () => {
    const c = { status: 'active', type: 'subscription', nextPaymentDate: '2026-09-28' }
    expect(daysUntil(c.nextPaymentDate, today)).toBe(7)
    expect(isRenewingSoon(c, today)).toBe(true)
  })
  it('8 days out does not count', () => {
    expect(isRenewingSoon({ status: 'active', type: 'subscription', nextPaymentDate: '2026-09-29' }, today)).toBe(false)
  })
  it('cancelled commitment never counts, even if date is today', () => {
    expect(isRenewingSoon({ status: 'cancelled', type: 'subscription', nextPaymentDate: '2026-09-21' }, today)).toBe(
      false,
    )
  })
  it('an overdue active commitment still counts — it must not silently vanish', () => {
    expect(isRenewingSoon({ status: 'active', type: 'subscription', nextPaymentDate: '2026-09-10' }, today)).toBe(true)
  })
  it('a fully-paid BNPL plan does not count, even with a nearby date', () => {
    expect(
      isRenewingSoon({ status: 'active', type: 'bnpl', instalmentsRemaining: 0, nextPaymentDate: '2026-09-22' }, today),
    ).toBe(false)
  })
})

describe('getRenewalCheckpointItems', () => {
  it('returns overdue and in-window items, most overdue/soonest first', () => {
    const commitments = [
      { name: 'Later', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-27' },
      { name: 'Overdue', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-15' },
      { name: 'Sooner', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-22' },
      { name: 'Too far', type: 'subscription', status: 'active', nextPaymentDate: '2026-10-05' },
    ]
    expect(getRenewalCheckpointItems(commitments, today).map((i) => i.name)).toEqual(['Overdue', 'Sooner', 'Later'])
  })
})

describe('renewalCopy', () => {
  it('subscription copy uses annualised cost and is calm, not alarmist', () => {
    const copy = renewalCopy({ type: 'subscription', frequency: 'monthly', costPerPayment: 12.99, nextPaymentDate: '2026-09-25' }, today)
    expect(copy).toBe("Renews in 4 days — you'll have paid £155.88 on this over the past year.")
    expect(copy).not.toMatch(/wast|shame|stop/i)
  })
  it('overdue subscription copy is still calm and factual', () => {
    const copy = renewalCopy({ type: 'subscription', frequency: 'monthly', costPerPayment: 12.99, nextPaymentDate: '2026-09-18' }, today)
    expect(copy).toBe("Renewal 3 days overdue — you'll have paid £155.88 on this over the past year.")
  })
  it('bnpl copy surfaces remaining balance, not an annual figure', () => {
    const copy = renewalCopy({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, nextPaymentDate: '2026-09-21' }, today)
    expect(copy).toBe('Next instalment due today — £50 left to pay on this plan.')
  })
})

describe('categoryBreakdown', () => {
  it('groups and sums active commitments by category, sorted descending', () => {
    const commitments = [
      { type: 'subscription', frequency: 'monthly', costPerPayment: 10, status: 'active', category: 'Streaming' },
      { type: 'subscription', frequency: 'monthly', costPerPayment: 5, status: 'active', category: 'Streaming' },
      { type: 'bnpl', costPerPayment: 40, instalmentsRemaining: 2, status: 'active', category: 'Retail BNPL' },
      { type: 'subscription', frequency: 'monthly', costPerPayment: 100, status: 'cancelled', category: 'Streaming' },
    ]
    expect(categoryBreakdown(commitments)).toEqual([
      { category: 'Streaming', total: 180 },
      { category: 'Retail BNPL', total: 80 },
    ])
  })
})

describe('decisionTally / reconsideredSavingsTotal', () => {
  it('counts kept vs reconsidered across all commitments', () => {
    const commitments = [
      { decisionLog: [{ decision: 'kept' }, { decision: 'reconsidered', amount: 50 }] },
      { decisionLog: [{ decision: 'kept' }] },
      { decisionLog: [] },
    ]
    expect(decisionTally(commitments)).toEqual({ kept: 2, reconsidered: 1 })
  })
  it('sums the £ amount captured on each reconsidered decision', () => {
    const commitments = [
      {
        type: 'subscription',
        frequency: 'monthly',
        costPerPayment: 10,
        decisionLog: [{ decision: 'reconsidered', amount: 155.88 }],
      },
      { type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, decisionLog: [{ decision: 'reconsidered', amount: 50 }] },
      {
        type: 'subscription',
        frequency: 'monthly',
        costPerPayment: 10,
        decisionLog: [{ decision: 'kept', amount: 999 }],
      },
    ]
    expect(reconsideredSavingsTotal(commitments)).toBeCloseTo(205.88, 9)
  })
  it('falls back to current exposure for older entries with no stored amount', () => {
    const commitments = [
      { type: 'subscription', frequency: 'monthly', costPerPayment: 10, decisionLog: [{ decision: 'reconsidered' }] },
    ]
    expect(reconsideredSavingsTotal(commitments)).toBe(120)
  })
})

describe('formatGBP', () => {
  it('formats whole pounds without decimals, fractional with 2dp', () => {
    expect(formatGBP(156)).toBe('£156')
    expect(formatGBP(12.99)).toBe('£12.99')
  })
})

// --- Phase 4 additions -----------------------------------------------------
// The 33 assertions above are the standing regression gate and are untouched.

describe('applyKeepDecision — recurring BNPL', () => {
  const base = {
    type: 'bnpl',
    frequency: 'monthly',
    nextPaymentDate: '2026-09-21',
    instalmentsRemaining: 1,
  }

  it('a fixed plan still decrements to zero and stops', () => {
    expect(applyKeepDecision({ ...base, bnplMode: 'fixed' }).instalmentsRemaining).toBe(0)
  })

  it('treats a missing bnplMode as fixed', () => {
    // Every commitment created before this column existed.
    expect(applyKeepDecision(base).instalmentsRemaining).toBe(0)
  })

  it('a recurring plan does not come to rest at zero', () => {
    expect(applyKeepDecision({ ...base, bnplMode: 'recurring' }).instalmentsRemaining).toBe(1)
  })

  it('a recurring plan mid-block still decrements normally', () => {
    const patch = applyKeepDecision({ ...base, instalmentsRemaining: 4, bnplMode: 'recurring' })
    expect(patch.instalmentsRemaining).toBe(3)
  })

  it('advances the date either way', () => {
    expect(applyKeepDecision({ ...base, bnplMode: 'recurring' }).nextPaymentDate).toBe('2026-10-21')
    expect(applyKeepDecision({ ...base, bnplMode: 'fixed' }).nextPaymentDate).toBe('2026-10-21')
  })
})

describe('exposureTrend', () => {
  const monthly = (over) => ({
    type: 'subscription',
    frequency: 'monthly',
    costPerPayment: 10,
    status: 'active',
    decisionLog: [],
    ...over,
  })

  it('returns one point per month, oldest first', () => {
    const points = exposureTrend([], 6, new Date('2026-09-21'))
    expect(points).toHaveLength(6)
    expect(points.map((p) => p.month)).toEqual([
      '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
    ])
  })

  it('counts a commitment only from the month it was created', () => {
    const points = exposureTrend([monthly({ createdAt: '2026-08-15' })], 3, new Date('2026-09-21'))
    expect(points.map((p) => p.exposure)).toEqual([0, 120, 120])
  })

  it('drops a commitment from the month it was cancelled', () => {
    const c = monthly({ createdAt: '2026-07-01', status: 'cancelled', cancelledAt: '2026-08-10' })
    const points = exposureTrend([c], 3, new Date('2026-09-21'))
    expect(points.map((p) => p.exposure)).toEqual([120, 0, 0])
  })

  it('excludes a cancelled commitment with no cancellation date', () => {
    // Rather than inventing one and drawing a confidently wrong line.
    const c = monthly({ createdAt: '2026-07-01', status: 'cancelled', cancelledAt: null })
    expect(exposureTrend([c], 3, new Date('2026-09-21')).every((p) => p.exposure === 0)).toBe(true)
  })

  it('sums several commitments in the same month', () => {
    const points = exposureTrend(
      [monthly({ createdAt: '2026-01-01' }), monthly({ createdAt: '2026-01-01', costPerPayment: 5 })],
      1,
      new Date('2026-09-21'),
    )
    expect(points[0].exposure).toBe(180)
  })

  it('counts a commitment with no createdAt as always present', () => {
    expect(exposureTrend([monthly({})], 2, new Date('2026-09-21')).map((p) => p.exposure)).toEqual([120, 120])
  })
})
