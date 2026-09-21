-- Phase 1 / 4 of 4 — Plaid Sandbox tables.
--
-- Created now so the schema is complete, but nothing reads or writes them
-- until Phase 6. No table here is ever populated from real bank credentials:
-- plaid_env is constrained to 'sandbox' at the database level, so a
-- misconfigured Edge Function fails loudly on insert rather than quietly
-- storing a production item.
--
-- The Plaid access_token is split into its own table rather than living as a
-- column on bank_connections. Postgres RLS is row-level, not column-level, so
-- a single table cannot be simultaneously client-readable (for the
-- "Connected — sandbox data" label the UI has to show) and client-unreadable
-- (for the token). Splitting is what lets both be true without a view.

-- ---------------------------------------------------------------------------
-- bank_connections — safe metadata, readable by workspace members
-- ---------------------------------------------------------------------------

create table public.bank_connections (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,

  plaid_item_id    text not null unique,
  institution_name text,

  -- Section 0 of the brief, enforced in the database: sandbox only, never
  -- production. Widening this is a deliberate migration, not a config change.
  plaid_env        text not null default 'sandbox' check (plaid_env = 'sandbox'),

  status           text not null default 'active' check (status in ('active', 'error', 'disconnected')),

  -- Plaid's /transactions/sync cursor. Not a secret, but Edge-Function-owned.
  sync_cursor      text,
  last_synced_at   timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (id, workspace_id)
);

create index bank_connections_workspace_id_idx on public.bank_connections (workspace_id);

create trigger bank_connections_set_updated_at
  before update on public.bank_connections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- bank_connection_secrets — the token. Never reachable from the client.
-- ---------------------------------------------------------------------------

create table public.bank_connection_secrets (
  bank_connection_id     uuid primary key
                         references public.bank_connections (id) on delete cascade,
  access_token_encrypted text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger bank_connection_secrets_set_updated_at
  before update on public.bank_connection_secrets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions — synced from Plaid Sandbox
-- ---------------------------------------------------------------------------

create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null,
  bank_connection_id   uuid not null,

  plaid_transaction_id text not null unique,

  -- Raw description as Plaid reports it; this is what merchant_patterns is
  -- matched against.
  description          text not null,
  merchant_name        text,
  amount               numeric(12, 2) not null,
  iso_currency_code    text not null default 'GBP',
  transacted_on        date not null,
  pending              boolean not null default false,

  -- Which pattern produced a suggestion from this row, if any. ON DELETE SET
  -- NULL so retiring a pattern does not delete transaction history.
  matched_pattern_id   uuid references public.merchant_patterns (id) on delete set null,

  created_at           timestamptz not null default now(),

  foreign key (bank_connection_id, workspace_id)
    references public.bank_connections (id, workspace_id)
    on delete cascade
);

create index transactions_workspace_date_idx on public.transactions (workspace_id, transacted_on desc);
create index transactions_bank_connection_id_idx on public.transactions (bank_connection_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.bank_connections        enable row level security;
alter table public.bank_connection_secrets enable row level security;
alter table public.transactions            enable row level security;

-- Members may see that a connection exists and disconnect it. They may not
-- create or edit one: both are Edge Function work, because both require the
-- Plaid token exchange.
create policy "bank connections are readable by workspace members"
  on public.bank_connections for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "bank connections are deletable by workspace members"
  on public.bank_connections for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "transactions are readable by workspace members"
  on public.transactions for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Transactions are written only by the plaid-webhook Edge Function via
-- service_role — there is no legitimate client-side insert.

-- bank_connection_secrets deliberately has NO policies whatsoever. With RLS
-- enabled and no policy, every anon/authenticated query returns zero rows.
-- Only service_role, which bypasses RLS, can reach the token.

grant select, delete on public.bank_connections to authenticated;
grant select         on public.transactions     to authenticated;

-- Belt and braces: even if a future migration adds a policy to the secrets
-- table by mistake, the client roles hold no table privileges to use it.
revoke all on public.bank_connection_secrets from anon, authenticated;
