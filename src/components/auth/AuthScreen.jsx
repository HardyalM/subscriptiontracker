import { useState } from 'react'
import { validateAuthForm, describeAuthError } from '../../lib/authValidation.js'
import { useSession } from '../../lib/session.jsx'
import { IconLogo, IconCheck, IconSpinner, IconEye, IconEyeOff, IconShield } from '../Icon.jsx'

/**
 * Sign in / create account.
 *
 * Split layout: the product's argument on the left, the form on the right.
 * The left panel shows the actual reframe this app exists to make — a
 * monthly figure restated as an annual one — because a real number carries
 * the idea faster than any amount of copy about it. Below `lg` the panel is
 * dropped entirely rather than stacked; on a phone it would be a screen of
 * marketing standing between someone and their password.
 *
 * Auth behaviour is unchanged from the original: same signIn/signUp calls,
 * same validation, same "check your email" state, same noValidate so the
 * app's own messages appear rather than the browser's.
 */
export default function AuthScreen() {
  const { signIn, signUp } = useSession()
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        // On success the session listener swaps this screen out.
        return
      }

      const { error: signUpError, needsConfirmation } = await signUp({ email, password })
      if (signUpError) return setError(describeAuthError(signUpError))
      if (needsConfirmation) setSentTo(email.trim())
    } finally {
      setBusy(false)
    }
  }

  const isSignUp = mode === 'sign-up'

  if (sentTo) {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-good/10 text-status-good ring-1 ring-status-good/20">
            <IconCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold tracking-tight text-ink-primary">Check your email</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">
            We've sent a confirmation link to{' '}
            <span className="font-semibold text-ink-primary">{sentTo}</span>. Open it and you'll be signed in.
          </p>
          <p className="mt-3 text-sm text-ink-secondary">The link can take a minute to arrive, and it may land in spam.</p>
          <button
            type="button"
            onClick={() => {
              setSentTo('')
              switchMode('sign-in')
            }}
            className="mt-6 text-sm font-semibold text-accent-text underline-offset-4 transition hover:text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 rounded"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink-primary">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-secondary">
          {isSignUp
            ? 'Start tracking what your subscriptions really cost.'
            : 'Sign in to pick up where you left off.'}
        </p>
      </div>

      {/* Segmented control. The sliding indicator is the active surface
          itself rather than a separate animated element, so there is no
          chance of the label and the highlight disagreeing mid-transition. */}
      <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-surface-sunken p-1">
        {[
          ['sign-in', 'Sign in'],
          ['sign-up', 'Create account'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            aria-pressed={mode === value}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              mode === value
                ? 'bg-surface text-ink-primary shadow-card'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* noValidate: the browser's native type="email" bubble fires before
          validateAuthForm() runs and replaces this app's wording with its
          own. Same reasoning as CommitmentForm. */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Email" htmlFor="auth-email">
          <input
            id="auth-email"
            className={inputClass}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="auth-password">
          <div className="relative">
            <input
              id="auth-password"
              className={`${inputClass} pr-11`}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder={isSignUp ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-sunken hover:text-ink-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {isSignUp && (
          <Field label="Confirm password" htmlFor="auth-confirm">
            <input
              id="auth-confirm"
              className={inputClass}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-status-critical/20 bg-status-critical/[0.06] px-3.5 py-3"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-critical" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-status-critical-text">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-fg shadow-action transition-all duration-200 hover:bg-accent-strong hover:shadow-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-action"
        >
          {busy && <IconSpinner className="h-4 w-4 animate-spin" />}
          {busy ? 'Signing you in…' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="mt-7 flex items-start gap-2 text-[13px] leading-relaxed text-ink-secondary">
        <IconShield className="mt-px h-4 w-4 shrink-0 text-ink-muted" />
        <span>
          Your commitments are stored in your own account. Nothing is shared with anyone else, and this app is not
          connected to any bank.
        </span>
      </p>
    </Shell>
  )
}

const inputClass =
  'h-12 w-full rounded-xl border border-ink-muted/25 bg-surface px-3.5 text-[15px] text-ink-primary shadow-sm field transition-all duration-200 placeholder:text-ink-muted/60 hover:border-ink-muted/40'

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-semibold text-ink-secondary">
        {label}
      </label>
      {children}
    </div>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-surface-page lg:grid lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:min-h-0">
        <div className="w-full max-w-[26rem]">
          {/* The mark repeats here for small screens, where the brand panel
              is not rendered at all. */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-action">
              <IconLogo className="h-5 w-5" />
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight text-ink-primary">
              Subscription &amp; BNPL Tracker
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * The argument, not decoration. A monthly price restated annually is the
 * single idea this product exists to deliver, so the panel simply performs
 * it rather than describing it.
 */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-14">
      {/* Depth without noise: two soft radial lights and a hairline grid,
          all at very low opacity. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60rem 40rem at 15% 0%, rgb(var(--brand-300) / 0.22), transparent 60%), radial-gradient(40rem 30rem at 90% 100%, rgb(var(--brand-500) / 0.28), transparent 55%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur">
          <IconLogo className="h-5 w-5" />
        </div>
        <span className="font-display text-[15px] font-bold tracking-tight text-white">
          Subscription &amp; BNPL Tracker
        </span>
      </div>

      <div className="relative max-w-md">
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-white">
          Small payments,
          <br />
          <span className="text-brand-200">honestly totalled.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-brand-100/80">
          £12.99 a month doesn't feel like much. Seen as a year, it argues with you.
        </p>

        {/* The reframe, performed. */}
        <div className="mt-9 w-full max-w-sm rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200/80">
            One streaming service
          </p>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="tabular font-display text-2xl font-bold text-white/55 line-through decoration-white/40 decoration-2">
              £12.99
            </span>
            <span className="text-sm text-brand-100/70">a month</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="tabular font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-white">
              £155.88
            </span>
            <span className="text-sm font-medium text-brand-100">a year</span>
          </div>
          <div className="mt-4 h-px w-full bg-white/10" />
          <p className="mt-3.5 text-[13px] leading-relaxed text-brand-100/70">
            Every commitment shows both figures, side by side — always.
          </p>
        </div>
      </div>

      <p className="relative text-[13px] text-brand-200/85">
        Not connected to any bank. Not financial advice.
      </p>
    </div>
  )
}
