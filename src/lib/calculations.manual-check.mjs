// Zero-dependency self-check for the pure calculation logic — run with:
//   node src/lib/calculations.manual-check.mjs
// This predates the real test suite (src/lib/calculations.test.js, run via
// `npm test`): it was written in a sandbox with no npm registry access, so
// it needed to run with plain Node and nothing else. Kept around as a
// fallback that needs no install step at all — the real suite in
// calculations.test.js is the one that matters day to day and the one CI
// runs. Deliberately named so it does NOT match vitest's default test glob
// (*.test.*), so `npm test` doesn't try to execute it as a suite.

import assert from 'node:assert/strict'
import {
  annualisedCost,
  remainingBnplBalance,
  bnplPaidSoFar,
  totalAnnualExposure,
  exposureFor,
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
} from './calculations.js'

const today = new Date('2026-09-21')

let passed = 0
function check(label, fn) {
  fn()
  passed += 1
  console.log(`  ok — ${label}`)
}

console.log('annualisedCost')
check('monthly subscription: £12.99 -> £155.88/yr', () => {
  const v = annualisedCost({ type: 'subscription', costPerPayment: 12.99, frequency: 'monthly' })
  assert.ok(Math.abs(v - 155.88) < 1e-9, `got ${v}`)
})
check('weekly subscription: £5 -> £260/yr', () => {
  const v = annualisedCost({ type: 'subscription', costPerPayment: 5, frequency: 'weekly' })
  assert.equal(v, 260)
})
check('bnpl returns null (not annualised)', () => {
  const v = annualisedCost({ type: 'bnpl', costPerPayment: 25, frequency: 'monthly' })
  assert.equal(v, null)
})

console.log('remainingBnplBalance / bnplPaidSoFar')
check('£25 x 3 remaining instalments = £75', () => {
  const v = remainingBnplBalance({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 3 })
  assert.equal(v, 75)
})
check('subscription returns null', () => {
  const v = remainingBnplBalance({ type: 'subscription', costPerPayment: 25 })
  assert.equal(v, null)
})
check('paid-so-far uses totalOriginalAmount minus remaining balance', () => {
  const v = bnplPaidSoFar({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, totalOriginalAmount: 100 })
  assert.equal(v, 50) // 100 - (25*2)
})
check('paid-so-far is null when totalOriginalAmount was never entered', () => {
  const v = bnplPaidSoFar({ type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, totalOriginalAmount: null })
  assert.equal(v, null)
})

console.log('totalAnnualExposure')
check('sums subscriptions annualised + bnpl remaining, active only', () => {
  const commitments = [
    { type: 'subscription', frequency: 'monthly', costPerPayment: 12.99, status: 'active' }, // 155.88
    { type: 'subscription', frequency: 'weekly', costPerPayment: 5, status: 'active' }, // 260
    { type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, status: 'active' }, // 50
    { type: 'bnpl', costPerPayment: 999, instalmentsRemaining: 5, status: 'cancelled' }, // excluded
  ]
  const v = totalAnnualExposure(commitments)
  assert.ok(Math.abs(v - (155.88 + 260 + 50)) < 1e-9, `got ${v}`)
})

console.log('addDays / addMonthsClamped / advanceDate')
check('addDays adds whole days across a month boundary', () => {
  assert.equal(addDays('2026-09-28', 7), '2026-10-05')
})
check('addMonthsClamped: 31 Jan + 1 month lands on 28 Feb (non-leap)', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28')
})
check('addMonthsClamped: 31 Jan + 1 month lands on 29 Feb in a leap year', () => {
  assert.equal(addMonthsClamped('2028-01-31', 1), '2028-02-29')
})
check('addMonthsClamped rolls over into the next year', () => {
  assert.equal(addMonthsClamped('2026-12-15', 1), '2027-01-15')
})
check('advanceDate: weekly -> +7 days, monthly -> +1 calendar month', () => {
  assert.equal(advanceDate('2026-09-21', 'weekly'), '2026-09-28')
  assert.equal(advanceDate('2026-09-21', 'monthly'), '2026-10-21')
})
check('advanceDate: one-off installments is left unchanged', () => {
  assert.equal(advanceDate('2026-09-21', 'one-off installments'), '2026-09-21')
})

console.log('applyKeepDecision')
check('subscription: advances nextPaymentDate by its frequency', () => {
  const patch = applyKeepDecision({ type: 'subscription', frequency: 'monthly', nextPaymentDate: '2026-09-21' })
  assert.deepEqual(patch, { nextPaymentDate: '2026-10-21' })
})
check('subscription with one-off installments: no change (nothing to advance by)', () => {
  const patch = applyKeepDecision({ type: 'subscription', frequency: 'one-off installments', nextPaymentDate: '2026-09-21' })
  assert.deepEqual(patch, {})
})
check('bnpl weekly: decrements instalments AND advances the date', () => {
  const patch = applyKeepDecision({
    type: 'bnpl',
    frequency: 'weekly',
    nextPaymentDate: '2026-09-21',
    instalmentsRemaining: 3,
  })
  assert.deepEqual(patch, { instalmentsRemaining: 2, nextPaymentDate: '2026-09-28' })
})
check('bnpl one-off installments: decrements instalments, leaves date alone', () => {
  const patch = applyKeepDecision({
    type: 'bnpl',
    frequency: 'one-off installments',
    nextPaymentDate: '2026-09-21',
    instalmentsRemaining: 1,
  })
  assert.deepEqual(patch, { instalmentsRemaining: 0 })
})
check('bnpl never goes negative on remaining instalments', () => {
  const patch = applyKeepDecision({
    type: 'bnpl',
    frequency: 'monthly',
    nextPaymentDate: '2026-09-21',
    instalmentsRemaining: 0,
  })
  assert.equal(patch.instalmentsRemaining, 0)
})

