import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Never leaks an internal message to the client. The detail goes to the
 * function log, where the developer can see it; the caller gets something
 * they can act on.
 */
export function fail(logMessage: string, publicMessage: string, status = 400): Response {
  console.error(logMessage)
  return json({ error: publicMessage }, status)
}

/** Full-privilege client. Only ever used server-side, inside a function. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

/**
 * Resolves the caller from their Authorization header, then finds the
 * workspace they belong to.
 *
 * The workspace is read with the *caller's* token, not service_role, so RLS
 * decides what they can see. A function that took a workspace_id from the
 * request body instead would let any signed-in user act on any workspace.
 */
export async function requireWorkspace(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { error: 'Not signed in.' as const }

  const scoped = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )

  const { data: userData, error: userError } = await scoped.auth.getUser()
  if (userError || !userData.user) return { error: 'Not signed in.' as const }

  const { data, error } = await scoped
    .from('workspace_members')
    .select('workspace_id')
    .limit(1)
    .maybeSingle()

  if (error || !data) return { error: 'No workspace found for this account.' as const }

  return { user: userData.user, workspaceId: data.workspace_id as string }
}
