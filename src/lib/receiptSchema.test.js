import { describe, it, expect } from 'vitest'
import { parseReceiptResponse, toCommitmentDraft, inferFrequency, stripCodeFence } from './receiptSchema.js'
import { validateCommitment } from './commitmentValidation.js'

const good = {
  merchant: 'Klarna — Trainers',
  total_amount: 100,
  currency: 'GBP',
  payments: [
    { date: '2026-10-01', amount: 25 },
    { date: '2026-11-01', amount: 25 },
    { date: '2026-12-01', amount: 25 },
    { date: '2027-01-01', amount: 25 },
  ],
}

const json = (obj) => JSON.stringify(obj)

describe('stripCodeFence', () => {
  it('unwraps a ```json fence', () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('unwraps a bare ``` fence', () => {
    expect(stripCodeFence('```\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('leaves unfenced text alone', () => {
    expect(stripCodeFence('  {"a":1}  ')).toBe('{"a":1}')
  })
})

describe('parseReceiptResponse — accepts', () => {
  it('a well-formed instalment plan', () => {
    const result = parseReceiptResponse(json(good))
    expect(result.ok).toBe(true)
    expect(result.value).toMatchObject({ merchant: 'Klarna — Trainers', totalAmount: 100, currency: 'GBP' })
    expect(result.value.payments).toHaveLength(4)
  })

  it('a response wrapped in a markdown fence', () => {
    expect(parseReceiptResponse('```json\n' + json(good) + '\n```').ok).toBe(true)
  })

  it('amounts returned as strings, which models routinely do', () => {
    const result = parseReceiptResponse(json({ ...good, total_amount: '100.00' }))
    expect(result.ok).toBe(true)
    expect(result.value.totalAmount).toBe(100)
  })

  it('amounts carrying a currency symbol', () => {
    const result = parseReceiptResponse(json({ ...good, total_amount: '£1,234.50' }))
    expect(result.value.totalAmount).toBe(1234.5)
  })

  it('and sorts payments oldest first regardless of input order', () => {
    const shuffled = { ...good, payments: [...good.payments].reverse() }
    const result = parseReceiptResponse(json(shuffled))
    expect(result.value.payments[0].date).toBe('2026-10-01')
  })
})

describe('parseReceiptResponse — rejects', () => {
  const rejects = (input, pattern) => {
    const result = parseReceiptResponse(input)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(pattern)
  }

  it('non-JSON', () => rejects('I could not read that receipt, sorry!', /readable JSON/i))
  it('a JSON array', () => rejects('[1,2,3]', /object/i))
  it('an explicit not-a-receipt signal', () => rejects(json({ not_a_receipt: true }), /doesn't look like a receipt/i))
  it('a missing merchant', () => rejects(json({ ...good, merchant: '' }), /merchant/i))
  it('a missing total', () => rejects(json({ ...good, total_amount: null }), /total amount/i))
  it('a negative total', () => rejects(json({ ...good, total_amount: -5 }), /positive/i))
  it('a zero total', () => rejects(json({ ...good, total_amount: 0 }), /positive/i))
  it('an absurd total', () => rejects(json({ ...good, total_amount: 99_999_999 }), /implausibly large/i))
  it('an empty payment schedule', () => rejects(json({ ...good, payments: [] }), /payment schedule/i))
  it('a missing payment schedule', () => rejects(json({ ...good, payments: undefined }), /payment schedule/i))
  it('a payment schedule that is not an array', () => rejects(json({ ...good, payments: 'monthly' }), /payment schedule/i))
  it('too many payments', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ date: '2026-10-01', amount: 1 }))
    rejects(json({ ...good, payments: many }), /implausibly many/i)
  })
  it('a date that does not exist', () => {
    // new Date('2026-02-31') silently rolls into March.
    rejects(json({ ...good, payments: [{ date: '2026-02-31', amount: 25 }] }), /not a valid date/i)
  })
  it('a non-ISO date', () => rejects(json({ ...good, payments: [{ date: '01/10/2026', amount: 25 }] }), /not a valid date/i))
  it('a negative payment amount', () => rejects(json({ ...good, payments: [{ date: '2026-10-01', amount: -5 }] }), /positive/i))
  it('a NaN amount', () => rejects(json({ ...good, total_amount: 'not a number' }), /total amount/i))
  it('a malformed payment entry', () => rejects(json({ ...good, payments: ['tomorrow'] }), /malformed/i))
})

describe('toCommitmentDraft', () => {
  const today = new Date('2026-09-22')

  it('turns a multi-payment receipt into a BNPL draft', () => {
    const { value } = parseReceiptResponse(json(good))
    const draft = toCommitmentDraft(value, today)
    expect(draft).toMatchObject({
      name: 'Klarna — Trainers',
      type: 'bnpl',
      costPerPayment: 25,
      frequency: 'monthly',
      nextPaymentDate: '2026-10-01',
      totalOriginalAmount: 100,
      instalmentsRemaining: 4,
      category: 'Retail BNPL',
    })
  })

  it('turns a single-payment receipt into a subscription draft', () => {
    const single = { ...good, payments: [{ date: '2026-10-01', amount: 9.99 }] }
    const draft = toCommitmentDraft(parseReceiptResponse(json(single)).value, today)
    expect(draft).toMatchObject({ type: 'subscription', instalmentsRemaining: null, category: 'Other subscriptions' })
  })

  it('counts only payments still to come', () => {
    const partlyPaid = {
      ...good,
      payments: [
        { date: '2026-08-01', amount: 25 },
        { date: '2026-09-01', amount: 25 },
        { date: '2026-10-01', amount: 25 },
        { date: '2026-11-01', amount: 25 },
      ],
    }
    const draft = toCommitmentDraft(parseReceiptResponse(json(partlyPaid)).value, today)
    expect(draft.instalmentsRemaining).toBe(2)
    expect(draft.nextPaymentDate).toBe('2026-10-01')
  })

  it('produces a draft the normal form validator accepts', () => {
    // The whole point: the draft goes into CommitmentForm, so it has to pass
    // the same rules as anything typed by hand.
    const draft = toCommitmentDraft(parseReceiptResponse(json(good)).value, today)
    expect(validateCommitment(draft)).toBeNull()
  })

  it('produces a valid draft for a single-payment receipt too', () => {
    const single = { ...good, payments: [{ date: '2026-10-01', amount: 9.99 }] }
    const draft = toCommitmentDraft(parseReceiptResponse(json(single)).value, today)
    expect(validateCommitment(draft)).toBeNull()
  })
})

describe('inferFrequency', () => {
  it('reads roughly-weekly gaps as weekly', () => {
    expect(inferFrequency([{ date: '2026-10-01' }, { date: '2026-10-08' }])).toBe('weekly')
  })

  it('reads roughly-monthly gaps as monthly', () => {
    expect(inferFrequency([{ date: '2026-10-01' }, { date: '2026-11-01' }])).toBe('monthly')
  })

  it('falls back for fortnightly, which this app has no cadence for', () => {
    expect(inferFrequency([{ date: '2026-10-01' }, { date: '2026-10-15' }])).toBe('one-off installments')
  })

  it('falls back for an irregular gap rather than guessing', () => {
    expect(inferFrequency([{ date: '2026-10-01' }, { date: '2027-04-01' }])).toBe('one-off installments')
  })
})