console.log('daysUntil / isRenewingSoon')
check('exactly 7 days out counts as renewing soon (inclusive window)', () => {
  const c = { status: 'active', type: 'subscription', nextPaymentDate: '2026-09-28' }
  assert.equal(daysUntil(c.nextPaymentDate, today), 7)
  assert.equal(isRenewingSoon(c, today), true)
})
check('8 days out does not count', () => {
  const c = { status: 'active', type: 'subscription', nextPaymentDate: '2026-09-29' }
  assert.equal(isRenewingSoon(c, today), false)
})
check('cancelled commitment never counts, even if date is today', () => {
  const c = { status: 'cancelled', type: 'subscription', nextPaymentDate: '2026-09-21' }
  assert.equal(isRenewingSoon(c, today), false)
})
check('an overdue active commitment still counts — it must not silently vanish', () => {
  const c = { status: 'active', type: 'subscription', nextPaymentDate: '2026-09-10' }
  assert.equal(isRenewingSoon(c, today), true)
})
check('a fully-paid BNPL plan does not count, even with a nearby date', () => {
  const c = { status: 'active', type: 'bnpl', instalmentsRemaining: 0, nextPaymentDate: '2026-09-22' }
  assert.equal(isRenewingSoon(c, today), false)
})

console.log('getRenewalCheckpointItems')
check('returns overdue and in-window items, most overdue/soonest first', () => {
  const commitments = [
    { name: 'Later', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-27' },
    { name: 'Overdue', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-15' },
    { name: 'Sooner', type: 'subscription', status: 'active', nextPaymentDate: '2026-09-22' },
    { name: 'Too far', type: 'subscription', status: 'active', nextPaymentDate: '2026-10-05' },
  ]
  const items = getRenewalCheckpointItems(commitments, today)
  assert.deepEqual(items.map((i) => i.name), ['Overdue', 'Sooner', 'Later'])
})

console.log('renewalCopy')
check('subscription copy uses annualised cost and is calm, not alarmist', () => {
  const c = {
    type: 'subscription',
    frequency: 'monthly',
    costPerPayment: 12.99,
    nextPaymentDate: '2026-09-25',
  }
  const copy = renewalCopy(c, today)
  assert.equal(copy, "Renews in 4 days — you'll have paid £155.88 on this over the past year.")
  assert.ok(!/wast|shame|stop/i.test(copy), 'copy should not scold')
})
check('overdue subscription copy is still calm and factual', () => {
  const c = {
    type: 'subscription',
    frequency: 'monthly',
    costPerPayment: 12.99,
    nextPaymentDate: '2026-09-18',
  }
  const copy = renewalCopy(c, today)
  assert.equal(copy, "Renewal 3 days overdue — you'll have paid £155.88 on this over the past year.")
})
check('bnpl copy surfaces remaining balance, not an annual figure', () => {
  const c = {
    type: 'bnpl',
    costPerPayment: 25,
    instalmentsRemaining: 2,
    nextPaymentDate: '2026-09-21',
  }
  const copy = renewalCopy(c, today)
  assert.equal(copy, 'Next instalment due today — £50 left to pay on this plan.')
})

console.log('categoryBreakdown')
check('groups and sums active commitments by category, sorted descending', () => {
  const commitments = [
    { type: 'subscription', frequency: 'monthly', costPerPayment: 10, status: 'active', category: 'Streaming' },
    { type: 'subscription', frequency: 'monthly', costPerPayment: 5, status: 'active', category: 'Streaming' },
    { type: 'bnpl', costPerPayment: 40, instalmentsRemaining: 2, status: 'active', category: 'Retail BNPL' },
    { type: 'subscription', frequency: 'monthly', costPerPayment: 100, status: 'cancelled', category: 'Streaming' },
  ]
  const result = categoryBreakdown(commitments)
  assert.deepEqual(result, [
    { category: 'Streaming', total: 180 }, // (10+5)*12
    { category: 'Retail BNPL', total: 80 },
  ])
})

console.log('decisionTally / reconsideredSavingsTotal')
check('counts kept vs reconsidered across all commitments', () => {
  const commitments = [
    { decisionLog: [{ decision: 'kept' }, { decision: 'reconsidered', amount: 50 }] },
    { decisionLog: [{ decision: 'kept' }] },
    { decisionLog: [] },
  ]
  assert.deepEqual(decisionTally(commitments), { kept: 2, reconsidered: 1 })
})
check('sums the £ amount captured on each reconsidered decision', () => {
  const commitments = [
    { type: 'subscription', frequency: 'monthly', costPerPayment: 10, decisionLog: [{ decision: 'reconsidered', amount: 155.88 }] },
    { type: 'bnpl', costPerPayment: 25, instalmentsRemaining: 2, decisionLog: [{ decision: 'reconsidered', amount: 50 }] },
    { type: 'subscription', frequency: 'monthly', costPerPayment: 10, decisionLog: [{ decision: 'kept', amount: 999 }] },
  ]
  assert.equal(reconsideredSavingsTotal(commitments), 205.88)
})
check('falls back to current exposure for older entries with no stored amount', () => {
  const commitments = [
    { type: 'subscription', frequency: 'monthly', costPerPayment: 10, decisionLog: [{ decision: 'reconsidered' }] }, // no amount
  ]
  assert.equal(reconsideredSavingsTotal(commitments), 120) // 10*12, current exposure
})

console.log('formatGBP')
check('formats whole pounds without decimals, fractional with 2dp', () => {
  assert.equal(formatGBP(156), '£156')
  assert.equal(formatGBP(12.99), '£12.99')
})

console.log(`\n${passed} checks passed.`)
