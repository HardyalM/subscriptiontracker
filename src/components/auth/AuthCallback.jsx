import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { callbackErrorFromUrl, leaveCallbackUrl } from '../../lib/authCallback.js'
import { IconLogo } from '../Icon.jsx'

/**
 * The /auth/callback screen. Its only job: wait for Supabase to turn the
 * redirect into a session, clean the URL, and hand over to the app.
 *
 * The Supabase client does the actual exchange itself on load
 * (detectSessionInUrl). initialize() resolves once that attempt has
 * finished and reports its error, if it had one.
 *
 * Whatever the outcome, the URL is cleaned before anything else is shown,
 * so no callback parameters linger in the address bar while a message is
 * on screen.
 *
 * The no-session case is expected, not exotic. PKCE ties the link to the
 * browser that signed up: open the confirmation email on another device
 * and there is no verifier to exchange the code with. The email address is
 * confirmed by then all the same, so the right message is "sign in", not
 * "something went wrong".
 */
export default function AuthCallback({ onDone }) {
  const [problem, setProblem] = useState(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    let active = true
    // Read before the URL is cleaned.
    const urlError = callbackErrorFromUrl()
    const hadCode = new URLSearchParams(window.location.search).has('code')

    ;(async () => {
      const { error } = await supabase.auth.initialize()
      const { data } = await supabase.auth.getSession()
      if (!active) return

      leaveCallbackUrl()

      if (data.session) {
        onDoneRef.current()
        return
      }

      const failure = urlError ?? error?.message
      setProblem(
        failure
          ? { title: "That link didn't work", body: `${failure.replace(/\.$/, '')}. Sign in, or sign up again to get a new link.` }
          : hadCode
            ? {
                // A code with no verifier to match it: the client skips the
                // exchange silently, so this is the case with no error.
                title: 'Your email is confirmed',
                body: 'The link was opened in a different browser from the one you signed up in, so it could not sign you in here. Sign in with your email and password.',
              }
            : { title: 'Nothing to sign in with', body: 'Sign in with your email and password to continue.' },
      )
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      {problem ? (
        <div className="w-full max-w-md rounded-2xl border border-ink-muted/12 bg-surface p-6 shadow-card animate-rise-in">
          <h1 className="font-display text-base font-bold text-ink-primary">{problem.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{problem.body}</p>
          <button
            type="button"
            onClick={() => onDoneRef.current()}
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg shadow-action transition-all duration-150 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-card">
            <IconLogo className="h-6 w-6" />
          </div>
          <span className="sr-only">Signing you in…</span>
        </>
      )}
    </div>
  )
}
