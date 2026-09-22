// Extracts a merchant, total and payment schedule from a receipt image or a
// pasted order-confirmation email.
//
// This is the only place in the app where a user's own data is sent to a
// third party, so three things are true of it:
//   - it runs only when the user has explicitly consented, checked here as
//     well as in the UI
//   - it returns a *draft* for the user to review in the normal form; it
//     never writes a commitment
//   - the model's output is treated as untrusted and fully validated before
//     anything is built from it
//
// ANTHROPIC_API_KEY lives in the function's environment, never in the client
// bundle.

import Anthropic from 'npm:@anthropic-ai/sdk@0.71.0'
import { corsHeaders, json, fail, requireWorkspace, serviceClient } from '../_shared/http.ts'
import { parseReceiptResponse } from '../_shared/receiptSchema.js'

// The brief specifies Haiku for cost, with Sonnet as the fallback when
// extraction on messy receipts proves poor. Both are current-generation ids.
const PRIMARY_MODEL = 'claude-haiku-4-5'
const FALLBACK_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `You extract payment details from receipts and order confirmations.

Return ONLY a JSON object, with no prose and no markdown fences, in exactly this shape:

{
  "merchant": "string - who is being paid",
  "total_amount": number,
  "currency": "GBP",
  "payments": [{ "date": "YYYY-MM-DD", "amount": number }]
}

Rules:
- "payments" lists every scheduled payment, including ones already made.
- A single up-front purchase is one entry.
- A "pay in 3" or instalment plan is one entry per instalment.
- Dates must be real calendar dates in YYYY-MM-DD. If a date is implied
  rather than printed (for example "then every month"), work it out.
- Amounts are numbers, not strings, and exclude currency symbols.
- Never invent a value you cannot see or derive. If the image or text is not
  a receipt, an order confirmation, or a payment schedule, return exactly
  {"not_a_receipt": true} and nothing else.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireWorkspace(req)
    if ('error' in auth) return fail(`parse-receipt: ${auth.error}`, auth.error, 401)

    const body = await req.json().catch(() => ({}))
    const { storage_path, text, consented } = body

    // The UI gates this behind a consent step; checking it here too means a
    // direct call to the function cannot skip it.
    if (consented !== true) {
      return fail('parse-receipt: no consent flag', 'Consent is required before a receipt can be read.', 403)
    }

    if (!storage_path && !text) {
      return fail('parse-receipt: nothing to parse', 'Send either an uploaded image or some text.', 400)
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return fail('parse-receipt: ANTHROPIC_API_KEY not set', 'Receipt reading is not configured yet.', 503)
    }

    let content: Anthropic.MessageParam['content']

    if (storage_path) {
      // The path must sit inside the caller's own workspace folder. Without
      // this check, a signed-in user could name any path in the bucket and
      // have the function fetch it with service_role privileges.
      if (!String(storage_path).startsWith(`${auth.workspaceId}/`)) {
        return fail(`parse-receipt: path outside workspace: ${storage_path}`, 'That file is not yours.', 403)
      }

      const db = serviceClient()
      const { data: file, error } = await db.storage.from('receipts').download(storage_path)
      if (error || !file) {
        return fail(`parse-receipt: download failed: ${error?.message}`, "Couldn't read that upload.", 400)
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: (file.type || 'image/jpeg') as 'image/jpeg',
            data: base64(bytes),
          },
        },
        { type: 'text', text: 'Extract the payment details from this receipt.' },
      ]
    } else {
      content = [
        {
          type: 'text',
          text: `Extract the payment details from this order confirmation:\n\n${String(text).slice(0, 20000)}`,
        },
      ]
    }

    const client = new Anthropic({ apiKey })

    // max_tokens is deliberately small: the only valid output is a short JSON
    // object, and a cap this size turns a runaway response into a fast
    // failure rather than an expensive one.
    const request = { max_tokens: 2000, system: SYSTEM_PROMPT, messages: [{ role: 'user' as const, content }] }

    let response = await client.messages.create({ model: PRIMARY_MODEL, ...request })
    let modelUsed = PRIMARY_MODEL
    let result = parseReceiptResponse(textOf(response))

    // One retry on the stronger model, per the brief's "fall back to Sonnet
    // if extraction on messy receipts is poor". Only for a genuine parse
    // failure — a clear "this is not a receipt" is a correct answer and
    // re-asking a better model will not change it.
    if (!result.ok && !/doesn't look like a receipt/i.test(result.reason)) {
      console.warn(`parse-receipt: ${PRIMARY_MODEL} failed (${result.reason}); retrying on ${FALLBACK_MODEL}`)
      response = await client.messages.create({ model: FALLBACK_MODEL, ...request })
      modelUsed = FALLBACK_MODEL
      result = parseReceiptResponse(textOf(response))
    }

    if (!result.ok) {
      // A parsing failure, surfaced as one. Nothing partial is returned.
      return json({ ok: false, reason: result.reason }, 200)
    }

    return json({ ok: true, receipt: result.value, model: modelUsed })
  } catch (err) {
    return fail(`parse-receipt: ${err}`, "Couldn't read that receipt. Nothing was saved.", 500)
  }
})

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

/** Chunked so a large image does not blow the call stack via spread. */
function base64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
