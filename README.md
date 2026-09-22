# Subscription & BNPL Tracker

Tracks your recurring subscriptions and buy-now-pay-later (BNPL) commitments
and makes two behavioural-economics effects visible that people normally
don't see:

1. **Present bias** — a £12.99/month cost feels negligible; £155.88/year
   does not. Every commitment shows both, side by side, always.
2. **Payment decoupling** — splitting a cost into instalments makes the
   total feel smaller than it is. One headline number — total annualised
   exposure across everything active right now — is impossible to miss.

The **renewal checkpoint** is the signature feature: anything due within 7
days — or already overdue — gets its own highlighted section with calm,
factual copy ("Renews in 4 days — you'll have paid £156 on this over the
past year"). **Keep it** logs the decision *and* moves the commitment on to
its next cycle (renewal date advances; a BNPL plan's instalment count drops
by one); **Reconsider** just logs the moment, so the item keeps surfacing
here until you've actually resolved it by editing or cancelling. A running
kept-vs-reconsidered count, plus a cumulative "£X kept back by
reconsidering" figure, is what makes this a commitment device rather than
just a reminder.

## Architecture

v2 is a Supabase-backed application. v1 was a single-user, browser-only app
with no backend; everything below the UI layer was replaced across a phased
refactor, and `src/lib/calculations.js` came through it unchanged.

| Layer | What runs there |
| --- | --- |
| React 18 + Vite + Tailwind | UI. No router; one screen behind an auth gate |
| TanStack Query | the only data-fetching and caching layer |
| Supabase Postgres | ten tables, RLS on every one |
| Supabase Auth | email/password, one workspace auto-provisioned per user |
| Supabase Edge Functions (Deno) | everything that touches a secret |
| Supabase Storage | private bucket for uploaded receipts |
| pg_cron + pg_net | the daily alert run |

### Workspace-first tenancy

The app is single-user in its UI — there is no invite flow and no sharing.
But `workspace` is the unit of data ownership in the schema, from the first
migration: every domain table is keyed by `workspace_id`, never by `user_id`,
and every RLS policy tests membership through one `SECURITY DEFINER` helper,
`is_workspace_member()`. Turning on real multi-user later is a UI and policy
change rather than a migration.

That helper being `SECURITY DEFINER` is load-bearing, not incidental: without
it the policy on `workspace_members` would have to query `workspace_members`,
and Postgres would recurse.

### The secrets boundary

Nothing that touches a Plaid token, an LLM key or an email key exists in
client code. The browser bundle contains the Supabase URL and anon key, both
of which are designed to be public and neither of which grants anything RLS
does not allow.

| Edge Function | Holds | Auth |
| --- | --- | --- |
| `plaid-link-token` | Plaid credentials | caller's JWT |
| `plaid-exchange` | Plaid credentials, encryption key | caller's JWT |
| `plaid-webhook` | Plaid credentials, encryption key | Plaid's own ES256 signature |
| `parse-receipt` | Anthropic API key | caller's JWT |
| `send-alerts` | Resend key | service-role JWT from cron |

`plaid-webhook` cannot sit behind Supabase's JWT check, because Plaid has no
Supabase token to send. Rather than leave an open endpoint that triggers API
calls, it verifies Plaid's signature itself: the algorithm is checked before
the signature so an `alg: none` token is never treated as verified, `iat`
bounds replays, and the body hash is compared in constant time.

Plaid access tokens are AES-GCM encrypted into `bank_connection_secrets`, a
table with RLS enabled and **no policies at all** — so every client query
returns nothing and only `service_role` can reach them.

## Bank sync is Plaid Sandbox only

Anything the app shows about a connected account is **test data from a fake
bank**. It is not connected to a real account and cannot be. This is enforced
in three independent places:

- `PLAID_ENV` can only resolve to `sandbox` in code
- `bank_connections.plaid_env` has a `CHECK` constraint pinning it
- every UI surface that mentions a connection says "sandbox — demo data"

Moving to Plaid Production is an account-level business step, not a config
change, and nothing here assumes it.

**This is a portfolio project, not a regulated financial service.** It gives
no financial advice, holds no money, and cannot make or cancel a payment.

## What the app does with your data

Everything stays in your own Supabase account except for one feature, which
asks first, every time:

- **Receipt parsing** sends the image or pasted text you choose to
  Anthropic's Claude API, once, to read the merchant, amount and dates. It is
  gated behind an explicit consent screen naming exactly what is sent, and
  the function refuses to run without a consent flag, so calling it directly
  cannot skip the step.

Nothing is ever written on your behalf from an automated source. Bank sync
produces *suggestions* you accept or dismiss; receipt parsing produces a
*draft* that pre-fills the normal add form. Cancellation guides are
information only — the app never contacts a provider for you.

## Testing

```bash
npm test                                    # Vitest
node src/lib/calculations.manual-check.mjs  # zero-dependency fallback
npm run build
```

257 tests across nine files. The suite for `calculations.js` is a standing
regression gate: its original 33 assertions have passed unchanged through
every phase of the refactor, and a change that breaks one is wrong until
proven otherwise.

Three modules are shipped to Edge Functions as byte-identical copies, because
Deno cannot reach into `src/lib`. A test asserts each copy matches its source;
that test is the only thing preventing drift.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in from Supabase -> Settings -> API
npm run dev
```

Vite reads environment files only at startup, so restart the dev server after
creating `.env.local`.

### Database

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Edge Function secrets

Features whose secrets are unset fail with a clear configuration error rather
than crashing, so the app is usable without any of them.

```bash
supabase secrets set \
  PLAID_CLIENT_ID=... PLAID_SECRET=... PLAID_ENV=sandbox \
  TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  ANTHROPIC_API_KEY=... \
  RESEND_API_KEY=... ALERT_FROM_ADDRESS=... APP_URL=...
```

Keep `TOKEN_ENCRYPTION_KEY` safe — rotating it makes stored Plaid tokens
undecryptable.

The scheduled alert job reads the service-role key from Vault at call time
rather than embedding it in `cron.job`, which is a readable table:

```sql
select vault.create_secret('<service_role_key>', 'service_role_key');
```

### Auth configuration

In **Authentication -> URL Configuration**, set the Site URL and add the app
origin to Redirect URLs. Confirmation links point at the Site URL, so a
mismatch produces a link that goes nowhere.

## Project structure

```
src/
  lib/            pure logic, data hooks, mappers — all unit-tested
  components/     flat files are v1; subfolders are v2 features
    auth/ bank-sync/ calendar/ cancellation-guides/ manage/ receipts/
supabase/
  migrations/     schema, RLS, seeds
  functions/      Edge Functions; _shared/ holds the copied pure modules
```

`src/lib/calculations.js` is the most valuable file in the repo: pure,
framework-free, and the only place business rules live. Where a database row
disagrees with the shape it expects, a mapper at the data-access boundary
reconciles it — the calculations are never bent to fit a row.

## Deploying

The frontend is a static Vite build; Vercel, Netlify or the included
`Dockerfile` for Cloud Run all work. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in the host's environment, and add the deployed
origin to Supabase's Redirect URLs.

Edge Functions deploy separately:

```bash
supabase functions deploy
```

### Operational notes

- **Never add `net` to Supabase's exposed schemas.** pg_net grants `EXECUTE`
  on its functions to `PUBLIC` and is owned by `supabase_admin`, so the grant
  cannot be revoked from a migration. It is unreachable today because
  PostgREST exposes only `public` and `graphql_public`; exposing `net` would
  turn it into server-side request forgery.
- Enable **leaked password protection** in Authentication settings.
- Use separate Supabase projects for staging and production. Both need their
  own secrets, Vault entry and URL configuration.

## Known gaps

Stated plainly rather than left to be discovered:

- **The UI has not been exercised end to end against real data.** Logic is
  covered by 257 unit tests and every screen builds and renders, but the
  create/edit/delete paths, the Plaid Link flow, receipt parsing and the
  alert email have not been run by a human against live data.
- **Cancellation URLs are unverified.** They were curated by hand, not by
  visiting each one, and cancel URLs rot.
- **Decision recording is two writes without a transaction.** PostgREST has
  no client-side transaction, so a failure between them could log a decision
  without advancing the date. Both invalidate on settle, so the UI re-reads
  the truth. An RPC would close it.
- **Renewal dates drift.** 31 Jan advances to 28 Feb and then to 28 Mar, not
  back to the 31st, because each step starts from the previously clamped
  date. A test pins this so a change to it is deliberate; whether billing
  should re-anchor to the original day of month is an open question.
- **No error reporting service.** A caught render error goes to the console.
