import { useState } from 'react'
import { validateAuthForm, describeAuthError } from '../../lib/authValidation.js'
import { useSession } from '../../lib/session.jsx'
import { IconLogo, IconCheck } from '../Icon.jsx'

const inputClass =
  'w-full rounded-lg border border-ink-muted/20 bg-white px-3 py-2.5 text-sm text-ink-primary shadow-sm transition focus-ring'
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5'

/**
 * Sign in / sign up. One screen with a mode toggle rather than two routes —
 * the app has no router, and an account here is a means to an end rather
 * than a destination.
 *
 * Tone follows the rest of the app: state what happens, don't sell it.
 */
export default function AuthScreen() {
  const { signIn, signUp } = useSession()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const problem = validateAuthForm({ mode, email, password, confirmPassword })
    if (problem) return setError(problem)

    setBusy(true)
    setError('')
    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await signIn({ email, password })
        if (signInError) setError(describeAuthError(signInError))
        // On success the session listener swaps this screen out — nothing
        // to do here.
        return
      }

      const { error: signUpError, needsConfirmation } = await signUp({ email, password })
      if (signUpError) return setError(describeAuthError(signUpError))
      if (needsConfirmation) setSentTo(email.trim())
    } finally {
      setBusy(false)
    }
  }

  // Email confirmation is on by default in Supabase, so signing up does not
  // sign you in. Saying so plainly beats a spinner that never resolves.
  if (sentTo) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-good/10 text-status-good">
            <IconCheck className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-ink-primary">Check your email</h2>
          <p className="text-sm leading-relaxed text-ink-secondary">
            We've sent a confirmation link to <span className="font-medium text-ink-primary">{sentTo}</span>. Open it
            and you'll be signed in.
          </p>
          <p className="text-xs text-ink-muted">
            The link can take a minute to arrive, and it may land in spam.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentTo('')
              switchMode('sign-in')
            }}
            className="mt-1 text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  const isSignUp = mode === 'sign-up'

  return (
    <Shell>
      <div className="mb-5 flex rounded-lg bg-surface-sunken p-1 text-sm">
        {['sign-in', 'sign-up'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
              mode === value ? 'bg-white text-ink-primary shadow-card' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {value === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {/* noValidate: the browser's native type="email" bubble would fire
          before validateAuthForm() runs, replacing this app's wording with
          the browser's. CommitmentForm owns its validation the same way. */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className={inputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className={inputClass}
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isSignUp && (
          <div>
            <label className={labelClass} htmlFor="auth-confirm">
              Confirm password
            </label>
            <input
              id="auth-confirm"
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-status-critical/8 px-3 py-2 text-sm text-status-critical">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Just a moment…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-card">
            <IconLogo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-ink-primary">
              Subscription &amp; BNPL Tracker
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">What your recurring costs actually add up to.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">{children}</div>

        <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
          Your commitments are stored in your own account. Nothing is shared with anyone else, and this app is not
          connected to any bank.
        </p>
      </div>
    </div>
  )
}
