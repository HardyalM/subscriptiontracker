// Pure, framework-free validation for the sign-in / sign-up form.
//
// Same shape as calculations.js and tested the same way: no React, no DOM, no
// network. Keeping it separate from the screen means the rules are checked by
// the test suite rather than only by clicking through the UI.

/** Supabase Auth's own floor. Enforcing it here turns a round-trip into an
 *  instant inline message. */
export const MIN_PASSWORD_LENGTH = 6

/**
 * Deliberately permissive. The authoritative check is the confirmation email
 * actually arriving; a stricter regex here would only reject valid addresses
 * (new TLDs, plus-addressing, apostrophes) for no real gain.
 */
export function isValidEmail(email) {
  const value = String(email ?? '').trim()
  if (value.length === 0 || value.length > 254) return false
  if (/\s/.test(value)) return false
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(value)
}

/**
 * Validates one auth submission. Returns null when it's fine, or a single
 * calm, specific message — the same one-error-at-a-time approach
 * CommitmentForm already uses, rather than a wall of red.
 *
 * @param {{mode: 'sign-in'|'sign-up', email: string, password: string, confirmPassword?: string}} input
 * @returns {string|null}
 */
export function validateAuthForm({ mode, email, password, confirmPassword }) {
  if (!String(email ?? '').trim()) return 'Enter your email address.'
  if (!isValidEmail(email)) return "That doesn't look like an email address."
  if (!password) return 'Enter your password.'

  // Length is only enforced on sign-up. On sign-in an old short password
  // should fail against the server, not be blocked before it's even tried.
  if (mode === 'sign-up') {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
    }
    if (password !== confirmPassword) return "Those passwords don't match."
  }

  return null
}

/**
 * Turns a Supabase auth error into something worth reading. Supabase's own
 * strings are short but technical ("Invalid login credentials"), and the
 * fallback keeps the app's calm, factual tone rather than surfacing a raw
 * status code.
 */
export function describeAuthError(error) {
  if (!error) return null
  const message = String(error.message ?? '')

  if (/invalid login credentials/i.test(message)) {
    return 'That email and password combination does not match an account.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email address first — check your inbox for the link.'
  }
  if (/user already registered|already been registered/i.test(message)) {
    return 'An account already exists for that email. Sign in instead.'
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts just now. Wait a minute and try again.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  return message || 'Something went wrong. Try again.'
}
