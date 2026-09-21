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

## A note on how this was built

The first version was written in a sandboxed session with no npm registry
access, so it was verified by hand-checking syntax (`tsc --noEmit`) and
running the calculation logic through a zero-dependency Node script rather
than a real test runner. It's since been confirmed working end to end —
`npm install && npm run dev` runs cleanly on a real machine. The features
added after that (design pass, renewal-date fix, demo data, the real
`vitest` suite, and this round's logomark/Settings-menu/modal-form pass)
were built in the same kind of sandboxed session and verified the same way —
logic cross-checked against the actual source with Node, syntax-checked with
`tsc --noEmit`, every relative import and named export checked to resolve —
but **haven't yet been run through a real `npm install` by anyone**. Do
that before treating this round as done, the same way the first round
needed it. This round only touched components and styling — no calculation
logic changed, and the full 33-check suite still passes unmodified.

## Testing

```bash
npm test          # runs the suite once (src/lib/calculations.test.js, via vitest)
npm run test:watch
```

The suite covers annualisation, BNPL balances and paid-off progress, the
renewal window including overdue items, calendar-safe date advancement
(leap years, month-end clamping), the reconsidered-savings total, category
totals, and decision tallying — all against the pure logic in
`src/lib/calculations.js`, no DOM required. `.github/workflows/ci.yml` runs
this plus a production build on every push/PR once this repo is on GitHub
— it does nothing until then; a workflow file with no repo behind it is
inert.

`src/lib/calculations.manual-check.mjs` is the original zero-dependency
script from before `npm install` was possible here. It's redundant now that
the real suite exists but costs nothing to keep — run it directly with
`node src/lib/calculations.manual-check.mjs` if you ever want to sanity
check the logic with literally no dependencies at all.

## What's new since the first version

- **A real logomark**, not a generic wallet icon: an open ring (a commitment's
  renewal cycle, never fully "closed" while it's active) with a hand pointing
  from a solid centre dot out to the next renewal point on the ring. It's in
  the header badge and as the watermark on the headline exposure card.
- **A proper Settings menu.** The reduce-motion and browser-reminder toggles,
  plus "Load example data" and "Clear all data" — previously scattered
  across a loose pill row above the fold, a first-run hint, and a footer
  link — now live in one dropdown off a sliders icon in the header, grouped
  into Appearance / Notifications / Data. The empty-state's own "Load
  example data" prompt stays where it is, since that's the moment it's most
  useful.
- **The add/edit form is a modal**, not an inline block that used to push
  the whole page down while it was open. Opens centred over the page, closes
  on Escape, a backdrop click, or its own close button; scrolls internally
  on short screens instead of overflowing.
- **Renewal dates no longer go stale.** Tapping "Keep it" advances a
  subscription to its next renewal date, or a BNPL plan to its next
  instalment (decrementing instalments remaining). Previously the date just
  sat there and needed manual editing every cycle.
- **Overdue items no longer disappear.** The checkpoint used to only show
  items 0–7 days out; anything that slipped past its date silently vanished
  with nothing resolved. It now stays visible, labelled "N days overdue",
  until you act on it.
- **"£X kept back by reconsidering"** — a running total next to the
  kept/reconsidered tally, computed from the actual £ value at the moment
  each "Reconsider" was tapped.
- **BNPL paid-off progress** — the `totalOriginalAmount` field (previously
  captured but never shown anywhere) now renders as a small progress bar
  on each BNPL row.
- **Confirm before Cancel** — a destructive action now needs two taps
  within 3 seconds, not one.
- **Reduce-motion toggle and opt-in browser reminders**, in a small
  settings bar above the headline number — bringing this in line with the
  accessibility baseline in MediMate/FlowMate. The reminder is honest about
  its limit: with no backend/service worker, it can only fire while this
  tab is open, so it's a same-session nudge, not a push notification.
- **"Load example data"**, shown only on an empty dashboard — seeds six
  realistic commitments (mixed subscription/BNPL, some urgent, one
  deliberately overdue) so the headline number and renewal checkpoint are
  visible in seconds instead of requiring manual entry first. Pairs with a
  confirmed "Clear all data" in the footer.
- **A real test suite** (`npm test`, via vitest) and a GitHub Actions
  workflow — see Testing above.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. Data is saved to `localStorage`, so it survives
a page reload without any backend.

To build for production:

```bash
npm run build
npm run preview   # sanity-check the production build locally
```

## Project structure

```
src/
  lib/
    constants.js       Commitment type/frequency/category enums
    calculations.js    Pure calculation logic (annualisation, exposure,
                        renewal window incl. overdue, calendar-safe date
                        advancement, reconsidered-savings, category totals,
                        decision tally) — zero React/DOM imports, unit-tested
                        standalone
    calculations.test.js       Real test suite — run with: npm test
    calculations.manual-check.mjs   Zero-dependency fallback — node <path>
    csvExport.js        CSV string building + browser download trigger
    storage.js           localStorage-backed useCommitments() hook
    notifications.js     Browser Notification API wrapper (opt-in, tab-only)
    demoData.js           Builds the "Load example data" seed set
  components/
    Icon.jsx              Small hand-rolled icon set, no dependency —
                            includes the app's own logomark (IconLogo)
    Modal.jsx              Reusable centred-dialog wrapper (used by the
                            add/edit form)
    CommitmentForm.jsx     Add/edit form, rendered inside Modal
    Dashboard.jsx          List of all commitments (dual-frame cost display)
    CommitmentRow.jsx      One commitment's row (incl. BNPL progress bar,
                            confirm-before-cancel)
    HeadlineExposure.jsx   The one big number at the top
    RenewalCheckpoint.jsx  The signature feature
    CategoryBreakdown.jsx  Recharts bar chart, grouped by category
    ExportButton.jsx       CSV export trigger
    SettingsMenu.jsx        Header dropdown: reduce-motion + browser-reminder
                            toggles, load example data, clear all data
  App.jsx                  Wires everything together
```

## Data model

A single `Commitment` entity (kept deliberately simple, per spec):

```js
{
  id, name,
  type: 'subscription' | 'bnpl',
  costPerPayment: number,
  frequency: 'weekly' | 'monthly' | 'one-off installments',
  nextPaymentDate: 'YYYY-MM-DD',
  totalOriginalAmount: number | null,      // BNPL only
  instalmentsRemaining: number | null,     // BNPL only
  status: 'active' | 'cancelled',
  category: string,                        // Streaming / Retail BNPL / Other subscriptions / Other
  decisionLog: [{ date, decision: 'kept' | 'reconsidered', amount: number }],
  // `amount` is the commitment's exposure (annualised cost, or BNPL
  // remaining balance) captured at the moment of that decision — this is
  // what the "£X kept back by reconsidering" total is built from.
}
```

## Swapping localStorage for Firestore (AI Studio path)

If you take this into AI Studio and want Firestore persistence instead of
`localStorage` (e.g. to match the multi-device behaviour of MediMate),
everything reads and writes commitments through one hook:
`useCommitments()` in `src/lib/storage.js`. Replace its body with a
Firestore `onSnapshot` subscription and a `setDoc`/`updateDoc` write, keep
the same `[commitments, setCommitments]` return shape, and no other file
needs to change.

## Deploying to Cloud Run

A `Dockerfile` and `nginx.conf` are included, matching the MediMate/FlowMate
deploy pattern (multi-stage build → static files served by nginx, listening
on `$PORT`). **This step needs your own GCP account and can't be done from
a sandboxed session** — it needs `gcloud auth login` against your own
Google account and a project with billing enabled. Once that's set up, it's
one command from inside this folder:

```bash
gcloud run deploy subscription-bnpl-tracker --source . --region <your-region>
```

That prints a live `*.run.app` URL — that's the link that belongs on your
CV, not a GitHub repo link, if you want to claim "deployed" rather than
"deployable." If you'd rather not deal with GCP billing setup, Vercel or
Netlify will build and host this for free directly from a GitHub repo with
zero config (it's a static Vite app, no backend) — either is a legitimate
substitute for a personal project; Cloud Run only matters here because it
matches your other two apps' deploy story.

## Scope

Deliberately out of scope for v1 (per the original spec — do not add these
without re-opening scope): Open Banking / bank statement integration,
multi-user accounts, real cancellation automation with providers, AI-powered
statement parsing.
