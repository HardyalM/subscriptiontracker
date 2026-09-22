// Exchanges the public_token Plaid Link hands the browser for a long-lived
// access_token, and stores it encrypted where the client cannot read it.
//
// The public_token is useless on its own and safe to send here; the
// access_token it becomes never leaves the server.

import { corsHeaders, json, fail, requireWorkspace, serviceClient } from '../_shared/http.ts'
import { plaidFetch } from '../_shared/plaid.ts'
import { encryptToken } from '../_shared/crypto.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireWorkspace(req)
    if ('error' in auth) return fail(`exchange: ${auth.error}`, auth.error, 401)

    const { public_token, institution_name } = await req.json().catch(() => ({}))
    if (!public_token) return fail('exchange: no public_token', 'Missing the token from Plaid Link.', 400)

    const exchanged = await plaidFetch<{ access_token: string; item_id: string }>(
      '/item/public_token/exchange',
      { public_token },
    )

    const db = serviceClient()

    // Metadata the client is allowed to see: enough to render "Connected —
    // sandbox data", and nothing more.
    const { data: connection, error: connectionError } = await db
      .from('bank_connections')
      .insert({
        workspace_id: auth.workspaceId,
        plaid_item_id: exchanged.item_id,
        institution_name: institution_name ?? null,
        plaid_env: 'sandbox',
      })
      .select('id')
      .single()

    if (connectionError) {
      return fail(`exchange: ${connectionError.message}`, "Couldn't save the connection.", 500)
    }

    const { error: secretError } = await db.from('bank_connection_secrets').insert({
      bank_connection_id: connection.id,
      access_token_encrypted: await encryptToken(exchanged.access_token),
    })

    if (secretError) {
      // Never leave a connection row without its token — it would look
      // connected and silently never sync.
      await db.from('bank_connections').delete().eq('id', connection.id)
      return fail(`exchange: ${secretError.message}`, "Couldn't save the connection.", 500)
    }

    return json({ connection_id: connection.id, plaid_env: 'sandbox' })
  } catch (err) {
    return fail(`exchange: ${err}`, "Couldn't finish connecting. Nothing was saved.", 500)
  }
})
