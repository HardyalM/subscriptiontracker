// Presentation formatting for dates, kept out of components so it is tested
// rather than eyeballed.

// A fixed table rather than Intl.DateTimeFormat. CLDR changed the en-GB
// abbreviation for September from "Sep" to "Sept", so the same date renders
// differently depending on which ICU version a browser ships — and a
// four-letter month breaks the alignment of a date column. Found when the
// test for this function failed on a newer Node.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * '2026-09-25' -> '25 Sep'. Read straight from the string parts rather than
 * through a Date: new Date('2026-09-25') is UTC midnight, which is the
 * previous evening anywhere west of Greenwich and would print the wrong day.
 */
export function formatShortDate(isoDate) {
  if (typeof isoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
  const [, m, d] = isoDate.split('-').map(Number)
  if (m < 1 || m > 12) return ''
  return `${d} ${MONTHS[m - 1]}`
}

/**
 * Days until a payment, in words. Calm and factual — "3 days overdue", not
 * "OVERDUE!" — matching the renewal copy elsewhere in the app.
 */
export function describeDue(days) {
  if (!Number.isFinite(days)) return ''
  if (days < -1) return `${Math.abs(days)} days overdue`
  if (days === -1) return '1 day overdue'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}
