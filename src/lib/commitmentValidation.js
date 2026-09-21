// The validation rules for a single commitment, in one place.
//
// Extracted from CommitmentForm so the CSV importer can apply exactly the
// same rules. Two copies of "what counts as a valid commitment" would drift,
// and the importer is precisely where a silently looser rule does damage.
//
// Pure and framework-free, like calculations.js.

import { COMMITMENT_TYPES, FREQUENCIES, STATUSES, CATEGORIES } from './constants.js'

export const BNPL_MODES = ['fixed', 'recurring']

/**
 * Validates a draft commitment. Returns null when it is fine, or a single
 * message — one problem at a time, most-fixable first, matching the form's
 * existing behaviour rather than presenting a wall of errors.
 */
export function validateCommitment(draft) {
  if (!String(draft?.name ?? '').trim()) {
    return 'Give it a name so you can recognise it later.'
  }

  if (!COMMITMENT_TYPES.includes(draft.type)) {
    return `Type needs to be one of: ${COMMITMENT_TYPES.join(', ')}.`
  }

  const cost = Number(draft.costPerPayment)
  if (draft.costPerPayment === '' || draft.costPerPayment === null || Number.isNaN(cost) || cost <= 0) {
    return 'Cost per payment needs to be a number greater than 0.'
  }

  if (!FREQUENCIES.includes(draft.frequency)) {
    return `Frequency needs to be one of: ${FREQUENCIES.join(', ')}.`
  }

  if (!draft.nextPaymentDate) {
    return 'Next payment / renewal date is required.'
  }
  if (!isIsoDate(draft.nextPaymentDate)) {
    return 'Next payment / renewal date needs to be a real date in YYYY-MM-DD form.'
  }

  if (draft.type === 'bnpl') {
    const remaining = Number(draft.instalmentsRemaining)
    if (
      draft.instalmentsRemaining === '' ||
      draft.instalmentsRemaining === null ||
      draft.instalmentsRemaining === undefined ||
      Number.isNaN(remaining) ||
      remaining < 0
    ) {
      return 'Instalments remaining needs to be 0 or more.'
    }
    if (!Number.isInteger(remaining)) {
      return 'Instalments remaining needs to be a whole number.'
    }
    if (draft.bnplMode !== undefined && !BNPL_MODES.includes(draft.bnplMode)) {
      return `BNPL mode needs to be one of: ${BNPL_MODES.join(', ')}.`
    }
  }

  if (draft.totalOriginalAmount !== null && draft.totalOriginalAmount !== undefined && draft.totalOriginalAmount !== '') {
    const total = Number(draft.totalOriginalAmount)
    if (Number.isNaN(total) || total < 0) {
      return 'Original amount needs to be a number of 0 or more.'
    }
  }

  // Category is checked against the same four values the database CHECK
  // constrains, so an import cannot create a row Postgres will reject.
  if (!CATEGORIES.includes(draft.category)) {
    return `Category needs to be one of: ${CATEGORIES.join(', ')}.`
  }

  if (draft.status !== undefined && !STATUSES.includes(draft.status)) {
    return `Status needs to be one of: ${STATUSES.join(', ')}.`
  }

  return null
}

/**
 * A real calendar date in YYYY-MM-DD. `new Date('2026-02-31')` rolls over to
 * March rather than failing, so the parsed date is compared back to the
 * input instead of merely checking it parsed.
 */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

/**
 * Coerces a validated draft into the canonical Commitment shape — numbers as
 * numbers, BNPL-only fields nulled out for subscriptions. Run this only on a
 * draft that has already passed validateCommitment.
 */
export function normaliseCommitment(draft) {
  const isBnpl = draft.type === 'bnpl'
  return {
    name: String(draft.name).trim(),
    type: draft.type,
    costPerPayment: Number(draft.costPerPayment),
    frequency: draft.frequency,
    nextPaymentDate: draft.nextPaymentDate,
    totalOriginalAmount:
      draft.totalOriginalAmount === '' || draft.totalOriginalAmount === null || draft.totalOriginalAmount === undefined
        ? null
        : Number(draft.totalOriginalAmount),
    instalmentsRemaining: isBnpl ? Number(draft.instalmentsRemaining) : null,
    bnplMode: isBnpl ? draft.bnplMode || 'fixed' : 'fixed',
    status: draft.status || 'active',
    category: draft.category,
  }
}
