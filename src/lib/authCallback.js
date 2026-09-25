/**
 * Where Supabase sends the browser back to after an emailed auth link.
 *
 * With the PKCE flow the link arrives as /auth/callback?code=… — a
 * single-use code that is worthless without the verifier this browser
 * stored at sign-up. The session tokens themselves are fetched behind the
 * scenes and never appear in the URL. See AuthCallback.jsx.
 */
export const AUTH_CALLBACK_PATH = '/auth/callback'

/** The URL to pass as `emailRedirectTo`. Must be on the project's Redirect URLs allow-list. */
export function authRedirectUrl() {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`
}

const CALLBACK_QUERY_KEYS = ['code', 'error', 'error_code', 'error_description']
const CALLBACK_HASH_KEYS = ['access_token', 'refresh_token', 'error', 'error_code', 'error_description']

/**
 * Whether the current URL is an auth redirect that needs handling.
 *
 * True on /auth/callback, and also on any path carrying callback
 * parameters. That second case is the safety net: if the redirect URL isn't
 * on Supabase's allow-list, Supabase falls back to the Site URL, and the
 * code or error lands on / instead. Hashes that start with '#/' are the
 * app's own routes, never callback parameters.
 */
export function isAuthCallbackUrl(location = window.location) {
  if (location.pathname === AUTH_CALLBACK_PATH) return true

  const query = new URLSearchParams(location.search)
  if (CALLBACK_QUERY_KEYS.some((key) => query.has(key))) return true

  if (location.hash && !location.hash.startsWith('#/')) {
    const hash = new URLSearchParams(location.hash.slice(1))
    if (CALLBACK_HASH_KEYS.some((key) => hash.has(key))) return true
  }
  return false
}

/**
 * The error Supabase reported in the redirect, if any, e.g. an expired
 * link. Read before the URL is cleaned, so it can still be shown.
 */
export function callbackErrorFromUrl(location = window.location) {
  const sources = [new URLSearchParams(location.search)]
  if (location.hash && !location.hash.startsWith('#/')) sources.push(new URLSearchParams(location.hash.slice(1)))
  for (const params of sources) {
    const message = params.get('error_description') || params.get('error')
    if (message) return message.replace(/\+/g, ' ')
  }
  return null
}

/**
 * Replaces the callback URL with the app's root, in place. replaceState
 * rather than a navigation, so the callback URL — code, tokens or error —
 * doesn't survive in back-history either.
 */
export function leaveCallbackUrl() {
  window.history.replaceState(null, '', '/')
}
