-- Phase 6 — suggestions from bank sync.
--
-- A suggestion is not a commitment. It is a guess, derived from one bank
-- transaction, that the user has not agreed to yet.
--
-- This is a separate table rather than a 'suggested' value on
-- commitments.status on purpose. `commitments` means "things this person has
-- confirmed they owe", and every query, export, total and filter in the app
-- reads it on that basis. A third status would silently widen all of them,
-- and the fields a suggestion needs — which transaction produced it, which
-- pattern matched, whether it was dismissed — are not commitment fields.

create table public.suggested_commitments (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null,
  transaction_id     uuid not null,

  -- What we think this is. Deliberately the same column names and CHECKs as
  -- commitments, so accepting a suggestion is a copy rather than a
  -- translation.
  name               text not null check (length(btrim(name)) > 0),
  type               text not null check (type in ('subscription', 'bnpl')),
  cost_per_payment   numeric(12, 2) not null check (cost_per_payment > 0),
  frequency          text not null default 'monthly'
                     check (frequency in ('weekly', 'monthly', 'one-off installments')),
  next_payment_date  date not null,
  category           text not null
                     check (category in ('Streaming', 'Retail BNPL', 'Other subscriptions', 'Other')),

  matched_pattern_id uuid references public.merchant_patterns (id) on delete set null,

  -- 'pending' until the user acts. Nothing is ever auto-confirmed: a
  -- one-off charge that happens to look like Netflix must not quietly become
  -- a commitment.
  status             text not null default 'pending'
                     check (status in ('pending', 'accepted', 'dismissed')),
  resolved_at        timestamptz,

  created_at         timestamptz not null default now(),

  -- One suggestion per transaction, so a webhook replay cannot produce
  -- duplicates.
  unique (transaction_id),

  foreign key (transaction_id, workspace_id)
    references public.transactions (id, workspace_id)
    on delete cascade
);

create index suggested_commitments_workspace_status_idx
  on public.suggested_commitments (workspace_id, status);

-- transactions needs a composite unique for the FK above to target.
alter table public.transactions
  add constraint transactions_id_workspace_id_key unique (id, workspace_id);

alter table public.suggested_commitments enable row level security;

create policy "suggestions are readable by workspace members"
  on public.suggested_commitments for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Members accept or dismiss; they never create one by hand. Creation is the
-- webhook's job, via service_role.
create policy "suggestions are updatable by workspace members"
  on public.suggested_commitments for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

grant select, update on public.suggested_commitments to authenticated;
