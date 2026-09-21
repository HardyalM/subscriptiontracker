import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabaseClient.js'
import { useSession } from './session.jsx'
import { applyKeepDecision, exposureFor } from './calculations.js'
import { toCommitment, toCommitmentRow, toDecisionRow } from './commitmentMappers.js'

// One hook per concern, called by a component — the same shape as the
// localStorage useCommitments() this replaces. Components never touch
// supabase directly.

export const commitmentKeys = {
  all: (workspaceId) => ['commitments', workspaceId ?? 'none'],
}

const SELECT_WITH_LOG = '*, decision_log (decided_on, decision, amount)'

/**
 * Every active commitment in the current workspace, mapped into the shape
 * calculations.js expects. RLS scopes the rows, so there is no workspace
 * filter in the query itself — the policy is the filter.
 */
export function useCommitments() {
  const { workspace } = useSession()
  const workspaceId = workspace?.id

  return useQuery({
    queryKey: commitmentKeys.all(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commitments')
        .select(SELECT_WITH_LOG)
        .order('next_payment_date', { ascending: true })

      if (error) throw error
      return data.map(toCommitment)
    },
  })
}

/**
 * Shared plumbing: every mutation below needs the workspace id and wants the
 * commitment list refetched once it settles.
 */
function useCommitmentMutation(mutationFn, options = {}) {
  const { workspace } = useSession()
  const queryClient = useQueryClient()
  const workspaceId = workspace?.id
  const queryKey = commitmentKeys.all(workspaceId)

  return useMutation({
    mutationFn: (variables) => mutationFn(variables, workspaceId),
    ...options,
    onMutate: options.onMutate
      ? async (variables) => {
          // Optimistic paths cancel in-flight refetches first, so a slow
          // response can't overwrite the value we just painted.
          await queryClient.cancelQueries({ queryKey })
          const previous = queryClient.getQueryData(queryKey)
          queryClient.setQueryData(queryKey, (current) => options.onMutate(current ?? [], variables))
          return { previous }
        }
      : undefined,
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

/** Insert a new commitment, or update an existing one when it carries an id. */
export function useSaveCommitment() {
  return useCommitmentMutation(async (commitment, workspaceId) => {
    const row = toCommitmentRow(commitment, workspaceId)

    if (commitment.id) {
      const { error } = await supabase.from('commitments').update(row).eq('id', commitment.id)
      if (error) throw error
      return
    }

    const { error } = await supabase.from('commitments').insert(row)
    if (error) throw error
  })
}

/** Flip a commitment between active and cancelled. */
export function useToggleCommitmentStatus() {
  return useCommitmentMutation(
    async (commitment) => {
      const next = commitment.status === 'active' ? 'cancelled' : 'active'
      const { error } = await supabase.from('commitments').update({ status: next }).eq('id', commitment.id)
      if (error) throw error
    },
    {
      onMutate: (current, commitment) =>
        current.map((c) =>
          c.id === commitment.id ? { ...c, status: c.status === 'active' ? 'cancelled' : 'active' } : c,
        ),
    },
  )
}

/**
 * A "Keep it" / "Reconsider" tap from the renewal checkpoint.
 *
 * Two writes: the decision is appended to decision_log, and "Keep it" also
 * advances the commitment to its next cycle via applyKeepDecision — the same
 * pure function as before, now producing a column patch instead of a state
 * patch. The £ amount is captured at the moment of the tap so the running
 * totals stay meaningful as costs change later.
 *
 * These are not wrapped in a transaction: PostgREST has no client-side
 * transaction, so a failure between them could log a decision without
 * advancing the date. Both are invalidated on settle so the UI re-reads the
 * truth either way. If that ever matters more, it becomes one RPC.
 */
export function useRecordDecision() {
  return useCommitmentMutation(
    async ({ commitment, decision }, workspaceId) => {
      const today = new Date().toISOString().slice(0, 10)

      const { error: logError } = await supabase.from('decision_log').insert(
        toDecisionRow({
          commitmentId: commitment.id,
          workspaceId,
          decision,
          amount: exposureFor(commitment) || 0,
          date: today,
        }),
      )
      if (logError) throw logError

      if (decision !== 'kept') return

      const patch = applyKeepDecision(commitment)
      if (Object.keys(patch).length === 0) return

      const columns = {}
      if (patch.nextPaymentDate) columns.next_payment_date = patch.nextPaymentDate
      if (patch.instalmentsRemaining !== undefined) columns.instalments_remaining = patch.instalmentsRemaining

      const { error } = await supabase.from('commitments').update(columns).eq('id', commitment.id)
      if (error) throw error
    },
    {
      onMutate: (current, { commitment, decision }) => {
        const today = new Date().toISOString().slice(0, 10)
        const amount = exposureFor(commitment) || 0
        return current.map((c) => {
          if (c.id !== commitment.id) return c
          const patch = decision === 'kept' ? applyKeepDecision(c) : {}
          return { ...c, ...patch, decisionLog: [...(c.decisionLog || []), { date: today, decision, amount }] }
        })
      },
    },
  )
}

/** Replace everything with a fresh demo set — "Load example data". */
export function useReplaceCommitments() {
  return useCommitmentMutation(async (commitments, workspaceId) => {
    const { error: clearError } = await supabase.from('commitments').delete().eq('workspace_id', workspaceId)
    if (clearError) throw clearError

    if (commitments.length === 0) return
    const { error } = await supabase
      .from('commitments')
      .insert(commitments.map((c) => toCommitmentRow(c, workspaceId)))
    if (error) throw error
  })
}

/** "Clear all data" — removes every commitment in the workspace. */
export function useClearCommitments() {
  return useCommitmentMutation(async (_variables, workspaceId) => {
    const { error } = await supabase.from('commitments').delete().eq('workspace_id', workspaceId)
    if (error) throw error
  })
}

/**
 * The one-time migration of whatever is already in this browser's
 * localStorage. Appends rather than replaces, so running it against a
 * workspace that already has data cannot destroy anything.
 */
export function useImportLocalCommitments() {
  return useCommitmentMutation(async (commitments, workspaceId) => {
    if (commitments.length === 0) return

    const { data, error } = await supabase
      .from('commitments')
      .insert(commitments.map((c) => toCommitmentRow(c, workspaceId)))
      .select('id')
    if (error) throw error

    // Carry the decision history across too — it is what the kept/
    // reconsidered tally and the £-saved figure are built from.
    const rows = []
    commitments.forEach((commitment, index) => {
      const newId = data[index]?.id
      if (!newId) return
      for (const entry of commitment.decisionLog || []) {
        rows.push(
          toDecisionRow({
            commitmentId: newId,
            workspaceId,
            decision: entry.decision,
            amount: entry.amount,
            date: entry.date,
          }),
        )
      }
    })

    if (rows.length > 0) {
      const { error: logError } = await supabase.from('decision_log').insert(rows)
      if (logError) throw logError
    }
  })
}
