// Pure, framework-free calculation logic for the Commitment model.
// Deliberately has zero imports from React/DOM so it can be unit-tested with
// plain `node` and reused as-is if this ever moves to a backend.

import { RENEWAL_WINDOW_DAYS } from './constants.js'

/**
 * @typedef {Object} Commitment
 * @property {string} id
 * @property {string} name
 * @property {'subscription'|'bnpl'} type
 * @property {number} costPerPayment
 * @property {'weekly'|'monthly'|'one-off installments'} frequency
 * @property {string} nextPaymentDate   ISO date string, e.g. "2026-09-28"
 * @property {number} [totalOriginalAmount]   BNPL only
 * @property {number} [instalmentsRemaining]  BNPL only
 * @property {'fixed'|'recurring'} [bnplMode]  BNPL only; absent means 'fixed'
 * @property {'active'|'cancelled'} status
 * @property {string} category
 * @property {{date: string, decision: 'kept'|'reconsidered', amount?: number}[]} decisionLog
 */

/**
 * Normalise a date-ish value to a midnight Date so day-diffs aren't thrown
 * off by time-of-day.
 */
export function toMidnight(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Whole days between `today` and `dateInput` (positive = in the future,
 * negative = overdue).
 */
export function daysUntil(dateInput, today = new Date()) {
  const start = toMidnight(today)
  const end = toMidnight(dateInput)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / msPerDay)
}

/**
 * Add whole days to a date-ish value, returning an ISO date string.
 */
