-- Phase 9 — privilege hardening.
--
-- Revoke anon's table privileges across the domain schema.
--
-- Supabase's default privileges grant anon SELECT on new tables in public,
-- and only RLS was stopping it returning rows. That is the documented model
-- and nothing leaked — a signed-out request already got zero rows — but the
-- explicit GRANTs in the Phase 1 migrations implied a tightness that was not
-- actually there. Nothing in this app is readable signed-out, so the
-- privilege should not exist either. Defence in depth: a future policy
-- written `to public` instead of `to authenticated` now grants nothing
-- rather than everything.

revoke all on public.workspaces            from anon;
revoke all on public.workspace_members     from anon;
revoke all on public.commitments           from anon;
revoke all on public.decision_log          from anon;
revoke all on public.merchant_patterns     from anon;
revoke all on public.cancellation_guides   from anon;
revoke all on public.bank_connections      from anon;
revoke all on public.transactions          from anon;
revoke all on public.suggested_commitments from anon;

-- Stop the same default applying to whatever is created next.
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------------------
-- Known, unfixable-from-here: pg_net's EXECUTE grant
--
-- pg_net installs into a `net` schema owned by supabase_admin, and grants
-- EXECUTE on its functions to PUBLIC. That means anon and authenticated can
-- in principle call net.http_post — a function that makes the database issue
-- arbitrary outbound HTTP.
--
-- It is not reachable through the API as configured: PostgREST only exposes
-- `public` and `graphql_public`, and `net` is neither. The exposure would
-- become real if `net` were ever added to the exposed schema list, or if a
-- SECURITY DEFINER function in `public` called it on a caller's behalf.
-- Neither is true here.
--
-- It cannot be revoked from this migration. REVOKE only has effect when run
-- by the privilege's grantor, and these were granted by supabase_admin;
-- migrations and the SQL editor both run as `postgres`, so a revoke here
-- silently does nothing rather than failing loudly. An earlier version of
-- this file contained those revokes and appeared to succeed — it did not.
--
-- Mitigation is therefore procedural, and belongs in a deployment checklist
-- rather than in SQL: never add `net` to the exposed schemas, and never wrap
-- net.* in a SECURITY DEFINER function in public. The same caveat applies to
-- every Supabase project that uses pg_cron with pg_net.
-- ---------------------------------------------------------------------------
