// Verifies that a webhook really came from Plaid.
//
// The webhook endpoint cannot sit behind Supabase's JWT check — Plaid has no
// Supabase token to send — so it must authenticate the caller itself.
// Without this, the endpoint would be an open URL that anyone could use to
// trigger Plaid API calls against our items.
//
// Plaid signs each webhook with an ES256 JWT in the Plaid-Verification
// header. The JWT carries a SHA-256 of the request body, so verifying the
// signature and then comparing that hash proves both who sent it and that
// the body was not altered.
//
// Reference: Plaid's "Webhook verification" guide.

import { plaidFetch } from './plaid.ts'

const MAX_AGE_SECONDS = 5 * 60

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  return Uint8Array.from(atob(withPadding), (c) => c.charCodeAt(0))
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)))
}

async function sha256Hex(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time string comparison. A plain === on a hash can leak, through
 * timing, how much of a guess was correct.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

/**
 * @param rawBody the request body as text, exactly as received — re-serialising
 *        parsed JSON would change the bytes and break the hash comparison.
 * @returns null when valid, or a reason string when not.
 */
export async function verifyPlaidWebhook(req: Request, rawBody: string): Promise<string | null> {
  const token = req.headers.get('Plaid-Verification')
  if (!token) return 'missing Plaid-Verification header'

  const [headerSegment, payloadSegment, signatureSegment] = token.split('.')
  if (!headerSegment || !payloadSegment || !signatureSegment) return 'malformed verification JWT'

  const header = decodeSegment(headerSegment) as { alg?: string; kid?: string }
  // Reject anything that is not ES256 before going near the signature: an
  // 'alg: none' token must never be treated as verified.
  if (header.alg !== 'ES256') return `unexpected alg '${header.alg}'`
  if (!header.kid) return 'no kid in verification JWT'

  const { key } = await plaidFetch<{ key: JsonWebKey & { alg: string } }>(
    '/webhook_verification_key/get',
    { key_id: header.kid },
  )

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    { ...key, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )

  const signed = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`)
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    base64UrlToBytes(signatureSegment),
    signed,
  )
  if (!valid) return 'signature did not verify'

  const payload = decodeSegment(payloadSegment) as { iat?: number; request_body_sha256?: string }

  // Reject replays of an old, genuinely-signed webhook.
  const age = Math.floor(Date.now() / 1000) - (payload.iat ?? 0)
  if (!payload.iat || age > MAX_AGE_SECONDS) return `verification JWT is stale (${age}s)`

  const expected = payload.request_body_sha256
  if (!expected) return 'no request_body_sha256 claim'
  if (!timingSafeEqual(await sha256Hex(rawBody), expected)) return 'body hash mismatch'

  return null
}
