// Creates the short-lived link_token the client needs to open Plaid Link.
//
// This exists as a function purely because it needs PLAID_SECRET, which must
// never reach the browser bundle.

import { corsHeaders, json, fail, requireWorkspace } from '../_shared/http.ts'
import { plaidFetch } from '../_shared/plaid.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireWorkspace(req)
    if ('error' in auth) return fail(`link-token: ${auth.error}`, auth.error, 401)

    const result = await plaidFetch<{ link_token: string; expiration: string }>('/link/token/create', {
      client_name: 'Subscription & BNPL Tracker',
      // Plaid ties the Item to this id. The user's own id keeps it stable
      // across re-connections.
      user: { client_user_id: auth.user.id },
      products: ['transactions'],
      country_codes: ['GB'],
      language: 'en',
      webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
    })

    return json({ link_token: result.link_token, expiration: result.expiration })
  } catch (err) {
    return fail(`link-token: ${err}`, "Couldn't start the bank connection. Try again shortly.", 500)
  }
})
