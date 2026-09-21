-- Phase 4 — recurring BNPL plans.
--
-- 'fixed' is today's behaviour: N instalments, ends when they reach zero.
-- 'recurring' is an open-ended BNPL line that behaves like a subscription
-- once each instalment block completes — it advances its date without ever
-- coming to rest at zero.
--
-- The default is 'fixed', so every existing row keeps behaving exactly as it
-- did and applyKeepDecision's current tests stay valid.

alter table public.commitments
  add column bnpl_mode text not null default 'fixed'
  check (bnpl_mode in ('fixed', 'recurring'));

-- The column is meaningless for subscriptions, so it is pinned rather than
-- left free to drift — the same approach as commitments_bnpl_fields_match_type.
alter table public.commitments
  add constraint commitments_bnpl_mode_matches_type
  check (type = 'bnpl' or bnpl_mode = 'fixed');
