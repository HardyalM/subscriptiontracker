import { useState } from 'react'
import { validateAuthForm, describeAuthError } from '../../lib/authValidation.js'
import { useSession } from '../../lib/session.jsx'
import BuiltBy from '../shell/BuiltBy.jsx'
import ProductPreview from './ProductPreview.jsx'
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

      {/* A column so the credit can sit at the foot of the page, level with
          the disclaimer at the foot of the brand panel, while the form
          stays centred in the space above it. */}
      <div className="flex min-h-screen flex-col px-6 sm:px-10 lg:min-h-0">
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-12">
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

        <BuiltBy size="md" className="mx-auto w-full max-w-[26rem] border-t border-ink-muted/10 pb-8 pt-5 text-center lg:pb-14" />
      </div>
    </div>
  )
}

/**
 * The argument, then the evidence. A monthly price restated annually is
 * the single idea this product exists to deliver, so the panel performs it
 * in one line — then shows the dashboard that does it for everything you
 * pay for, running off the edge of the panel as if it continues there.
 */
function BrandPanel() {
  return (
    <div className="relative hidden flex-col overflow-hidden bg-brand-800 lg:flex">
      {/* Depth without noise: soft radial lights — one behind the copy, one
          behind the product shot — and a hairline grid, all at very low
          opacity. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60rem 40rem at 15% 0%, rgb(var(--brand-300) / 0.22), transparent 60%), radial-gradient(44rem 34rem at 78% 78%, rgb(var(--brand-500) / 0.34), transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 30% 25%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 30% 25%, black, transparent)',
        }}
      />

      <div className="relative flex items-center gap-3 px-14 pt-14">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-inset ring-white/20 backdrop-blur">
          <IconLogo className="h-5 w-5" />
        </div>
        <span className="font-display text-[15px] font-bold tracking-tight text-white">
          Subscription &amp; BNPL Tracker
        </span>
      </div>

      <div className="relative mt-10 max-w-xl px-14 [@media(min-height:1000px)]:mt-14">
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.08] tracking-tight text-white">
          Small payments,
          <br />
          <span className="text-brand-200">honestly totalled.</span>
        </h1>
        <p className="mt-4 max-w-md text-[17px] leading-relaxed text-brand-100/80">
          £12.99 a month doesn't feel like much. Seen as a year, it argues with you.
        </p>

        {/* The reframe, performed in one line. Dropped on screens shorter
            than 960px, where the room is better spent on the dashboard
            below, which makes the same point. */}
        <div className="mt-7 hidden items-center gap-5 rounded-2xl border border-white/12 bg-white/[0.07] px-5 py-3.5 backdrop-blur-sm [@media(min-height:960px)]:inline-flex">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-200/80">One streaming service</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="tabular font-display text-xl font-bold text-white/55 line-through decoration-white/40 decoration-2">
                £12.99
              </span>
              <span className="text-[13px] text-brand-100/70">a month</span>
            </p>
          </div>
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-brand-300" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10h11m0 0l-4-4m4 4l-4 4" />
          </svg>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-200/80">Seen as a year</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="tabular font-display text-[1.6rem] font-extrabold leading-none tracking-tight text-white">
                £155.88
              </span>
              <span className="text-[13px] font-medium text-brand-100">a year</span>
            </p>
          </div>
        </div>
      </div>

      <ProductPreview className="relative mt-9 min-h-[14rem] flex-1" />

      {/* Level with the credit at the foot of the form column. */}
      <p className="absolute bottom-14 left-14 z-10 text-[13px] text-brand-200/85">
        Not connected to any bank. Not financial advice.
      </p>
    </div>
  )
}
