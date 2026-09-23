import { supabase } from './supabaseClient.js'

/**
 * Permanently deletes the signed-in account through the delete-account Edge
 * Function, then clears the local session.
 *
 * `confirm` must be the literal string the user typed. The function checks
 * it independently, so the typed confirmation can't be bypassed by calling
 * this directly.
 */
export async function deleteAccount(confirm) {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm } })
  if (error) {
    // functions.invoke wraps non-2xx responses; the useful message is in
    // the body the function returned.
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // Keep the generic message.
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)

  // The account no longer exists, so its tokens are dead; sign out locally
  // so the app returns to the sign-in screen rather than failing requests.
  await supabase.auth.signOut({ scope: 'local' })
  return data
}
