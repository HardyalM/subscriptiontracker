// Matching a bank transaction description against the merchant_patterns
// table.
//
// Pure and dependency-free so the same code runs in the browser and inside a
// Deno Edge Function. This is the single source of truth for what counts as
// a match; the webhook ships a copy of this exact file rather than
// reimplementing it.

/**
 * Bank descriptions are shouty and padded with reference codes:
 * "SPOTIFY P1A2B3C4D5", "KLARNA*TRAINERS  LONDON". Uppercasing and
 * collapsing whitespace is enough to compare them consistently without
 * throwing away the separators that make a pattern specific.
 */
export function normaliseDescription(description) {
  return String(description ?? '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The best matching pattern for a description, or null.
 *
 * When several patterns match, the longest one wins: 'AMAZON PRIME' is a
 * better answer than a hypothetical 'AMAZON', and specificity is a more
 * reliable tiebreak than insertion order.
 *
 * A malformed regex in the table returns no match rather than throwing — one
 * bad row must not take down a whole webhook batch.
 */
export function matchMerchant(description, patterns) {
  const haystack = normaliseDescription(description)
  if (!haystack || !Array.isArray(patterns)) return null

  let best = null

  for (const pattern of patterns) {
    if (!pattern?.pattern) continue
    if (!patternMatches(haystack, pattern)) continue
    if (!best || String(pattern.pattern).length > String(best.pattern).length) {
      best = pattern
    }
  }

  return best
}

function patternMatches(haystack, pattern) {
  const needle = String(pattern.pattern)

  if (pattern.match_type === 'regex') {
    try {
      return new RegExp(needle, 'i').test(haystack)
    } catch {
      return false
    }
  }

  return haystack.includes(normaliseDescription(needle))
}

/**
 * Turns a matched transaction into the fields a suggestion needs.
 *
 * Deliberately conservative. Frequency is assumed monthly because that is
 * what the overwhelming majority of recurring charges are, and because the
 * user confirms every suggestion before it becomes a commitment — guessing
 * weekly from a single transaction would be inventing a pattern from one
 * data point.
 *
 * BNPL is inferred from the matched provider's category rather than from the
 * amount: a £25 charge is not evidence of anything on its own.
 */
export function buildSuggestion({ transaction, pattern }) {
  if (!transaction || !pattern) return null

  const amount = Math.abs(Number(transaction.amount) || 0)
  if (amount <= 0) return null

  const category = pattern.suggested_category || 'Other'
  const type = category === 'Retail BNPL' ? 'bnpl' : 'subscription'

  return {
    name: pattern.provider_name,
    type,
    cost_per_payment: amount,
    frequency: 'monthly',
    // The next one is assumed to fall a month after the one we just saw.
    next_payment_date: addOneMonth(transaction.transacted_on),
    category,
    matched_pattern_id: pattern.id,
  }
}

/**
 * One calendar month on, clamped to the target month's last day so 31 Jan
 * lands on 28/29 Feb — the same rule addMonthsClamped applies in
 * calculations.js. Restated here rather than imported so this file stays
 * dependency-free and portable into Deno.
 */
export function addOneMonth(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number)
  const targetMonth = m % 12
  const targetYear = m === 12 ? y + 1 : y
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
