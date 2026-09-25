import { createClient } from '@supabase/supabase-js'

// Vite only exposes env vars prefixed with VITE_ to client code, and both of
// these are safe to ship: the URL is public, and the anon key is designed to
// be public — it carries no privileges of its own. Every table it can reach
// is gated by the Row Level Security policies in supabase/migrations.
//
// Nothing secret belongs here. Plaid tokens and LLM API keys live in Edge
// Function environment variables (Phases 6 and 7), never in this bundle.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Whether the app has been pointed at a Supabase project yet. Checked before
 * anything tries to sign in, so a missing .env produces a readable setup
 * screen instead of a blank page and a console error.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * The single Supabase client for the app. Null when unconfigured — callers
 * go through SessionProvider, which checks isSupabaseConfigured first and
 * never reaches a null client.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // PKCE, not the implicit default. An emailed link then returns a
        // single-use ?code= that is exchanged for a session behind the
        // scenes, so access and refresh tokens never appear in the URL —
        // and so never reach history, screenshots or screen shares.
        // src/components/auth/AuthCallback.jsx handles the landing.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
