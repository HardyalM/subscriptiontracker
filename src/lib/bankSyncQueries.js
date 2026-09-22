import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabaseClient.js'
import { useSession } from './session.jsx'
import { commitmentKeys } from './commitmentQueries.js'

// Bank sync data access. Same pattern as commitmentQueries: a hook per
// concern, never a raw supabase call in a component.
//
// Everything touching a Plaid token goes through an Edge Function. The
// client only ever sees connection metadata and suggestions.

export const bankKeys = {
  connections: (workspaceId) => ['bank-connections', workspaceId ?? 'none'],
  suggestions: (workspaceId) => ['suggestions', workspaceId ?? 'none'],
}

/** Connected institutions. Never includes the access token — see the schema. */
export function useBankConnections() {
  const { workspace } = useSession()
  const workspaceId = workspace?.id

  return useQuery({
    queryKey: bankKeys.connections(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_connections')
        .select('id, institution_name, plaid_env, status, last_synced_at, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Suggestions still waiting on a decision. */
export function usePendingSuggestions() {
  const { workspace } = useSession()
  const workspaceId = workspace?.id

  return useQuery({
    queryKey: bankKeys.suggestions(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suggested_commitments')
        .select('*, transactions (description, transacted_on, amount)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Asks the Edge Function for a link_token to open Plaid Link with. */
export function useCreateLinkToken() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('plaid-link-token')
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data.link_token
    },
  })
}

/**
 * Hands the public_token from Plaid Link to the Edge Function, which does
 * the exchange server-side. The access token never touches this code.
 */
export function useExchangePublicToken() {
  const { workspace } = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ publicToken, institutionName }) => {
      const { data, error } = await supabase.functions.invoke('plaid-exchange', {
        body: { public_token: publicToken, institution_name: institutionName },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.connections(workspace?.id) })
    },
  })
}

/**
 * Accept or dismiss a suggestion.
 *
 * Accepting copies it into commitments — the suggestion's columns were
 * chosen to match, so this is a copy rather than a translation — and then
 * marks the suggestion resolved. Two writes without a transaction: if the
 * second fails the suggestion reappears, which is the harmless direction to
 * fail in. Silently creating a duplicate commitment would not be.
 */
export function useResolveSuggestion() {
  const { workspace } = useSession()
  const queryClient = useQueryClient()
  const workspaceId = workspace?.id

  return useMutation({
    mutationFn: async ({ suggestion, decision }) => {
      if (decision === 'accepted') {
        const { error: insertError } = await supabase.from('commitments').insert({
          workspace_id: workspaceId,
          name: suggestion.name,
          type: suggestion.type,
          cost_per_payment: suggestion.cost_per_payment,
          frequency: suggestion.frequency,
          next_payment_date: suggestion.next_payment_date,
          category: suggestion.category,
          status: 'active',
          // A suggestion never carries instalment counts — nothing in a
          // single transaction says how many payments are left — so an
          // accepted BNPL plan starts at zero for the user to correct.
          instalments_remaining: suggestion.type === 'bnpl' ? 0 : null,
          bnpl_mode: 'fixed',
        })
        if (insertError) throw insertError
      }

      const { error } = await supabase
        .from('suggested_commitments')
        .update({ status: decision, resolved_at: new Date().toISOString() })
        .eq('id', suggestion.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.suggestions(workspaceId) })
      queryClient.invalidateQueries({ queryKey: commitmentKeys.all(workspaceId) })
    },
  })
}
