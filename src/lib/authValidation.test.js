import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  validateAuthForm,
  describeAuthError,
  MIN_PASSWORD_LENGTH,
} from './authValidation.js'

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('someone@example.com')).toBe(true)
  })

  it('accepts plus-addressing and subdomains', () => {
    expect(isValidEmail('someone+tag@mail.example.co.uk')).toBe(true)
  })

  it('trims surrounding whitespace before judging', () => {
    expect(isValidEmail('  someone@example.com  ')).toBe(true)
  })

  it('rejects an address with no domain dot', () => {
    expect(isValidEmail('someone@localhost')).toBe(false)
  })

  it('rejects an address with no @', () => {
    expect(isValidEmail('someone.example.com')).toBe(false)
  })

  it('rejects internal whitespace', () => {
    expect(isValidEmail('some one@example.com')).toBe(false)
  })

  it('rejects empty and nullish input without throwing', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
  })
})

describe('validateAuthForm — sign in', () => {
  const base = { mode: 'sign-in', email: 'someone@example.com', password: 'hunter2' }

  it('passes a well-formed submission', () => {
    expect(validateAuthForm(base)).toBeNull()
  })

  it('asks for the email when it is blank', () => {
    expect(validateAuthForm({ ...base, email: '   ' })).toMatch(/email/i)
  })

  it('asks for the password when it is blank', () => {
    expect(validateAuthForm({ ...base, password: '' })).toMatch(/password/i)
  })

  it('does not enforce a minimum length on sign in', () => {
    // An account created before a policy change may have a shorter password.
    // Blocking it client-side would lock the owner out of their own data.
    expect(validateAuthForm({ ...base, password: 'abc' })).toBeNull()
  })

  it('ignores confirmPassword entirely', () => {
    expect(validateAuthForm({ ...base, confirmPassword: 'something-else' })).toBeNull()
  })
})

describe('validateAuthForm — sign up', () => {
  const base = {
    mode: 'sign-up',
    email: 'someone@example.com',
    password: 'longenough',
    confirmPassword: 'longenough',
  }

  it('passes a well-formed submission', () => {
    expect(validateAuthForm(base)).toBeNull()
  })

  it('enforces the minimum password length', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
    const result = validateAuthForm({ ...base, password: short, confirmPassword: short })
    expect(result).toMatch(new RegExp(`${MIN_PASSWORD_LENGTH} characters`))
  })

  it('accepts a password of exactly the minimum length', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(validateAuthForm({ ...base, password: exact, confirmPassword: exact })).toBeNull()
  })

  it('rejects mismatched confirmation', () => {
    expect(validateAuthForm({ ...base, confirmPassword: 'different' })).toMatch(/match/i)
  })

  it('reports the bad email before the bad password', () => {
    // One message at a time, most-fixable first — same approach as CommitmentForm.
    const result = validateAuthForm({ ...base, email: 'nope', password: 'x', confirmPassword: 'y' })
    expect(result).toMatch(/email address/i)
  })
})

describe('describeAuthError', () => {
  it('returns null for no error', () => {
    expect(describeAuthError(null)).toBeNull()
  })

  it('rewrites invalid credentials into plain language', () => {
    const result = describeAuthError({ message: 'Invalid login credentials' })
    expect(result).toMatch(/does not match an account/i)
  })

  it('explains an unconfirmed email', () => {
    expect(describeAuthError({ message: 'Email not confirmed' })).toMatch(/check your inbox/i)
  })

  it('points an already-registered email at sign in', () => {
    expect(describeAuthError({ message: 'User already registered' })).toMatch(/sign in instead/i)
  })

  it('explains a network failure without jargon', () => {
    expect(describeAuthError({ message: 'Failed to fetch' })).toMatch(/check your connection/i)
  })

  it('passes through an unrecognised message rather than swallowing it', () => {
    expect(describeAuthError({ message: 'Signups not allowed for this instance' }))
      .toBe('Signups not allowed for this instance')
  })

  it('falls back to a calm default when there is no message', () => {
    expect(describeAuthError({})).toMatch(/something went wrong/i)
  })
})
