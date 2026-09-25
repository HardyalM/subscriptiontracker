import { describe, it, expect } from 'vitest'
import { isAuthCallbackUrl, callbackErrorFromUrl } from './authCallback.js'

const at = (href) => {
  const url = new URL(href, 'http://localhost:5173')
  return { pathname: url.pathname, search: url.search, hash: url.hash }
}

describe('isAuthCallbackUrl', () => {
  it('recognises the callback route with a PKCE code', () => {
    expect(isAuthCallbackUrl(at('/auth/callback?code=abc'))).toBe(true)
  })

  it('recognises the callback route even with nothing on it', () => {
    expect(isAuthCallbackUrl(at('/auth/callback'))).toBe(true)
  })

  it('catches a code that fell back to the Site URL', () => {
    expect(isAuthCallbackUrl(at('/?code=abc'))).toBe(true)
  })

  it('catches an error redirect in the query or the hash', () => {
    expect(isAuthCallbackUrl(at('/?error=access_denied'))).toBe(true)
    expect(isAuthCallbackUrl(at('/#error=access_denied&error_code=otp_expired'))).toBe(true)
  })

  it('catches implicit-flow tokens', () => {
    expect(isAuthCallbackUrl(at('/#access_token=x&refresh_token=y'))).toBe(true)
  })

  it("leaves the app's own hash routes alone", () => {
    expect(isAuthCallbackUrl(at('/'))).toBe(false)
    expect(isAuthCallbackUrl(at('/#/'))).toBe(false)
    expect(isAuthCallbackUrl(at('/#/settings/danger'))).toBe(false)
  })
})

describe('callbackErrorFromUrl', () => {
  it('prefers the description, and decodes + as spaces', () => {
    expect(callbackErrorFromUrl(at('/#error=access_denied&error_description=Email+link+is+invalid+or+has+expired'))).toBe(
      'Email link is invalid or has expired',
    )
  })

  it('reads query errors too', () => {
    expect(callbackErrorFromUrl(at('/auth/callback?error=server_error'))).toBe('server_error')
  })

  it('is null for a clean callback', () => {
    expect(callbackErrorFromUrl(at('/auth/callback?code=abc'))).toBeNull()
  })
})
