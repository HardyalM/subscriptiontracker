-- Phase 6 — a starting set of UK merchant patterns.
--
-- Matched against the raw description a bank puts on a transaction, which is
-- rarely the tidy brand name: Spotify shows up as "SPOTIFY P1A2B3C4D5",
-- Klarna as "KLARNA*TRAINERS". Patterns are therefore substrings of what the
-- statement actually says, not what the company calls itself.
--
-- Curated, not exhaustive. A pattern that is missing produces no suggestion,
-- which is the safe failure: the user adds it by hand, as they do today.
-- A pattern that is too broad produces a wrong suggestion, which is why
-- nothing here is auto-confirmed.

insert into public.merchant_patterns (pattern, match_type, provider_name, suggested_category) values
  -- Streaming and media
  ('NETFLIX',        'contains', 'Netflix',           'Streaming'),
  ('SPOTIFY',        'contains', 'Spotify',           'Streaming'),
  ('DISNEY PLUS',    'contains', 'Disney+',           'Streaming'),
  ('DISNEYPLUS',     'contains', 'Disney+',           'Streaming'),
  ('PRIME VIDEO',    'contains', 'Amazon Prime Video','Streaming'),
  ('AMAZON PRIME',   'contains', 'Amazon Prime',      'Streaming'),
  ('NOW TV',         'contains', 'NOW',               'Streaming'),
  ('SKY DIGITAL',    'contains', 'Sky',               'Streaming'),
  ('APPLE.COM/BILL', 'contains', 'Apple',             'Streaming'),
  ('YOUTUBEPREMIUM', 'contains', 'YouTube Premium',   'Streaming'),
  ('AUDIBLE',        'contains', 'Audible',           'Streaming'),
  ('DAZN',           'contains', 'DAZN',              'Streaming'),
  ('PARAMOUNT',      'contains', 'Paramount+',        'Streaming'),

  -- Buy now, pay later
  ('KLARNA',         'contains', 'Klarna',            'Retail BNPL'),
  ('CLEARPAY',       'contains', 'Clearpay',          'Retail BNPL'),
  ('AFTERPAY',       'contains', 'Clearpay',          'Retail BNPL'),
  ('LAYBUY',         'contains', 'Laybuy',            'Retail BNPL'),
  ('ZILCH',          'contains', 'Zilch',             'Retail BNPL'),
  ('PAYPAL PAY IN 3','contains', 'PayPal Pay in 3',   'Retail BNPL'),
  ('BUTTER',         'contains', 'Butter',            'Retail BNPL'),

  -- Everything else recurring
  ('PURE GYM',       'contains', 'PureGym',           'Other subscriptions'),
  ('PUREGYM',        'contains', 'PureGym',           'Other subscriptions'),
  ('THE GYM',        'contains', 'The Gym Group',     'Other subscriptions'),
  ('ADOBE',          'contains', 'Adobe',             'Other subscriptions'),
  ('MICROSOFT 365',  'contains', 'Microsoft 365',     'Other subscriptions'),
  ('GOOGLE ONE',     'contains', 'Google One',        'Other subscriptions'),
  ('DROPBOX',        'contains', 'Dropbox',           'Other subscriptions'),
  ('STRAVA',         'contains', 'Strava',            'Other subscriptions'),
  ('DUOLINGO',       'contains', 'Duolingo',          'Other subscriptions')
on conflict (pattern, match_type) do nothing;
