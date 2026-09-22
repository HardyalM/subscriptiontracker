// What goes in a due-soon alert email.
//
// Pure and dependency-free so the same code runs in the browser and in a Deno
// Edge Function, and so the email's contents are covered by tests rather than
// only observable by sending one. The Edge Function ships a copy of this file.

export const ALERT_WINDOW_DAYS = 2

/**
 * Active commitments due within the window, soonest first.
 *
 * Overdue items are excluded on purpose. An alert exists to give someone
 * time to act before money moves; an email about a payment that already left
 * the account is noise, and the app's own renewal checkpoint already shows
 * overdue items when they open it.
 */
export function commitmentsDueWithin(commitments, days = ALERT_WINDOW_DAYS, today = new Date()) {
  const start = toIso(today)
  const end = toIso(addDays(today, days))

  return commitments
    .filter((c) => c.status === 'active')
    .filter((c) => c.next_payment_date >= start && c.next_payment_date <= end)
    .sort((a, b) => (a.next_payment_date < b.next_payment_date ? -1 : 1))
}

/**
 * Subject and body for the alert.
 *
 * Deliberately plain text and deliberately calm — the same register as the
 * renewal checkpoint. It states what is due and when, and does not tell
 * anyone what to do about it. No tracking pixel, no marketing, one link back
 * to the app.
 */
export function buildAlertEmail(due, { appUrl = '' } = {}) {
  if (!Array.isArray(due) || due.length === 0) return null

  const total = due.reduce((sum, c) => sum + (Number(c.cost_per_payment) || 0), 0)

  const subject =
    due.length === 1
      ? `${due[0].name} — ${formatGBP(Number(due[0].cost_per_payment) || 0)} due ${describeDay(due[0].next_payment_date)}`
      : `${due.length} payments due in the next ${ALERT_WINDOW_DAYS} days`

  const lines = [
    due.length === 1 ? 'One payment is coming up.' : `${due.length} payments are coming up.`,
    '',
    ...due.map(
      (c) =>
        `· ${c.name} — ${formatGBP(Number(c.cost_per_payment) || 0)} ${describeDay(c.next_payment_date)}`,
    ),
    '',
    `Total: ${formatGBP(total)}`,
  ]

  if (appUrl) lines.push('', `Review them: ${appUrl}`)

  lines.push(
    '',
    '—',
    'You are getting this because email alerts are switched on for your account.',
    'You can turn them off in Settings.',
  )

  return { subject, text: lines.join('\n') }
}

function describeDay(isoDate) {
  const today = toIso(new Date())
  if (isoDate === today) return 'today'
  if (isoDate === toIso(addDays(new Date(), 1))) return 'tomorrow'
  return `on ${isoDate}`
}

function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toIso(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
