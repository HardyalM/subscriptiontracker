import { Component } from 'react'
import { IconBan } from './Icon.jsx'

/**
 * Catches a render-time crash and shows something honest instead of a white
 * page.
 *
 * Still a class component: React has no hook equivalent of
 * componentDidCatch, and this is the one place in the codebase where that is
 * the right tool rather than a leftover.
 *
 * The copy matters here. A crash in a money app invites the worst
 * assumption — that the data is gone — so the first thing it says is that
 * nothing has been lost, because nothing has: everything is in the account,
 * and this is a display failure.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No error-reporting service is wired up, so this goes to the console —
    // stated plainly rather than left looking like it was forgotten.
    console.error('Unhandled error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    // A `fallback` makes this a local boundary: the failure is contained to
    // one part of the page instead of replacing the whole app. Used around
    // non-essential surfaces, where losing the feature is much better than
    // losing the screen.
    if (this.props.fallback !== undefined) return this.props.fallback

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
        <div className="w-full max-w-md rounded-2xl border border-ink-muted/12 bg-white p-6 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-critical/10 text-status-critical">
            <IconBan className="h-5 w-5" />
          </div>

          <h1 className="mt-3 font-display text-base font-bold text-ink-primary">Something broke on this screen</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
            Your commitments are safe — they're stored in your account, and nothing here changes them. This is a
            problem drawing the page.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-ink-muted/20 px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken"
            >
              Reload
            </button>
          </div>

          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-surface-sunken p-3 text-[11px] leading-snug text-ink-secondary">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
