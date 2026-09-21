// Translation between Supabase rows and the in-memory Commitment shape that
// calculations.js works on.
//
// This module exists so calculations.js never has to know the database
// exists. It stays pure and framework-free, operating on the same plain
// objects it always has; everything snake_case, nullable or numeric-typed is
// reconciled here, at the data-access boundary.

/**
 * One commitments row (optionally with its joined decision_log rows) into the
 * Commitment object the rest of the app already understands.
 */
export function toCommitment(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    // Postgres `numeric` can arrive as a string depending on the client and
    // column type. Coercing here means calculations.js keeps seeing numbers,
    // and '12.99' * 12 never silently becomes a string concatenation bug.
    costPerPayment: toNumber(row.cost_per_payment),
    frequency: row.frequency,
    nextPaymentDate: row.next_payment_date,
    totalOriginalAmount: toNullableNumber(row.total_original_amount),
    instalmentsRemaining: toNullableNumber(row.instalments_remaining),
    status: row.status,
    category: row.category,
    bnplMode: row.bnpl_mode ?? 'fixed',
    createdAt: row.created_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    decisionLog: toDecisionLog(row.decision_log),
  }
}

/**
 * decision_log rows into the `decisionLog` array, oldest first.
 *
 * The `amount` handling is load-bearing. reconsideredSavingsTotal() treats a
 * *missing* amount as "fall back to this commitment's current exposure", and
 * checks `typeof entry.amount === 'number'`. A null from the database must
 * therefore stay absent rather than becoming 0 — coercing it would turn every
 * pre-amount decision into a silent £0 and under-count the savings total.
 */
export function toDecisionLog(rows) {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => {
      const entry = { date: row.decided_on, decision: row.decision }
      if (row.amount !== null && row.amount !== undefined) {
        entry.amount = toNumber(row.amount)
      }
      return entry
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * A Commitment into the column set `commitments` accepts. `id` is omitted
 * deliberately — it is either supplied by the database on insert or used in
 * the `.eq('id', …)` filter on update, never written as a value.
 *
 * instalments_remaining is forced to null for subscriptions to satisfy the
 * commitments_bnpl_fields_match_type constraint, which mirrors what
 * CommitmentForm already does.
 */
export function toCommitmentRow(commitment, workspaceId) {
  const isBnpl = commitment.type === 'bnpl'

  return {
    workspace_id: workspaceId,
    name: String(commitment.name ?? '').trim(),
    type: commitment.type,
    cost_per_payment: toNumber(commitment.costPerPayment),
    frequency: commitment.frequency,
    next_payment_date: commitment.nextPaymentDate,
    total_original_amount: toNullableNumber(commitment.totalOriginalAmount),
    instalments_remaining: isBnpl ? toNumber(commitment.instalmentsRemaining) : null,
    status: commitment.status ?? 'active',
    category: commitment.category,
    // Pinned to 'fixed' for subscriptions by commitments_bnpl_mode_matches_type.
    bnpl_mode: isBnpl ? commitment.bnplMode || 'fixed' : 'fixed',
  }
}

/**
 * One decision into a decision_log row. workspace_id is denormalised onto the
 * row to match the composite foreign key the schema uses for RLS.
 */
export function toDecisionRow({ commitmentId, workspaceId, decision, amount, date }) {
  return {
    commitment_id: commitmentId,
    workspace_id: workspaceId,
    decision,
    decided_on: date,
    amount: typeof amount === 'number' && Number.isFinite(amount) ? amount : null,
  }
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
