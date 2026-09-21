import { annualisedCost, remainingBnplBalance, bnplPaidSoFar } from './calculations.js'

const COLUMNS = [
  'name',
  'type',
  'category',
  'costPerPayment',
  'frequency',
  'nextPaymentDate',
  'totalOriginalAmount',
  'instalmentsRemaining',
  'status',
  'annualisedCost',
  'remainingBnplBalance',
  'bnplPaidSoFar',
  'keptCount',
  'reconsideredCount',
  'reconsideredSavings',
]

function csvEscape(value) {
  const s = value === undefined || value === null ? '' : String(value)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Builds CSV text for every commitment, including derived figures (so the
 * export is useful on its own, not just a dump of raw form fields) and a
 * summary of each commitment's kept/reconsidered decisions.
 */
export function commitmentsToCsv(commitments) {
  const rows = commitments.map((c) => {
    const decisions = c.decisionLog || []
    const keptCount = decisions.filter((d) => d.decision === 'kept').length
    const reconsideredEntries = decisions.filter((d) => d.decision === 'reconsidered')
    const reconsideredCount = reconsideredEntries.length
    const reconsideredSavings = reconsideredEntries.reduce(
      (sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0),
      0,
    )
    const paidSoFar = bnplPaidSoFar(c)
    const record = {
      ...c,
      annualisedCost: c.type === 'subscription' ? round2(annualisedCost(c)) : '',
      remainingBnplBalance: c.type === 'bnpl' ? round2(remainingBnplBalance(c)) : '',
      bnplPaidSoFar: paidSoFar === null ? '' : round2(paidSoFar),
      keptCount,
      reconsideredCount,
      reconsideredSavings: round2(reconsideredSavings),
    }
    return COLUMNS.map((col) => csvEscape(record[col])).join(',')
  })
  return [COLUMNS.join(','), ...rows].join('\n')
}

function round2(n) {
  return Math.round((n || 0) * 100) / 100
}

/**
 * Triggers a browser download of the CSV. Kept separate from
 * commitmentsToCsv so the string-building half can be unit-tested without a
 * DOM (see calculations.test.mjs for the pattern).
 */
export function downloadCommitmentsCsv(commitments, filename = 'commitments.csv') {
  const csv = commitmentsToCsv(commitments)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
