-- Phase 9 follow-up — corrections from actually visiting the cancel URLs.
--
-- Four of the twelve seeded links were wrong. They were curated from
-- knowledge rather than by opening them, which is exactly the failure mode
-- the README's "Known gaps" section warned about. Checked with a real
-- browser where the site blocks scripted requests.
--
-- Verified good and left alone: Adobe, Amazon Prime, Dropbox, Google One,
-- Microsoft 365, Netflix, YouTube Premium. Each reaches either the page
-- itself or a sign-in that carries the destination forward.

-- Audible: /account/membership is a 404 dressed as a friendly page.
-- /account/settings correctly reaches the Audible-branded Amazon sign-in.
update public.cancellation_guides
set cancel_url = 'https://www.audible.co.uk/account/settings'
where provider_name = 'Audible';

-- Disney+: the seeded path redirects here; point at the destination.
update public.cancellation_guides
set cancel_url = 'https://www.disneyplus.com/commerce/subscription'
where provider_name = 'Disney+';

-- Spotify: /account/subscription/ redirects to the account overview, which
-- is where the plan actually lives and what the steps already describe.
update public.cancellation_guides
set cancel_url = 'https://www.spotify.com/account/overview/'
where provider_name = 'Spotify';

-- Strava: /settings/subscription is a hard 404, and no candidate path
-- reached a management page while signed out. No link beats a wrong one —
-- the same call already made for gyms and BNPL.
update public.cancellation_guides
set cancel_url = null,
    steps = array[
      'Open Settings from your profile, then find your subscription.',
      'Choose to cancel — it stays active until the end of the paid period.',
      'Cancelling in the app store instead, if you subscribed there, is what actually stops the billing.'
    ]
where provider_name = 'Strava';

-- Apple: apps.apple.com/account/subscriptions drops its path and lands on
-- the Apple ID sign-in root, so the link does not take anyone anywhere
-- useful. Apple subscriptions are genuinely managed in the App Store app or
-- in Settings rather than on the web, so the steps are the honest answer.
update public.cancellation_guides
set cancel_url = null,
    steps = array[
      'On iPhone or iPad: Settings, tap your name, then Subscriptions.',
      'On Mac: App Store, click your name, then Account Settings.',
      'Pick the subscription and choose Cancel. It runs until the period ends.'
    ]
where provider_name = 'Apple';
