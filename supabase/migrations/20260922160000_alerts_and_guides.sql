-- Phase 8 — email alerts and cancellation guides.

-- ---------------------------------------------------------------------------
-- Alert preference
--
-- Opt-in, defaulting to off. The app already treats notifications this way:
-- browser reminders in SettingsMenu ask before they fire. Email is more
-- intrusive than a browser notification, not less, so it gets the same
-- treatment. A workspace with this off is skipped entirely by send-alerts.
-- ---------------------------------------------------------------------------

alter table public.workspace_members
  add column email_alerts_enabled boolean not null default false;

-- Members may change their own preference. Membership itself still cannot be
-- written from the client — this policy is scoped to the member's own row.
create policy "members can update their own alert preference"
  on public.workspace_members for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (email_alerts_enabled) on public.workspace_members to authenticated;

-- ---------------------------------------------------------------------------
-- Cancellation guides
--
-- Informational only. Nothing in this app contacts a provider on anyone's
-- behalf, and the BNPL entries below say plainly that an instalment plan is a
-- debt rather than a subscription — a "cancellation guide" that implied
-- otherwise would be actively misleading about money someone owes.
--
-- provider_name matches merchant_patterns.provider_name exactly, which is the
-- join key the UI fuzzy-matches a commitment's name through.
-- ---------------------------------------------------------------------------

insert into public.cancellation_guides (provider_name, cancel_url, phone, steps) values
  ('Netflix', 'https://www.netflix.com/cancelplan', null,
   array['Sign in and open Account.', 'Choose Cancel Membership.', 'You keep access until the end of the paid period.']),

  ('Spotify', 'https://www.spotify.com/account/subscription/', null,
   array['Open your account page and choose Available plans.', 'Pick Spotify Free and confirm.', 'Premium runs until the next billing date.']),

  ('Disney+', 'https://www.disneyplus.com/account/subscription', null,
   array['Open Account, then Subscription.', 'Choose Cancel Subscription.']),

  ('Amazon Prime', 'https://www.amazon.co.uk/mc/yourprimemembership', null,
   array['Open Your Prime Membership.', 'Choose End Membership.', 'Check whether a partial refund applies if you have not used the benefits.']),

  ('YouTube Premium', 'https://www.youtube.com/paid_memberships', null,
   array['Open Paid memberships.', 'Choose Manage, then Deactivate.']),

  ('Audible', 'https://www.audible.co.uk/account/membership', null,
   array['Open Account Details.', 'Choose Cancel membership.', 'Credits you already hold may expire — check before cancelling.']),

  ('Apple', 'https://apps.apple.com/account/subscriptions', null,
   array['Open Subscriptions in the App Store or Settings.', 'Pick the subscription and choose Cancel.']),

  ('Adobe', 'https://account.adobe.com/plans', null,
   array['Open Plans, then Manage plan.', 'Choose Cancel your plan.', 'An annual plan paid monthly may carry an early-termination fee.']),

  ('Microsoft 365', 'https://account.microsoft.com/services', null,
   array['Open Services & subscriptions.', 'Choose Manage, then Cancel subscription.']),

  ('Google One', 'https://one.google.com/settings', null,
   array['Open Google One settings.', 'Choose Cancel membership.', 'Storage drops back to the free tier — move files first if you are over it.']),

  ('Dropbox', 'https://www.dropbox.com/account/plan', null,
   array['Open Settings, then Plan.', 'Choose Cancel plan.']),

  ('Strava', 'https://www.strava.com/settings/subscription', null,
   array['Open Settings, then Subscription.', 'Choose Cancel subscription.']),

  -- Gyms are usually contractual rather than click-to-cancel, so these are
  -- steps rather than a URL that would imply otherwise.
  ('PureGym', null, null,
   array['Sign in and open Manage my membership.', 'Check your minimum term and notice period first.', 'Cancelling a direct debit is not the same as cancelling the membership.']),

  ('The Gym Group', null, null,
   array['Sign in and open your membership settings.', 'Check the notice period before cancelling.', 'Cancelling a direct debit is not the same as cancelling the membership.']),

  -- BNPL: these are credit agreements, not subscriptions. Saying so is the
  -- most useful thing this table can do for them.
  ('Klarna', null, null,
   array['An instalment plan is money you owe — it cannot be cancelled like a subscription.', 'You can pay it off early in the Klarna app at no extra cost.', 'If the payments are unaffordable, contact Klarna about the schedule before a payment is missed.']),

  ('Clearpay', null, null,
   array['An instalment plan is money you owe — it cannot be cancelled like a subscription.', 'You can pay the balance off early in the Clearpay app.', 'If a payment will be missed, contact Clearpay first — late fees may apply.']),

  ('Zilch', null, null,
   array['An instalment plan is money you owe — it cannot be cancelled like a subscription.', 'Pay the remaining balance early in the Zilch app if you can.', 'Contact Zilch before missing a payment.']),

  ('PayPal Pay in 3', null, null,
   array['An instalment plan is money you owe — it cannot be cancelled like a subscription.', 'Open the PayPal app, find the plan, and pay it off early if you can.', 'Contact PayPal before missing a payment.'])
on conflict (provider_name) do nothing;
