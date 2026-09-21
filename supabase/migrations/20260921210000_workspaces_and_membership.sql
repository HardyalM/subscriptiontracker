-- Phase 1 / 1 of 4 — tenancy foundation.
--
-- The app is single-user in its UI for v2, but `workspace` is the unit of
-- data ownership from this first migration onward. Every domain table is
-- keyed by workspace_id and never directly by user_id, so enabling real
-- multi-user later is a UI + policy change rather than a migration.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'member');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.workspace_role not null default 'owner',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest without the client having to remember to send it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- The single membership test every RLS policy in this schema goes through.
--
-- SECURITY DEFINER is load-bearing, not incidental: it lets this function
-- read workspace_members with RLS bypassed. Without it, the policy ON
-- workspace_members would have to query workspace_members, and Postgres
-- would recurse. `set search_path = ''` is the matching safety measure —
-- a SECURITY DEFINER function with a mutable search_path is a privilege
-- escalation risk, so every identifier below is schema-qualified.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auto-provision one personal workspace per new user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  insert into public.workspaces (name)
  values ('Personal')
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;

-- Workspaces are readable and renameable by their members. They are never
-- created or deleted from the client: creation is the signup trigger's job,
-- and deletion would orphan a user's entire dataset.
create policy "workspaces are readable by members"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces are renameable by members"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

-- A member can see the membership list of any workspace they belong to.
-- The `user_id = auth.uid()` arm is what makes the very first read work:
-- immediately after signup the helper would otherwise be asked to prove
-- membership using the row it is being asked about.
create policy "members can read their own memberships"
  on public.workspace_members for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_workspace_member(workspace_id));

-- No insert/update/delete policies on workspace_members by design. v2 has no
-- invite flow, so membership is written only by the signup trigger (which runs
-- as SECURITY DEFINER) and by service_role. Adding a client-side insert policy
-- here would let any authenticated user join any workspace by id.

grant select, update on public.workspaces        to authenticated;
grant select          on public.workspace_members to authenticated;
