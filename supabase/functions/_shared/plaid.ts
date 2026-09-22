// Plaid REST access for Deno.
//
// Supabase Edge Functions run on Deno, not Node, so Plaid's official Node
// SDK is not used here. Plaid's API is plain HTTP with a JSON body — every
// call is a POST carrying client_id and secret — so `fetch` is both
// sufficient and one less dependency to keep current.

const PLAID_HOSTS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
}

/**
 * Sandbox only, and deliberately not configurable beyond it. Production
 * access is an account-level business step, not something this code should
 * be able to opt into by reading a different environment variable. The
 * database agrees: bank_connections.plaid_env has a CHECK pinning it to
 * 'sandbox'.
 */
export function plaidHost(): string {
  const env = Deno.env.get('PLAID_ENV') ?? 'sandbox'
  const host = PLAID_HOSTS[env]
  if (!host) {
    throw new Error(`PLAID_ENV must be 'sandbox'; got '${env}'. This app is not configured for Plaid Production.`)
  }
  return host
}

export function plaidCredentials() {
  const client_id = Deno.env.get('PLAID_CLIENT_ID')
  const secret = Deno.env.get('PLAID_SECRET')
  if (!client_id || !secret) {
    throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set (supabase secrets set ...).')
  }
  return { client_id, secret }
}

/**
 * One Plaid call. Throws with Plaid's own error_code/error_message when the
 * call fails, because those are far more useful than a bare status code.
 */
export async function plaidFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${plaidHost()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...plaidCredentials(), ...body }),
  })

  const json = await res.json()

  if (!res.ok) {
    const code = json?.error_code ?? res.status
    const message = json?.error_message ?? 'Unknown Plaid error'
    throw new Error(`Plaid ${path} failed [${code}]: ${message}`)
  }

  return json as T
}
