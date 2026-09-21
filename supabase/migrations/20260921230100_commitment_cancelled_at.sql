-- Phase 4 — when a commitment stopped counting.
--
-- The trend chart plots total annualised exposure month by month, which
-- needs to know when each commitment entered and left the picture.
-- `created_at` gives the first half; `status` only ever gave the present
-- tense, so there was no way to know *when* something was cancelled.
--
-- Nullable, and only written from now on: rows cancelled before this column
-- existed have status = 'cancelled' with cancelled_at = null, and the trend
-- function excludes them rather than inventing a date for them.

alter table public.commitments
  add column cancelled_at timestamptz;

alter table public.commitments
  add constraint commitments_cancelled_at_matches_status
  check (status = 'cancelled' or cancelled_at is null);

comment on column public.commitments.cancelled_at is
  'When status last moved to cancelled. Null for active rows, and for rows cancelled before this column existed.';
