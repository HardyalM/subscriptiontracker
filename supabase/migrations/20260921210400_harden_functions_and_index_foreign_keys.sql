-- Phase 1 follow-up — advisor findings from the first live run.
--
-- Three fixes, all raised by Supabase's database linter after the Phase 1
-- schema was applied to the project. None change the shape of the schema.

-- ---------------------------------------------------------------------------
-- 1. set_updated_at() had a mutable search_path (lint 0011).
--
-- The other two functions in this schema pin it; this one was missed. It is
-- SECURITY INVOKER so the exposure is smaller, but a trigger function that
-- resolves identifiers through the caller's search_path is still a hazard.
-- now() lives in pg_catalog, which is always searched, but it is qualified
-- here so the body does not depend on that.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. handle_new_user() was EXECUTE-able by anon and authenticated (lints
--    0028 / 0029).
--
-- In practice Postgres refuses to call a trigger-returning function directly,
-- so this was not exploitable — but a SECURITY DEFINER function that inserts
-- rows should not be reachable from the REST surface at all. Only the trigger
-- on auth.users needs it, and triggers do not consult EXECUTE grants.
--
-- is_workspace_member() keeps its grant to `authenticated` deliberately: RLS
-- policy expressions are evaluated as the querying role, so revoking it would
-- break every policy in the schema. The linter flags it; the only thing it
-- discloses is whether the caller is a member of a workspace id they already
-- hold, so it stays.
-- ---------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Composite foreign keys had no covering index (lint 0001).
--
-- Both are ON DELETE CASCADE, so an unindexed FK means deleting a parent row
-- scans the whole child table. The single-column indexes are dropped because
-- the new composites lead with the same column and serve those lookups too.
-- ---------------------------------------------------------------------------

create index if not exists decision_log_commitment_workspace_idx
  on public.decision_log (commitment_id, workspace_id);
drop index if exists public.decision_log_commitment_id_idx;

create index if not exists transactions_connection_workspace_idx
  on public.transactions (bank_connection_id, workspace_id);
drop index if exists public.transactions_bank_connection_id_idx;

create index if not exists transactions_matched_pattern_id_idx
  on public.transactions (matched_pattern_id);
