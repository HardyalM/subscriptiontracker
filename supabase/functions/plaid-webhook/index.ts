// Receives Plaid's TRANSACTIONS webhook, pulls new transactions, and turns
// recognised merchants into *suggestions* — never into commitments.
//
// Nothing here writes to the commitments table. A charge that looks like
// Netflix might be a one-off gift card, and a BNPL instalment might be the
// last one. The user confirms every suggestion; that is the whole design.

import { corsHeaders, json, fail, serviceClient } from '../_shared/http.ts'
import { plaidFetch } from '../_shared/plaid.ts'
import { decryptToken } from '../_shared/crypto.ts'
import { matchMerchant, buildSuggestion } from '../_shared/merchantMatching.js'
import { verifyPlaidWebhook } from '../_shared/verifyPlaidWebhook.ts'

interface PlaidTransaction {
  transaction_id: string
  name: string
  merchant_name?: string | null
  amount: number
  iso_currency_code?: string | null
  date: string
  pending: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Read the body as text first: the signature covers these exact bytes,
    // and re-serialising parsed JSON would change them.
    const rawBody = await req.text()

    const invalid = await verifyPlaidWebhook(req, rawBody)
    if (invalid) return fail(`webhook: rejected — ${invalid}`, 'Unauthorised.', 401)

    let payload: { item_id?: string; webhook_type?: string }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return fail('webhook: body was not JSON', 'Malformed webhook.', 400)
    }
    if (!payload?.item_id) return fail('webhook: no item_id', 'Malformed webhook.', 400)

    // Plaid sends several webhook types; only transaction updates matter here.
    if (payload.webhook_type !== 'TRANSACTIONS') {
      return json({ ignored: payload.webhook_type })
    }

    const db = serviceClient()

    const { data: connection, error: connectionError } = await db
      .from('bank_connections')
      .select('id, workspace_id, sync_cursor')
      .eq('plaid_item_id', payload.item_id)
      .maybeSingle()

    if (connectionError || !connection) {
      // An item we have no record of. Answer 200 so Plaid stops retrying a
      // webhook that can never succeed.
      console.error(`webhook: unknown item_id ${payload.item_id}`)
      return json({ ignored: 'unknown item' })
    }

    const { data: secret, error: secretError } = await db
      .from('bank_connection_secrets')
      .select('access_token_encrypted')
      .eq('bank_connection_id', connection.id)
      .single()

    if (secretError || !secret) {
      await db.from('bank_connections').update({ status: 'error' }).eq('id', connection.id)
      return fail(`webhook: no token for ${connection.id}`, 'Connection is missing its token.', 500)
    }

    const accessToken = await decryptToken(secret.access_token_encrypted)

    // Patterns are read once for the whole batch rather than per transaction.
    const { data: patterns } = await db
      .from('merchant_patterns')
      .select('id, pattern, match_type, provider_name, suggested_category')

    let cursor: string | null = connection.sync_cursor
    let hasMore = true
    let added = 0
    let suggested = 0

    while (hasMore) {
      const page = await plaidFetch<{
        added: PlaidTransaction[]
        next_cursor: string
        has_more: boolean
      }>('/transactions/sync', { access_token: accessToken, cursor: cursor ?? undefined })

      for (const tx of page.added) {
        // Money leaving the account only. Plaid reports outflows as positive
        // amounts, so a negative here is a refund or incoming payment and is
        // not a commitment.
        if (tx.amount <= 0) continue

        const { data: inserted, error: txError } = await db
          .from('transactions')
          .upsert(
            {
              workspace_id: connection.workspace_id,
              bank_connection_id: connection.id,
              plaid_transaction_id: tx.transaction_id,
              description: tx.name,
              merchant_name: tx.merchant_name ?? null,
              amount: tx.amount,
              iso_currency_code: tx.iso_currency_code ?? 'GBP',
              transacted_on: tx.date,
              pending: tx.pending,
            },
            { onConflict: 'plaid_transaction_id' },
          )
          .select('id, amount, transacted_on')
          .single()

        if (txError || !inserted) {
          console.error(`webhook: transaction ${tx.transaction_id}: ${txError?.message}`)
          continue
        }
        added += 1

        const pattern = matchMerchant(tx.merchant_name || tx.name, patterns ?? [])
        if (!pattern) continue

        const suggestion = buildSuggestion({ transaction: inserted, pattern })
        if (!suggestion) continue

        await db.from('transactions').update({ matched_pattern_id: pattern.id }).eq('id', inserted.id)

        // ignoreDuplicates: a webhook replay must not produce a second
        // suggestion for a transaction the user has already dismissed.
        const { error: suggestionError } = await db
          .from('suggested_commitments')
          .upsert(
            { workspace_id: connection.workspace_id, transaction_id: inserted.id, ...suggestion },
            { onConflict: 'transaction_id', ignoreDuplicates: true },
          )

        if (suggestionError) {
          console.error(`webhook: suggestion for ${inserted.id}: ${suggestionError.message}`)
          continue
        }
        suggested += 1
      }

      cursor = page.next_cursor
      hasMore = page.has_more
    }

    await db
      .from('bank_connections')
      .update({ sync_cursor: cursor, last_synced_at: new Date().toISOString(), status: 'active' })
      .eq('id', connection.id)

    return json({ added, suggested })
  } catch (err) {
    return fail(`webhook: ${err}`, 'Sync failed.', 500)
  }
})
