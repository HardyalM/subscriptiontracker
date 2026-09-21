// Shared enums for the Commitment data model.
// Kept as plain string unions (not TS) to match the rest of the JSX stack.

export const COMMITMENT_TYPES = ['subscription', 'bnpl']

export const FREQUENCIES = ['weekly', 'monthly', 'one-off installments']

export const STATUSES = ['active', 'cancelled']

// Category breakdown groups (spec: streaming, retail BNPL, other subscriptions).
// "Other" is kept as an escape hatch so the form never blocks on a bad fit.
export const CATEGORIES = ['Streaming', 'Retail BNPL', 'Other subscriptions', 'Other']

// Sensible default category per type, used to pre-fill the form.
export function defaultCategoryFor(type) {
  return type === 'bnpl' ? 'Retail BNPL' : 'Other subscriptions'
}

export const RENEWAL_WINDOW_DAYS = 7

export const DECISIONS = ['kept', 'reconsidered']
