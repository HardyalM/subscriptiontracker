import { describe, it, expect } from 'vitest'
import { matchMerchant, normaliseDescription, buildSuggestion, addOneMonth, findCancellationGuide } from './merchantMatching.js'
import { addMonthsClamped } from './calculations.js'

const patterns = [
  { id: 'p1', pattern: 'NETFLIX', match_type: 'contains', provider_name: 'Netflix', suggested_category: 'Streaming' },
  { id: 'p2', pattern: 'AMAZON PRIME', match_type: 'contains', provider_name: 'Amazon Prime', suggested_category: 'Streaming' },
  { id: 'p3', pattern: 'AMAZON', match_type: 'contains', provider_name: 'Amazon', suggested_category: 'Other' },
  { id: 'p4', pattern: 'KLARNA', match_type: 'contains', provider_name: 'Klarna', suggested_category: 'Retail BNPL' },
  { id: 'p5', pattern: '^SKY\\s', match_type: 'regex', provider_name: 'Sky', suggested_category: 'Streaming' },
]

describe('normaliseDescription', () => {
  it('uppercases and collapses whitespace', () => {
    expect(normaliseDescription('  spotify   p1a2b3  ')).toBe('SPOTIFY P1A2B3')
  })

  it('handles nullish input', () => {
    expect(normaliseDescription(null)).toBe('')
    expect(normaliseDescription(undefined)).toBe('')
  })
})

describe('matchMerchant', () => {
  it('matches a real bank description with a reference code attached', () => {
    expect(matchMerchant('NETFLIX.COM 866-579-7172', patterns)?.provider_name).toBe('Netflix')
  })

  it('is case-insensitive', () => {
    expect(matchMerchant('netflix.com', patterns)?.provider_name).toBe('Netflix')
  })

  it('prefers the more specific pattern when several match', () => {
    // Both AMAZON and AMAZON PRIME match; the longer one is the better answer.
    expect(matchMerchant('AMAZON PRIME*4X7QT', patterns)?.provider_name).toBe('Amazon Prime')
  })

  it('still matches the broader pattern when the specific one does not apply', () => {
    expect(matchMerchant('AMAZON MKTPLACE', patterns)?.provider_name).toBe('Amazon')
  })

  it('matches BNPL descriptions with a star separator', () => {
    expect(matchMerchant('KLARNA*TRAINERS LONDON', patterns)?.provider_name).toBe('Klarna')
  })

  it('supports regex patterns', () => {
    expect(matchMerchant('SKY DIGITAL 12345', patterns)?.provider_name).toBe('Sky')
  })

  it('does not match a regex anchored elsewhere', () => {
    expect(matchMerchant('BIG SKY RANCH', patterns)).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(matchMerchant('TESCO STORES 3291', patterns)).toBeNull()
  })

  it('survives a malformed regex in the table', () => {
    // One bad row must not take down the whole webhook batch.
    const bad = [{ id: 'x', pattern: '([unclosed', match_type: 'regex', provider_name: 'Broken' }]
    expect(() => matchMerchant('ANYTHING', bad)).not.toThrow()
    expect(matchMerchant('ANYTHING', bad)).toBeNull()
  })

  it('handles empty or missing inputs', () => {
    expect(matchMerchant('', patterns)).toBeNull()
    expect(matchMerchant('NETFLIX', null)).toBeNull()
    expect(matchMerchant('NETFLIX', [])).toBeNull()
  })
})

describe('buildSuggestion', () => {
  const transaction = { amount: 12.99, transacted_on: '2026-09-15' }

  it('builds a subscription suggestion from a streaming match', () => {
    const s = buildSuggestion({ transaction, pattern: patterns[0] })
    expect(s).toMatchObject({
      name: 'Netflix',
      type: 'subscription',
      cost_per_payment: 12.99,
      frequency: 'monthly',
      next_payment_date: '2026-10-15',
      category: 'Streaming',
      matched_pattern_id: 'p1',
    })
  })

  it('infers BNPL from the provider category, not the amount', () => {
    expect(buildSuggestion({ transaction, pattern: patterns[3] }).type).toBe('bnpl')
  })

  it('uses the absolute amount — Plaid reports outflows as positive or negative by institution', () => {
    expect(buildSuggestion({ transaction: { ...transaction, amount: -12.99 }, pattern: patterns[0] })
      .cost_per_payment).toBe(12.99)
  })

  it('returns null for a zero amount, which would fail the cost CHECK', () => {
    expect(buildSuggestion({ transaction: { ...transaction, amount: 0 }, pattern: patterns[0] })).toBeNull()
  })

  it('returns null without a transaction or pattern', () => {
    expect(buildSuggestion({ transaction: null, pattern: patterns[0] })).toBeNull()
    expect(buildSuggestion({ transaction, pattern: null })).toBeNull()
  })
})

describe('addOneMonth', () => {
  it('agrees with addMonthsClamped, which it deliberately restates', () => {
    // This file must stay dependency-free to run in Deno, so the clamping
    // rule is duplicated. This test is what stops the two drifting.
    for (const date of ['2026-01-31', '2026-02-28', '2026-12-31', '2028-01-31', '2026-09-15']) {
      expect(addOneMonth(date)).toBe(addMonthsClamped(date, 1))
    }
  })

  it('clamps 31 Jan to 28 Feb in a non-leap year', () => {
    expect(addOneMonth('2026-01-31')).toBe('2026-02-28')
  })

  it('rolls December into the next year', () => {
    expect(addOneMonth('2026-12-15')).toBe('2027-01-15')
  })
})

describe('findCancellationGuide', () => {
  const guides = [
    { provider_name: 'Netflix', cancel_url: 'https://www.netflix.com/cancelplan', steps: ['Open Account.'] },
    { provider_name: 'Klarna', cancel_url: null, steps: ['This is a debt, not a subscription.'] },
  ]

  it('finds a guide from a commitment name', () => {
    expect(findCancellationGuide('Netflix', patterns, guides)?.provider_name).toBe('Netflix')
  })

  it('matches a name the user typed loosely', () => {
    expect(findCancellationGuide('netflix standard', patterns, guides)?.provider_name).toBe('Netflix')
  })

  it('finds a BNPL guide', () => {
    expect(findCancellationGuide('Trainers (Klarna)', patterns, guides)?.provider_name).toBe('Klarna')
  })

  it('returns null when the pattern matches but no guide exists yet', () => {
    // 'Amazon' has a pattern but no guide in this list — a near-miss is worse
    // than nothing, so it must not fall back to another provider's steps.
    expect(findCancellationGuide('AMAZON MKTPLACE', patterns, guides)).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(findCancellationGuide('Local window cleaner', patterns, guides)).toBeNull()
  })

  it('handles empty or missing guides', () => {
    expect(findCancellationGuide('Netflix', patterns, [])).toBeNull()
    expect(findCancellationGuide('Netflix', patterns, null)).toBeNull()
  })
})
