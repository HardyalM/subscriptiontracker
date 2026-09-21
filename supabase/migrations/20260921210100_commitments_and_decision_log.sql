-- Phase 1 / 2 of 4 — the v1 domain model, made relational.
--
-- `commitments` is a faithful snake_case mapping of the Commitment typedef in
-- src/lib/calculations.js. Column constraints mirror the validation already
-- enforced in CommitmentForm.jsx so the database agrees with the form rather
-- than contradicting it.
--
-- `decisionLog` stops being a JSON array column and becomes a real child
-- table — this is what makes the Phase 4 trend chart a query instead of an
-- application-side reduce over blobs.

-- ---------------------------------------------------------------------------
-- commitments
-- ---------------------------------------------------------------------------

create table public.commitments (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces (id) on delete cascade,

  name                  text not null check (length(btrim(name)) > 0),
  type                  text not null check (type in ('subscription', 'bnpl')),
  cost_per_payment      numeric(12, 2) not null check (cost_per_payment > 0),
  frequency             text not null check (frequency in ('weekly', 'monthly', 'one-off installments')),
  next_payment_date     date not null,

  -- BNPL-only fields. CommitmentForm writes instalments_remaining for BNPL and
  -- null for subscriptions, so that asymmetry is enforced here too.
  total_original_amount numeric(12, 2) check (total_original_amount is null or total_original_amount >= 0),
  instalments_remaining integer        check (instalments_remaining is null or instalments_remaining >= 0),

  status                text not null default 'active' check (status in ('active', 'cancelled')),
  category              text not null check (category in ('Streaming', 'Retail BNPL', 'Other subscriptions', 'Other')),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint commitments_bnpl_fields_match_type check (
    (type = 'bnpl'         and instalments_remaining is not null)
    or
    (type = 'subscription' and instalments_remaining is null)
  ),

  -- Target for decision_log's composite foreign key (see below).
  unique (id, workspace_id)
);

create index commitments_workspace_id_idx on public.commitments (workspace_id);

-- Serves the renewal checkpoint's 7-day lookahead and, later, the Phase 8
-- "due within 48 hours" alert query.
create index commitments_workspace_due_idx
  on public.commitments (workspace_id, next_payment_date)
  where status = 'active';

create trigger commitments_set_updated_at
  before update on public.commitments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- decision_log
-- ---------------------------------------------------------------------------

create table public.decision_log (
  id           uuid primary key default gen_random_uuid(),
  commitment_id uuid not null,
  workspace_id  uuid not null,

  decided_on   date not null,
  decision     text not null check (decision in ('kept', 'reconsidered')),

  -- Nullable on purpose. reconsideredSavingsTotal() in calculations.js treats
  -- a missing amount as "fall back to the commitment's current exposure", so
  -- older entries legitimately have no stored figure. Backfilling this column
  -- would silently rewrite history the app deliberately computes on read.
  amount       numeric(12, 2) check (amount is null or amount >= 0),

  created_at   timestamptz not null default now(),

  -- workspace_id is denormalised so RLS can check membership without a join.
  -- The composite FK is what stops it drifting from the parent commitment:
  -- a row can only exist if (commitment_id, workspace_id) is a real pair.
  foreign key (commitment_id, workspace_id)
    references public.commitments (id, workspace_id)
    on delete cascade
);

create index decision_log_commitment_id_idx on public.decision_log (commitment_id);
create index decision_log_workspace_date_idx on public.decision_log (workspace_id, decided_on);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.commitments  enable row level security;
alter table public.decision_log enable row level security;

create policy "commitments are readable by workspace members"
  on public.commitments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "commitments are insertable by workspace members"
  on public.commitments for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

-- Both USING and WITH CHECK are required: USING decides which rows may be
-- updated, WITH CHECK decides what they may become. Without the latter a
-- member could move a row into another workspace.
create policy "commitments are updatable by workspace members"
  on public.commitments for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "commitments are deletable by workspace members"
  on public.commitments for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "decision log is readable by workspace members"
  on public.decision_log for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "decision log is insertable by workspace members"
  on public.decision_log for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "decision log is deletable by workspace members"
  on public.decision_log for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- No update policy on decision_log. It is an append-only audit of decisions
-- already taken; a kept/reconsidered tap that can be edited after the fact is
-- not a commitment device.

grant select, insert, update, delete on public.commitments  to authenticated;
grant select, insert,         delete on public.decision_log to authenticated;
