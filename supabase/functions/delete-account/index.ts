// Permanently deletes the caller's account and everything it owns.
//
// Why this is a function and not a client call: removing an auth user needs
// service_role, which never leaves the server.
//
// Why the order matters. Deleting only the auth user cascades to
// workspace_members and nothing else — the workspace, every commitment, the
// decision history and any bank data would be left behind, orphaned: no
// longer reachable through RLS, but still stored. So data goes first:
//
//   1. receipt images in Storage — nothing links them by foreign key, so
//      no cascade would ever reach them
//   2. the workspace — cascades to commitments -> decision_log,
//      bank_connections -> secrets / transactions -> suggestions, and
//      workspace_members (verified against the live FK graph)
//   3. the auth user
//
// If step 3 fails after step 2, the account survives with no data. That is
// reported plainly rather than papered over: the person asked for their
// data to be deleted, and it has been.
//
// A workspace with other members is not deleted — only this person's
// membership is. v2 has no invite flow so this can't happen today, but the
// schema is multi-tenant by design, and one member deleting their account
// must never destroy someone else's data.

import { corsHeaders, json, fail, requireWorkspace, serviceClient } from '../_shared/http.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const auth = await requireWorkspace(req)
    if ('error' in auth) return fail(`delete-account: ${auth.error}`, auth.error, 401)

    // The UI makes the person type DELETE. Checking it here too means a
    // stray or scripted call can't skip that step.
    const body = await req.json().catch(() => ({}))
    if (body?.confirm !== 'DELETE') {
      return fail('delete-account: missing confirmation', 'Type DELETE to confirm.', 400)
    }

    const db = serviceClient()
    const { user, workspaceId } = auth

    const { count: memberCount, error: countError } = await db
      .from('workspace_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
    if (countError) return fail(`delete-account: count: ${countError.message}`, 'Could not check your workspace.', 500)

    const soleMember = (memberCount ?? 0) <= 1

    if (soleMember) {
      // 1. Receipts. list() is not recursive and pages at 100 by default, so
      // loop until the folder is empty.
      for (let round = 0; round < 50; round += 1) {
        const { data: files, error: listError } = await db.storage.from('receipts').list(workspaceId, { limit: 100 })
        if (listError) return fail(`delete-account: list: ${listError.message}`, 'Could not remove your receipts.', 500)
        if (!files || files.length === 0) break
        const { error: removeError } = await db.storage
          .from('receipts')
          .remove(files.map((f) => `${workspaceId}/${f.name}`))
        if (removeError) return fail(`delete-account: remove: ${removeError.message}`, 'Could not remove your receipts.', 500)
      }

      // 2. The workspace, and by cascade everything in it.
      const { error: workspaceError } = await db.from('workspaces').delete().eq('id', workspaceId)
      if (workspaceError) {
        return fail(`delete-account: workspace: ${workspaceError.message}`, 'Could not delete your data. Nothing was removed.', 500)
      }
    } else {
      const { error: leaveError } = await db
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
      if (leaveError) return fail(`delete-account: leave: ${leaveError.message}`, 'Could not remove you from the workspace.', 500)
    }

    // 3. The account itself.
    const { error: userError } = await db.auth.admin.deleteUser(user.id)
    if (userError) {
      return fail(
        `delete-account: user ${user.id}: ${userError.message}`,
        'Your data was deleted, but the account itself could not be removed. Contact support to finish.',
        500,
      )
    }

    return json({ deleted: true, workspaceDeleted: soleMember })
  } catch (err) {
    return fail(`delete-account: ${err}`, 'Account deletion failed.', 500)
  }
})
