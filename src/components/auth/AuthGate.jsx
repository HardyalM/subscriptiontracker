import { isSupabaseConfigured } from '../../lib/supabaseClient.js'
import { useSession } from '../../lib/session.jsx'
import { IconLogo } from '../Icon.jsx'
import AuthScreen from './AuthScreen.jsx'

/**
 * Decides what the app shows before the dashboard: a setup notice if this
 * build was never pointed at a Supabase project, a quiet placeholder while
 * the stored session is restored, the sign-in screen, or the app itself.
 *
 * Restoring a session is usually instant, so the loading state is
 * deliberately plain — a spinner that flashes for 80ms is worse than a
 * static mark.
 */
export default function AuthGate({ children }) {
  const { user, loading } = useSession()

  if (!isSupabaseConfigured) return <SetupNotice />

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-card">
          <IconLogo className="h-6 w-6" />
        </div>
        <span className="sr-only">Loading your account…</span>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return children
}

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-muted/12 bg-surface p-6 shadow-card">
        <h1 className="font-display text-base font-bold text-ink-primary">Not connected to a project yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          This build has no Supabase credentials, so there's nowhere to sign in to. Copy{' '}
          <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">.env.example</code> to{' '}
          <code className="rounded bg-surface-sunken px-1 py-0.5 text-xs">.env.local</code>, fill in both values, and
          restart the dev server.
        </p>
        <p className="mt-3 text-xs text-ink-muted">
          Vite only reads environment files at startup, so a running server won't pick them up on its own.
        </p>
      </div>
    </div>
  )
}
