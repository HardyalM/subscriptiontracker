// AES-GCM encryption for the Plaid access token.
//
// The token is the credential that reads someone's bank data, so it is never
// stored in plaintext even though the table holding it is already unreachable
// from the client (bank_connection_secrets has RLS on and no policies). Two
// independent controls, because one of them being misconfigured should not be
// enough on its own.
//
// TOKEN_ENCRYPTION_KEY is 32 random bytes, base64-encoded:
//   openssl rand -base64 32

function keyMaterial(): Uint8Array {
  const raw = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY must be set (supabase secrets set ...).')

  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
  if (bytes.length !== 32) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to 32 bytes; got ${bytes.length}.`)
  }
  return bytes
}

async function importKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey('raw', keyMaterial(), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/**
 * Returns base64 of iv || ciphertext. The IV is random per call and stored
 * alongside rather than derived, so encrypting the same token twice never
 * produces the same output.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(), encoded)

  const combined = new Uint8Array(iv.length + cipher.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipher), iv.length)

  return btoa(String.fromCharCode(...combined))
}

export async function decryptToken(stored: string): Promise<string> {
  const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const cipher = combined.slice(12)

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await importKey(), cipher)
  return new TextDecoder().decode(plain)
}
