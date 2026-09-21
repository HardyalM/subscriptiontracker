import { describe, it, expect } from 'vitest'
import { toCommitment, toDecisionLog, toCommitmentRow, toDecisionRow } from './commitmentMappers.js'
import { reconsideredSavingsTotal, annualisedCost, remainingBnplBalance } from './calculations.js'

const subscriptionRow = {
  id: 'c1',
  workspace_id: 'w1',
  name: 'Video streaming',
  type: 'subscription',
  cost_per_payment: '12.99',
  frequency: 'monthly',
  next_payment_date: '2026-10-01',
  total_original_amount: null,
  instalments_remaining: null,
  status: 'active',
  category: 'Streaming',
  decision_log: [],
}

const bnplRow = {
  ...subscriptionRow,
  id: 'c2',
  name: 'Trainers',
  type: 'bnpl',
  cost_per_payment: '25.00',
  total_original_amount: '100.00',
  instalments_remaining: 3,
  category: 'Retail BNPL',
}

describe('toCommitment', () => {
  it('maps snake_case columns onto the Commitment shape', () => {
    expect(toCommitment(subscriptionRow)).toMatchObject({
      id: 'c1',
      name: 'Video streaming',
      type: 'subscription',
      frequency: 'monthly',
      nextPaymentDate: '2026-10-01',
      status: 'active',
      category: 'Streaming',
    })
  })

  it('coerces numeric columns arriving as strings into numbers', () => {
    const c = toCommitment(subscriptionRow)
    expect(typeof c.costPerPayment).toBe('number')
    expect(c.costPerPayment).toBe(12.99)
  })

  it('keeps calculations.js working unchanged on a mapped row', () => {
    // The whole point of the mapper: the pure logic never learns about the
    // database. 12.99 x 12 = 155.88, the same assertion calculations.test.js
    // makes against a hand-built object.
    expect(annualisedCost(toCommitment(subscriptionRow))).toBeCloseTo(155.88, 9)
    expect(remainingBnplBalance(toCommitment(bnplRow))).toBe(75)
  })

  it('maps nullable BNPL fields to null, not 0', () => {
    const c = toCommitment(subscriptionRow)
    expect(c.totalOriginalAmount).toBeNull()
    expect(c.instalmentsRemaining).toBeNull()
  })

  it('returns null for a missing row rather than throwing', () => {
    expect(toCommitment(null)).toBeNull()
    expect(toCommitment(undefined)).toBeNull()
  })

  it('tolerates a row with no joined decision_log', () => {
    const { decision_log, ...withoutLog } = subscriptionRow
    expect(toCommitment(withoutLog).decisionLog).toEqual([])
  })
})

describe('toDecisionLog', () => {
  it('maps decided_on onto date and preserves the decision', () => {
    expect(toDecisionLog([{ decided_on: '2026-09-01', decision: 'kept', amount: '10.00' }])).toEqual([
      { date: '2026-09-01', decision: 'kept', amount: 10 },
    ])
  })

  it('omits amount entirely when the column is null', () => {
    // Not `amount: 0`, and not `amount: null` — absent. See the next test for
    // why the distinction matters.
    const [entry] = toDecisionLog([{ decided_on: '2026-09-01', decision: 'reconsidered', amount: null }])
    expect('amount' in entry).toBe(false)
  })

  it('keeps reconsideredSavingsTotal falling back for amount-less entries', () => {
    // A monthly £12.99 subscription = £155.88/yr of exposure. An older
    // decision with no stored amount must fall back to that figure. If the
    // mapper coerced null to 0, this would be £0 and the savings total would
    // silently under-count.
    const commitment = toCommitment({
      ...subscriptionRow,
      decision_log: [{ decided_on: '2026-09-01', decision: 'reconsidered', amount: null }],
    })
    expect(reconsideredSavingsTotal([commitment])).toBeCloseTo(155.88, 9)
  })

  it('uses the stored amount when there is one, not current exposure', () => {
    const commitment = toCommitment({
      ...subscriptionRow,
      decision_log: [{ decided_on: '2026-09-01', decision: 'reconsidered', amount: '40.00' }],
    })
    expect(reconsideredSavingsTotal([commitment])).toBe(40)
  })

  it('sorts oldest first regardless of the order rows arrive in', () => {
    const log = toDecisionLog([
      { decided_on: '2026-09-03', decision: 'kept', amount: null },
      { decided_on: '2026-09-01', decision: 'kept', amount: null },
      { decided_on: '2026-09-02', decision: 'kept', amount: null },
    ])
    expect(log.map((e) => e.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
  })

  it('returns an empty array for null or a non-array', () => {
    expect(toDecisionLog(null)).toEqual([])
    expect(toDecisionLog(undefined)).toEqual([])
  })
})

describe('toCommitmentRow', () => {
  const commitment = toCommitment(bnplRow)

  it('writes workspace_id and snake_case columns', () => {
    const row = toCommitmentRow(commitment, 'w1')
    expect(row.workspace_id).toBe('w1')
    expect(row.cost_per_payment).toBe(25)
    expect(row.next_payment_date).toBe('2026-10-01')
  })

  it('never includes id — the database owns it', () => {
    expect('id' in toCommitmentRow(commitment, 'w1')).toBe(false)
  })

  it('trims the name', () => {
    expect(toCommitmentRow({ ...commitment, name: '  Trainers  ' }, 'w1').name).toBe('Trainers')
  })

  it('forces instalments_remaining to null for a subscription', () => {
    // Required by the commitments_bnpl_fields_match_type CHECK constraint.
    const row = toCommitmentRow({ ...commitment, type: 'subscription', instalmentsRemaining: 3 }, 'w1')
    expect(row.instalments_remaining).toBeNull()
  })

  it('keeps instalments_remaining for a BNPL plan', () => {
    expect(toCommitmentRow(commitment, 'w1').instalments_remaining).toBe(3)
  })

  it('defaults status to active when absent', () => {
    const { status, ...withoutStatus } = commitment
    expect(toCommitmentRow(withoutStatus, 'w1').status).toBe('active')
  })
})

describe('toDecisionRow', () => {
  it('denormalises workspace_id alongside commitment_id', () => {
    const row = toDecisionRow({
      commitmentId: 'c1',
      workspaceId: 'w1',
      decision: 'kept',
      amount: 155.88,
      date: '2026-09-21',
    })
    expect(row).toEqual({
      commitment_id: 'c1',
      workspace_id: 'w1',
      decision: 'kept',
      decided_on: '2026-09-21',
      amount: 155.88,
    })
  })

  it('writes null for a non-numeric amount rather than NaN', () => {
    // amount is nullable in the schema; NaN would fail the CHECK.
    expect(toDecisionRow({ commitmentId: 'c1', workspaceId: 'w1', decision: 'kept', date: '2026-09-21' }).amount)
      .toBeNull()
    expect(toDecisionRow({ commitmentId: 'c1', workspaceId: 'w1', decision: 'kept', amount: NaN, date: '2026-09-21' }).amount)
      .toBeNull()
  })
})
