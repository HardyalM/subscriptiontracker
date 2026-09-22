// Turning a failed write into something a person can act on.
//
// Supabase surfaces PostgREST and Postgres errors verbatim: a violated CHECK
// arrives as 'new row for relation "commitments" violates check constraint
// "commitments_cost_per_payment_check"'. That is the right thing to put in a
// log and the wrong thing to put in front of someone tracking their money.
//
// Pure and framework-free, tested like the rest of lib/. Same job as
// describeAuthError in authValidation.js.

/**
 * Maps the specific constraint names this schema defines onto the rule the
 * user actually broke. Anything unlisted falls back to a generic message
 * rather than leaking the constraint name.
 */
const CONSTRAINT_MESSAGES = {
  commitments_cost_per_payment_check: 'Cost per payment has to be more than £0.',
  commitments_bnpl_fields_match_type:
    'A BNPL plan needs a number of instalments remaining, and a subscription must not have one.',
  commitments_bnpl_mode_matches_type: 'Only BNPL plans can be set to recurring.',
  commitments_cancelled_at_matches_status: "A commitment can't have a cancellation date while it's active.",
  commitments_category_check: "That category isn't one this app recognises.",
  commitments_frequency_check: "That payment frequency isn't one this app recognises.",
  commitments_type_check: 'A commitment has to be either a subscription or a BNPL plan.',
  commitments_name_check: 'Give it a name so you can recognise it later.',
  commitments_status_check: 'A commitment has to be either active or cancelled.',
  commitments_instalments_remaining_check: 'Instalments remaining has to be 0 or more.',
  commitments_total_original_amount_check: 'The original amount has to be 0 or more.',
  commitments_bnpl_mode_check: 'A BNPL plan has to be either fixed or recurring.',
  decision_log_decision_check: 'A decision has to be either kept or reconsidered.',
  decision_log_amount_check: "A decision's amount has to be 0 or more.",
}

// Every CHECK constraint the schema defines, as of the Phase 9 audit. This
// list exists so the test below fails when a migration adds a constraint
// nobody wrote a message for — otherwise the new failure silently degrades
// to the generic fallback and nobody notices until a user hits it.
export const KNOWN_CHECK_CONSTRAINTS = Object.keys(CONSTRAINT_MESSAGES)

/**
 * @returns {string} a sentence safe to show a user.
 */
export function describeWriteError(error) {
  if (!error) return ''

  const code = String(error.code ?? '')
  const message = String(error.message ?? '')

  // A violated CHECK — name the rule that was broken where we know it.
  if (code === '23514') {
    for (const [constraint, text] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (message.includes(constraint)) return text
    }
    return "Something in that didn't pass one of the app's rules."
  }

  if (code === '23505') return 'That already exists.'
  if (code === '23503') return "That refers to something that no longer exists — try reloading."

  // Most often this app's own fault: a write fired before the workspace
  // finished loading, so a required column arrived empty.
  if (code === '23502') return "Something required was missing. Reload the page and try again."

  // RLS refused it, or the table grants do not allow it.
  if (code === '42501') return "You don't have permission to change that."

  // PostgREST's expired/invalid JWT codes.
  if (code === 'PGRST301' || code === '401' || /jwt|token/i.test(message)) {
    return 'Your session expired. Sign in again and your changes will save.'
  }

  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again."
  }

  return message || 'Something went wrong saving that.'
}

/**
 * Whether retrying the identical request could plausibly succeed.
 *
 * A violated constraint will fail the same way every time, so offering
 * "Try again" there is a lie — the input has to change. A dropped
 * connection is worth retrying.
 */
export function isRetryable(error) {
  if (!error) return false
  const code = String(error.code ?? '')
  const message = String(error.message ?? '')

  if (['23514', '23505', '23503', '42501'].includes(code)) return false
  if (/jwt|token/i.test(message) || code === 'PGRST301') return false
  return true
}
