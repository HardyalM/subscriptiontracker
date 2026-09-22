import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabaseClient.js'
import { useSession } from './session.jsx'

// Reference data: identical for everyone, changes rarely, and read once for
// the whole list rather than per row. staleTime is long because a curated
// table does not move during a session.

const REFERENCE_STALE_TIME = 60 * 60 * 1000 // 1 hour

export function useCancellationReference() {
  const { user } = useSession()

  return useQuery({
    queryKey: ['cancellation-reference'],
    enabled: Boolean(user),
    staleTime: REFERENCE_STALE_TIME,
    queryFn: async () => {
      const [patterns, guides] = await Promise.all([
        supabase.from('merchant_patterns').select('id, pattern, match_type, provider_name, suggested_category'),
        supabase.from('cancellation_guides').select('provider_name, cancel_url, phone, steps'),
      ])
      if (patterns.error) throw patterns.error
      if (guides.error) throw guides.error
      return { patterns: patterns.data, guides: guides.data }
    },
  })
}

/** Lets a member switch their own email alerts on or off. */
export async function setEmailAlerts(enabled) {
  const { error } = await supabase
    .from('workspace_members')
    .update({ email_alerts_enabled: enabled })
    .eq('user_id', (await supabase.auth.getUser()).data.user.id)
  if (error) throw error
}

export function useEmailAlertPreference() {
  const { user } = useSession()

  return useQuery({
    queryKey: ['email-alerts', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('email_alerts_enabled')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.email_alerts_enabled ?? false
    },
  })
}
