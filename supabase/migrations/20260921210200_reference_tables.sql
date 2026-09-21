-- Phase 1 / 3 of 4 — shared reference data.
--
-- These two tables are the deliberate exception to "every domain table is
-- keyed by workspace_id". They hold curated, app-wide reference data that is
-- identical for every workspace — not user data — so scoping them per
-- workspace would mean duplicating the same rows for every account.
--
-- They are readable by any signed-in user and writable only by service_role
-- (migrations and Edge Functions). Both are created empty; curating the UK
-- provider list belongs with Phases 6 and 8, which are the features that
-- consume it.

-- ---------------------------------------------------------------------------
-- merchant_patterns
--
-- The single lookup source shared by two features, per the brief: Phase 6
-- matches bank transaction descriptions against it, and Phase 8 fuzzy-matches
-- commitment names against it to find a cancellation guide. One table so the
-- two cannot drift apart.
-- ---------------------------------------------------------------------------

create table public.merchant_patterns (
  id                 uuid primary key default gen_random_uuid(),

  -- Interpreted according to match_type. 'contains' is a plain
  -- case-insensitive substring test; 'regex' is a Postgres regular
  -- expression. Keeping both means simple entries don't need escaping.
  pattern            text not null check (length(btrim(pattern)) > 0),
  match_type         text not null default 'contains' check (match_type in ('contains', 'regex')),

  provider_name      text not null check (length(btrim(provider_name)) > 0),
  -- Same four categories as commitments.category, inlined rather than
  -- shared via a function: CHECK constraints are only re-validated on
  -- write, so a function-backed check can silently stop matching the
  -- rows already in the table if the function is later redefined.
  suggested_category text check (
    suggested_category is null
    or suggested_category in ('Streaming', 'Retail BNPL', 'Other subscriptions', 'Other')
  ),

  created_at         timestamptz not null default now(),

  unique (pattern, match_type)
);

create index merchant_patterns_provider_name_idx on public.merchant_patterns (provider_name);

-- ---------------------------------------------------------------------------
-- cancellation_guides
--
-- Informational only: where to go and what to do. Nothing in this schema or
-- the features built on it performs a cancellation on a user's behalf.
-- ---------------------------------------------------------------------------

create table public.cancellation_guides (
  id            uuid primary key default gen_random_uuid(),

  -- The soft join key back to merchant_patterns.provider_name. Not a foreign
  -- key in either direction: a pattern may exist with no guide written yet,
  -- and a guide may exist for a provider no bank pattern matches. If this
  -- pairing ever needs to be enforced, a `providers` table is the place for
  -- it rather than an FK that forces one table to lead the other.
  provider_name text not null unique check (length(btrim(provider_name)) > 0),

  cancel_url    text check (cancel_url is null or cancel_url ~* '^https://'),
  phone         text,
  steps         text[] not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger cancellation_guides_set_updated_at
  before update on public.cancellation_guides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Read-only to every signed-in user; no insert/update/delete policies at all,
-- so writes are possible only via service_role, which bypasses RLS.
-- ---------------------------------------------------------------------------

alter table public.merchant_patterns   enable row level security;
alter table public.cancellation_guides enable row level security;

create policy "merchant patterns are readable by signed-in users"
  on public.merchant_patterns for select
  to authenticated
  using (true);

create policy "cancellation guides are readable by signed-in users"
  on public.cancellation_guides for select
  to authenticated
  using (true);

grant select on public.merchant_patterns   to authenticated;
grant select on public.cancellation_guides to authenticated;
