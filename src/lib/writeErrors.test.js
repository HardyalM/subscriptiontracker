import { describe, it, expect } from 'vitest'
import { describeWriteError, isRetryable, KNOWN_CHECK_CONSTRAINTS } from './writeErrors.js'

const pgError = (code, message = '') => ({ code, message })

describe('describeWriteError', () => {
  it('returns an empty string for no error', () => {
    expect(describeWriteError(null)).toBe('')
    expect(describeWriteError(undefined)).toBe('')
  })

  it('names the rule for a known CHECK violation', () => {
    const e = pgError('23514', 'new row for relation "commitments" violates check constraint "commitments_cost_per_payment_check"')
    expect(describeWriteError(e)).toMatch(/more than £0/)
  })

  it('explains the BNPL/subscription asymmetry in plain words', () => {
    const e = pgError('23514', 'violates check constraint "commitments_bnpl_fields_match_type"')
    expect(describeWriteError(e)).toMatch(/instalments remaining/i)
  })

  it('never leaks a constraint name for an unknown CHECK', () => {
    const e = pgError('23514', 'violates check constraint "some_future_constraint"')
    const result = describeWriteError(e)
    expect(result).not.toMatch(/some_future_constraint/)
    expect(result).toMatch(/rules/i)
  })

  it('explains a not-null violation as a reload-worthy app fault', () => {
    expect(describeWriteError(pgError('23502'))).toMatch(/reload/i)
  })

  it('explains an RLS refusal as permission', () => {
    expect(describeWriteError(pgError('42501'))).toMatch(/permission/i)
  })

  it('tells the user to sign in again on an expired token', () => {
    expect(describeWriteError(pgError('PGRST301'))).toMatch(/sign in again/i)
    expect(describeWriteError(pgError('', 'JWT expired'))).toMatch(/sign in again/i)
  })

  it('explains a network failure without jargon', () => {
    expect(describeWriteError(pgError('', 'Failed to fetch'))).toMatch(/connection/i)
  })

  it('falls back to the raw message rather than swallowing it', () => {
    expect(describeWriteError(pgError('', 'Some novel failure'))).toBe('Some novel failure')
  })

  it('falls back to a calm default when there is no message at all', () => {
    expect(describeWriteError({})).toMatch(/something went wrong/i)
  })
})

describe('isRetryable', () => {
  it('is false for constraint violations — retrying cannot help', () => {
    // Offering "Try again" on a rule violation is a lie: the input has to
    // change before it can ever succeed.
    expect(isRetryable(pgError('23514'))).toBe(false)
    expect(isRetryable(pgError('23505'))).toBe(false)
    expect(isRetryable(pgError('42501'))).toBe(false)
  })

  it('is false for an expired session — signing in is the fix', () => {
    expect(isRetryable(pgError('PGRST301'))).toBe(false)
    expect(isRetryable(pgError('', 'JWT expired'))).toBe(false)
  })

  it('is true for a network failure', () => {
    expect(isRetryable(pgError('', 'Failed to fetch'))).toBe(true)
  })

  it('is true for an unknown error, which may be transient', () => {
    expect(isRetryable(pgError('', 'Some novel failure'))).toBe(true)
  })

  it('is false for no error', () => {
    expect(isRetryable(null)).toBe(false)
  })
})

describe('constraint coverage', () => {
  // Verified against the live schema during the Phase 9 audit: these are
  // every CHECK on commitments and decision_log. If a migration adds one,
  // add it here and give it a message — otherwise the user gets the generic
  // fallback and the specific reason is lost.
  const LIVE_SCHEMA_CHECKS = [
    'commitments_bnpl_fields_match_type',
    'commitments_bnpl_mode_check',
    'commitments_bnpl_mode_matches_type',
    'commitments_cancelled_at_matches_status',
    'commitments_category_check',
    'commitments_cost_per_payment_check',
    'commitments_frequency_check',
    'commitments_instalments_remaining_check',
    'commitments_name_check',
    'commitments_status_check',
    'commitments_total_original_amount_check',
    'commitments_type_check',
    'decision_log_amount_check',
    'decision_log_decision_check',
  ]

  it('has a plain-language message for every CHECK in the schema', () => {
    const missing = LIVE_SCHEMA_CHECKS.filter((c) => !KNOWN_CHECK_CONSTRAINTS.includes(c))
    expect(missing).toEqual([])
  })

  it('maps each one to a real sentence, not an empty string', () => {
    for (const constraint of LIVE_SCHEMA_CHECKS) {
      const result = describeWriteError({ code: '23514', message: `violates check constraint "${constraint}"` })
      expect(result.length).toBeGreaterThan(10)
      expect(result).not.toMatch(/constraint/i)
    }
  })
})
