# Supabase — schema & policies

Phase 1 of the v2 refactor. Migrations only: no application code reads this
schema yet. The frontend is still `localStorage`-backed until Phase 3.

## Applying these migrations

These have been **syntax-verified but never executed** — they were written on
a machine with no Docker and no Postgres, so the first real run will be yours.
Expect to fix something.

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

To try them locally first (needs Docker):

```bash
supabase start
supabase db reset
```

## Migration order

| File | Contents |
| --- | --- |
| `…210000_workspaces_and_membership.sql` | `workspaces`, `workspace_members`, the `is_workspace_member()` RLS helper, the signup trigger |
| `…210100_commitments_and_decision_log.sql` | `commitments`, `decision_log` |
| `…210200_reference_tables.sql` | `merchant_patterns`, `cancellation_guides` |
| `…210300_bank_sync_tables.sql` | `bank_connections`, `bank_connection_secrets`, `transactions` |

Later files depend on earlier ones (`set_updated_at()`, `is_workspace_member()`,
and two composite foreign-key targets), so they must run in filename order.

## Two things worth knowing before you extend this

**`is_workspace_member()` is `SECURITY DEFINER` on purpose.** Every policy
routes its membership test through it. If it were a normal function, the policy
on `workspace_members` would query `workspace_members` and Postgres would
recurse. It sets `search_path = ''` and schema-qualifies every identifier,
which is the required counterweight to `SECURITY DEFINER`.

**`bank_connection_secrets` has no policies, and that is the feature.** RLS is
enabled with zero policies, so every `anon`/`authenticated` query returns no
rows; only `service_role` — i.e. Edge Functions — can read a Plaid token.
Privileges are revoked from the client roles as well, so a policy added there
by mistake in a later migration still grants nothing.

## Verification status

Parsed against the real PostgreSQL grammar (libpg-query): 63 statements across
4 files, all valid. RLS confirmed enabled on all 9 tables. **Not executed** —
no constraint, trigger, policy or foreign key here has ever run against a live
database.
