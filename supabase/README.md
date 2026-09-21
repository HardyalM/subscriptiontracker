# Supabase — schema & policies

Phase 1 of the v2 refactor. Migrations only: no application code reads this
schema yet. The frontend is still `localStorage`-backed until Phase 3.

Applied to project `ikciulwowowqqftwajss` (**Subscription Tracker Hardyal**,
eu-west-1, Postgres 17.6) on 2026-09-21.

## Migration order

| File | Contents |
| --- | --- |
| `…210000_workspaces_and_membership.sql` | `workspaces`, `workspace_members`, the `is_workspace_member()` RLS helper, the signup trigger |
| `…210100_commitments_and_decision_log.sql` | `commitments`, `decision_log` |
| `…210200_reference_tables.sql` | `merchant_patterns`, `cancellation_guides` |
| `…210300_bank_sync_tables.sql` | `bank_connections`, `bank_connection_secrets`, `transactions` |
| `…210400_harden_functions_and_index_foreign_keys.sql` | Follow-up fixes for the database linter's findings on the first live run |

Later files depend on earlier ones (`set_updated_at()`, `is_workspace_member()`,
and two composite foreign-key targets), so they must run in filename order.

## Two things worth knowing before you extend this

**`is_workspace_member()` is `SECURITY DEFINER` on purpose.** Every policy
routes its membership test through it. If it were a normal function, the policy
on `workspace_members` would query `workspace_members` and Postgres would
recurse. It sets `search_path = ''` and schema-qualifies every identifier,
which is the required counterweight to `SECURITY DEFINER`.

The database linter flags it as callable via `/rest/v1/rpc/`. That grant is
load-bearing — RLS policy expressions run as the querying role, so revoking it
breaks every policy in the schema. All it discloses is whether the caller is a
member of a workspace id they already hold.

**`bank_connection_secrets` has no policies, and that is the feature.** RLS is
enabled with zero policies, so every `anon`/`authenticated` query returns no
rows; only `service_role` — i.e. Edge Functions — can read a Plaid token.
Privileges are revoked from the client roles as well, so a policy added there
by mistake in a later migration still grants nothing.

## Verification status

Verified against the live database, not just parsed:

| Check | Result |
| --- | --- |
| All 9 tables exist, RLS enabled on each | pass |
| All 15 policies present, scoped to `authenticated` | pass |
| Signup trigger on `auth.users` | creates exactly one `Personal` workspace + one `owner` membership |
| Policy recursion on `workspace_members` | none — queries as `authenticated` return cleanly |
| Tenancy isolation | user A sees 1 workspace, 0 rows belonging to user B |
| `bank_connection_secrets` as `authenticated` | `42501 permission denied` — correct |
| Security advisors | no outstanding findings that are ours |

The trigger and isolation tests ran inside transactions that were rolled back,
so no test rows remain.

Two advisor warnings persist by design: `bank_connection_secrets` having RLS
with no policies, and `is_workspace_member()` being RPC-callable. A third,
`rls_auto_enable()`, is a Supabase platform function, not part of this schema.
