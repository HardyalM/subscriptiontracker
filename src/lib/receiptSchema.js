// Validation for what the model returns when parsing a receipt.
//
// An LLM's output is untrusted input. It can hallucinate a field, return a
// number as a string, invent a date that does not exist, or wrap its JSON in
// a markdown fence. Every one of those must be a clean parsing failure, not a
// half-populated form — a receipt parser that quietly gets the amount wrong
// is worse than one that says it could not read the receipt.
//
// Pure and dependency-free so the same code runs in the browser and in a Deno
// Edge Function. The Edge Function ships a copy of this exact file.

export const MAX_PAYMENTS = 36

/**
 * Models sometimes wrap JSON in ```json fences despite being told not to.
 * Stripping them is cheap and turns a common, harmless formatting habit into
 * a success rather than a failure the user has to retry.
 */
export function stripCodeFence(text) {
  const trimmed = String(text ?? '').trim()
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/)
  return fenced ? fenced[1].trim() : trimmed
}

/**
 * Parses and validates the model's response.
 *
 * @returns {{ok: true, value: object} | {ok: false, reason: string}}
 */
export function parseReceiptResponse(rawText) {
  let parsed
  try {
    parsed = JSON.parse(stripCodeFence(rawText))
  } catch {
    return fail('The model did not return readable JSON.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail('The model did not return an object.')
  }

  // A deliberate escape hatch: the model is told to say so when the image is
  // not a receipt, rather than inventing a plausible-looking one.
  if (parsed.not_a_receipt === true) {
    return fail("That doesn't look like a receipt or order confirmation.")
  }

  const merchant = typeof parsed.merchant === 'string' ? parsed.merchant.trim() : ''
  if (!merchant) return fail('No merchant name could be read.')
  if (merchant.length > 120) return fail('The merchant name was implausibly long.')

  const totalAmount = toFiniteNumber(parsed.total_amount)
  if (totalAmount === null) return fail('No total amount could be read.')
  if (totalAmount <= 0) return fail('The total amount was not a positive number.')
  if (totalAmount > 1_000_000) return fail('The total amount was implausibly large.')

  if (!Array.isArray(parsed.payments) || parsed.payments.length === 0) {
    return fail('No payment schedule could be read.')
  }
  if (parsed.payments.length > MAX_PAYMENTS) {
    return fail('The payment schedule had implausibly many entries.')
  }

  const payments = []
  for (const entry of parsed.payments) {
    if (!entry || typeof entry !== 'object') return fail('A payment entry was malformed.')

    if (!isIsoDate(entry.date)) return fail(`"${String(entry.date)}" is not a valid date.`)

    const amount = toFiniteNumber(entry.amount)
    if (amount === null || amount <= 0) return fail('A payment amount was not a positive number.')

    payments.push({ date: entry.date, amount })
  }

  payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    ok: true,
    value: {
      merchant,
      totalAmount,
      currency: typeof parsed.currency === 'string' ? parsed.currency.toUpperCase() : 'GBP',
      payments,
    },
  }
}

/**
 * Turns a validated result into a draft for CommitmentForm.
 *
 * A single payment is a one-off; several equal payments spaced out are a BNPL
 * plan. Nothing here is written to the database — the user reviews and
 * confirms it in the normal form, exactly as if they had typed it.
 */
export function toCommitmentDraft(receipt, today = new Date()) {
  const upcoming = receipt.payments.filter((p) => p.date >= toIso(today))
  const remaining = upcoming.length > 0 ? upcoming : receipt.payments
  const isInstalmentPlan = receipt.payments.length > 1

  return {
    name: receipt.merchant,
    type: isInstalmentPlan ? 'bnpl' : 'subscription',
    costPerPayment: remaining[0].amount,
    frequency: isInstalmentPlan ? inferFrequency(receipt.payments) : 'monthly',
    nextPaymentDate: remaining[0].date,
    totalOriginalAmount: receipt.totalAmount,
    instalmentsRemaining: isInstalmentPlan ? upcoming.length : null,
    bnplMode: 'fixed',
    category: isInstalmentPlan ? 'Retail BNPL' : 'Other subscriptions',
    status: 'active',
  }
}

/**
 * Gap between the first two payments, snapped to the cadences this app
 * supports. Anything that is neither weekly-ish nor monthly-ish falls back to
 * 'one-off installments', which is the honest answer for a schedule the app
 * cannot express rather than a wrong one it can.
 */
export function inferFrequency(payments) {
  if (payments.length < 2) return 'monthly'

  const days = Math.round(
    (Date.parse(payments[1].date) - Date.parse(payments[0].date)) / 86_400_000,
  )

  if (days >= 5 && days <= 9) return 'weekly'
  if (days >= 26 && days <= 33) return 'monthly'
  if (days >= 12 && days <= 16) return 'one-off installments' // fortnightly: no such cadence here
  return 'one-off installments'
}

function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  // Models often return "12.99" or "£12.99" despite being asked for a number.
  if (typeof value === 'string') {
    const cleaned = value.replace(/[£$€,\s]/g, '')
    if (cleaned === '') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

function toIso(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fail(reason) {
  return { ok: false, reason }
}
