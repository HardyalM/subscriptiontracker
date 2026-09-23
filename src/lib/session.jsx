import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

/**
 * The app's one piece of global state, per the v2 architecture rules:
 * who is signed in, and which workspace their data belongs to. Everything
 * else stays local component state or (from Phase 3) React Query cache —
 * this context is deliberately not a dumping ground.
 *
 * `workspace` is resolved here rather than in a data hook because every
 * query from Phase 3 onward needs a workspace_id, and the RLS policies key
 * off workspace membership rather than user id.
 */
const SessionContext = createContext(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession() must be called inside <SessionProvider>')
  return value
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workspaceError, setWorkspaceError] = useState(null)

  const user = session?.user ?? null

  // Restore an existing session on load, then follow auth state changes.
  // onAuthStateChange also fires for token refreshes and for sign-in
  // completed in another tab, so this is the single source of truth.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }

    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session ?? null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  // The signup trigger provisions exactly one workspace per user, so this
  // asks for the first membership row rather than offering a picker. RLS
  // guarantees it can only ever return a workspace this user belongs to.
  useEffect(() => {
    if (!user) {
      setWorkspace(null)
      setWorkspaceError(null)
      return undefined
    }

    let active = true

    ;(async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspaces (id, name)')
        .limit(1)
        .maybeSingle()

      if (!active) return

      if (error) {
        setWorkspaceError(error)
        setWorkspace(null)
        return
      }

      setWorkspaceError(null)
      setWorkspace(data?.workspaces ? { ...data.workspaces, role: data.role } : null)
    })()

    return () => {
      active = false
    }
  }, [user?.id])

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error ?? null }
  }, [])

  /**
   * Returns `needsConfirmation` so the screen can show a "check your inbox"
   * state instead of pretending the user is signed in. With email
   * confirmation switched on — Supabase's default — signUp resolves with a
   * user but no session until the emailed link is clicked.
   */
  const signUp = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Without this, the confirmation link points at the project's Site
        // URL, which defaults to http://localhost:3000 — the wrong port for
        // a Vite app, so the link lands on nothing. Sending the current
        // origin makes the link follow wherever the app is actually served,
        // in dev and in production alike.
        //
        // Supabase still checks this against the project's allow-list, so
        // the origin must also be listed under Authentication → URL
        // Configuration.
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    if (error) return { error, needsConfirmation: false }
    return { error: null, needsConfirmation: !data.session }
  }, [])

  /**
   * Renames the current workspace. Lives here rather than in a data hook
   * because the workspace is this context's concern — every other consumer
   * reads its name from here, so the rename has to update it here too.
   * RLS already allows members to rename their own workspace.
   */
  const renameWorkspace = useCallback(
    async (name) => {
      const trimmed = String(name ?? '').trim()
      if (!trimmed) return { error: new Error('Give your workspace a name.') }
      if (!workspace?.id) return { error: new Error('No workspace loaded yet.') }

      const { error } = await supabase.from('workspaces').update({ name: trimmed }).eq('id', workspace.id)
      if (error) return { error }
      setWorkspace((current) => (current ? { ...current, name: trimmed } : current))
      return { error: null }
    },
    [workspace?.id],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error ?? null }
  }, [])

  const value = useMemo(
    () => ({ user, session, workspace, loading, workspaceError, signIn, signUp, signOut, renameWorkspace }),
    [user, session, workspace, loading, workspaceError, signIn, signUp, signOut, renameWorkspace],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