export function addDays(dateInput, days) {
  const d = toMidnight(dateInput)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/**
 * Add whole calendar months, clamped to the target month's last day (so
 * 31 Jan + 1 month lands on 28/29 Feb, not rolling into March). Returns an
 * ISO date string.
 */
export function addMonthsClamped(dateInput, months) {
  const d = toMidnight(dateInput)
  const targetIndex = d.getMonth() + months
  const targetYear = d.getFullYear() + Math.floor(targetIndex / 12)
  const targetMonth = ((targetIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d.getDate(), lastDayOfTargetMonth)
  return toIsoDate(new Date(targetYear, targetMonth, day))
}

/**
 * Advance a date to its next cycle for a given frequency. 'one-off
 * installments' has no defined cadence, so it's returned unchanged —
 * callers decide what that means for them (see `applyKeepDecision`).
 */
export function advanceDate(dateInput, frequency) {
  if (frequency === 'weekly') return addDays(dateInput, 7)
  if (frequency === 'monthly') return addMonthsClamped(dateInput, 1)
  return toIsoDate(toMidnight(dateInput))
}

/**
 * Annualised cost of a *subscription* commitment — this is the present-bias
 * reframe: what the recurring payment actually adds up to over a year.
 * Not meaningful for BNPL (use `remainingBnplBalance` instead), so returns
 * null for bnpl commitments rather than silently producing a wrong number.
 */
export function annualisedCost(commitment) {
  if (commitment.type !== 'subscription') return null
  const cost = Number(commitment.costPerPayment) || 0
  switch (commitment.frequency) {
    case 'weekly':
      return cost * 52
    case 'monthly':
      return cost * 12
    case 'one-off installments':
      // Edge case: a subscription flagged as one-off installments has no
      // stable annual rate. Fall back to the raw payment amount so the UI
      // still has a number to show, rather than crashing on null math.
      return cost
    default:
      return cost * 12
  }
}

/**
 * Remaining committed balance on a BNPL plan — the payment-decoupling
 * reframe: what's still owed across the instalments left, surfaced as one
 * number instead of a series of small payments.
 */
export function remainingBnplBalance(commitment) {
  if (commitment.type !== 'bnpl') return null
  const cost = Number(commitment.costPerPayment) || 0
  const remaining = Number(commitment.instalmentsRemaining) || 0
  return cost * remaining
}

/**
 * How much of a BNPL plan has been paid off so far, using the
 * totalOriginalAmount the user entered. Returns null when that field
 * wasn't provided (it's optional), so callers can tell "no data" apart
 * from "£0 paid".
 */
export function bnplPaidSoFar(commitment) {
  if (commitment.type !== 'bnpl') return null
  const total = Number(commitment.totalOriginalAmount)
  if (!total || total <= 0) return null
  const remaining = remainingBnplBalance(commitment) || 0
  return Math.max(0, Math.min(total, total - remaining))
}

/**
 * The one number the app is built around: total annualised exposure across
 * every active commitment right now (subscriptions' annualised cost +
 * BNPL remaining balances).
 */
export function totalAnnualExposure(commitments) {
  return commitments
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => {
      if (c.type === 'subscription') return sum + (annualisedCost(c) || 0)
      if (c.type === 'bnpl') return sum + (remainingBnplBalance(c) || 0)
      return sum
    }, 0)
}

/**
 * Per-payment cost, for the "side by side" dashboard display.
 */
export function perPaymentCost(commitment) {
  return Number(commitment.costPerPayment) || 0
}

/**
 * "What this one commitment currently contributes" — annualised cost for
 * subscriptions, remaining balance for BNPL. Used for both the dashboard's
 * second figure and the renewal checkpoint copy.
 */
export function exposureFor(commitment) {
  return commitment.type === 'subscription'
    ? annualisedCost(commitment)
    : remainingBnplBalance(commitment)
}

/**
 * True if a BNPL plan has nothing left to pay. A finished plan shouldn't
 * keep surfacing in the renewal checkpoint just because its last-known
 * date is nearby.
 */
function isBnplFullyPaid(commitment) {
  return commitment.type === 'bnpl' && (Number(commitment.instalmentsRemaining) || 0) <= 0
}

/**
 * True if an active commitment needs attention: due within the renewal
 * window (default 7 days) — including today — OR already overdue.
 * Overdue is deliberately included: a commitment whose date has silently
 * passed is a worse failure mode than one flagged a few days early, since
 * it would otherwise vanish from the checkpoint with no resolution.
 */
export function isRenewingSoon(commitment, today = new Date(), windowDays = RENEWAL_WINDOW_DAYS) {
  if (commitment.status !== 'active') return false
  if (isBnplFullyPaid(commitment)) return false
  const days = daysUntil(commitment.nextPaymentDate, today)
  return days <= windowDays
}

/**
 * Active commitments needing attention, most overdue/soonest first.
 */
export function getRenewalCheckpointItems(commitments, today = new Date(), windowDays = RENEWAL_WINDOW_DAYS) {
  return commitments
    .filter((c) => isRenewingSoon(c, today, windowDays))
    .sort((a, b) => daysUntil(a.nextPaymentDate, today) - daysUntil(b.nextPaymentDate, today))
}

function dayPhrase(days) {
  if (days < 0) {
    const n = Math.abs(days)
    return { overdue: true, text: `${n} day${n === 1 ? '' : 's'} overdue` }
  }
  if (days === 0) return { overdue: false, text: 'today' }
  if (days === 1) return { overdue: false, text: 'in 1 day' }
  return { overdue: false, text: `in ${days} days` }
}

/**
 * Calm, factual renewal-checkpoint copy — never alarmist, even when
 * something is overdue.
 * e.g. "Renews in 4 days — you'll have paid £156 on this over the past year."
 * e.g. "3 days overdue — you'll have paid £156 on this over the past year."
 */
export function renewalCopy(commitment, today = new Date(), formatCurrency = formatGBP) {
  const days = daysUntil(commitment.nextPaymentDate, today)
  const { overdue, text } = dayPhrase(days)
  const amount = formatCurrency(exposureFor(commitment) || 0)

  if (commitment.type === 'bnpl') {
    return overdue
      ? `${text} — ${amount} left to pay on this plan.`
      : `Next instalment due ${text} — ${amount} left to pay on this plan.`
  }
  return overdue
    ? `Renewal ${text} — you'll have paid ${amount} on this over the past year.`
    : `Renews ${text} — you'll have paid ${amount} on this over the past year.`
}

/**
 * What changes when someone taps "Keep it" in the renewal checkpoint —
 * this is the fix for renewal dates silently going stale. Keeping a
 * subscription means it renews and moves on to its next cycle; keeping a
 * BNPL plan means logging that instalment as paid and moving to the next
 * one. Returns a partial patch to merge into the commitment (never mutates
 * its input).
 *
 * 'one-off installments' has no defined cadence, so nothing is advanced
 * for it — the date is left for manual editing.
 */
export function applyKeepDecision(commitment) {
  if (commitment.type === 'subscription') {
    if (commitment.frequency !== 'weekly' && commitment.frequency !== 'monthly') return {}
    return { nextPaymentDate: advanceDate(commitment.nextPaymentDate, commitment.frequency) }
  }

  // BNPL: one instalment further along.
  //
  // A 'recurring' plan is an open-ended credit line rather than a fixed
  // block of instalments, so it never comes to rest at zero — when the last
  // instalment of a block is paid, the next block starts. Anything not
  // explicitly marked recurring is treated as 'fixed', which is both the
  // column default and the behaviour every existing commitment already has.
  const isRecurring = commitment.bnplMode === 'recurring'
  const current = Number(commitment.instalmentsRemaining) || 0
  const decremented = Math.max(0, current - 1)
  const remaining = isRecurring && decremented === 0 ? current : decremented

  const patch = { instalmentsRemaining: remaining }
  if (commitment.frequency === 'weekly' || commitment.frequency === 'monthly') {
    patch.nextPaymentDate = advanceDate(commitment.nextPaymentDate, commitment.frequency)
  }
  return patch
}

/**
 * Sum annualised exposure per category, for the category breakdown chart.
 * Only active commitments are counted, and categories with no active spend
 * are omitted (a zero-height bar with a legend entry is noise, not signal).
 */
export function categoryBreakdown(commitments) {
  const totals = new Map()
  for (const c of commitments) {
    if (c.status !== 'active') continue
    const amount = exposureFor(c) || 0
    const key = c.category || 'Other'
    totals.set(key, (totals.get(key) || 0) + amount)
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Running kept-vs-reconsidered tally across every commitment's decision log
 * — the bit that makes the renewal checkpoint a commitment device rather
 * than just a reminder.
 */
export function decisionTally(commitments) {
  let kept = 0
  let reconsidered = 0
  for (const c of commitments) {
    for (const entry of c.decisionLog || []) {
      if (entry.decision === 'kept') kept += 1
      else if (entry.decision === 'reconsidered') reconsidered += 1
    }
  }
  return { kept, reconsidered }
}

/**
 * Cumulative £ value of every "reconsidered" tap — the scoreboard version
 * of the commitment device. Each decision log entry captures its own
 * `amount` at the moment it was logged (see App.jsx); older entries
 * without one fall back to the commitment's current exposure so the total
 * still makes sense rather than silently under-counting.
 */
export function reconsideredSavingsTotal(commitments) {
  let total = 0
  for (const c of commitments) {
    for (const entry of c.decisionLog || []) {
      if (entry.decision !== 'reconsidered') continue
      total += typeof entry.amount === 'number' ? entry.amount : exposureFor(c) || 0
    }
  }
  return total
}

/**
 * Total annualised exposure at the end of each of the last `monthsBack`
 * months, oldest first — the series behind the trend chart.
 *
 * A commitment counts towards a month if it existed by the end of it
 * (`createdAt`) and had not been cancelled by then (`cancelledAt`). This is
 * deliberately computed here rather than in a Postgres view: the weekly/
 * monthly annualisation multipliers live in annualisedCost(), and a view
 * would have to restate them in SQL, leaving two copies of the same rule to
 * drift apart.
 *
 * Honest limitation: a commitment cancelled before `cancelled_at` existed
 * has no cancellation date, so it is left out of every month rather than
 * being given an invented one. Better a slightly short series than a
 * confidently wrong one.
 *
 * @returns {{month: string, exposure: number}[]} month as 'YYYY-MM'
 */
export function exposureTrend(commitments, monthsBack = 12, today = new Date()) {
  const anchor = toMidnight(today)
  const points = []

  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    // End of the month that many months back — day 0 of the following month.
    const end = new Date(anchor.getFullYear(), anchor.getMonth() - offset + 1, 0)
    const month = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`

    const exposure = commitments.reduce((sum, c) => {
      if (!countsInMonth(c, end)) return sum
      return sum + (exposureFor(c) || 0)
    }, 0)

    points.push({ month, exposure })
  }

  return points
}

function countsInMonth(commitment, monthEnd) {
  const created = commitment.createdAt ? toMidnight(commitment.createdAt) : null
  if (created && created.getTime() > monthEnd.getTime()) return false

  if (commitment.status === 'cancelled') {
    // No cancellation date recorded — see the note on exposureTrend.
    if (!commitment.cancelledAt) return false
    if (toMidnight(commitment.cancelledAt).getTime() <= monthEnd.getTime()) return false
  }

  return true
}

export function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}
