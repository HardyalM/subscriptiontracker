import { totalAnnualExposure, formatGBP } from '../lib/calculations.js'
import { IconLogo } from './Icon.jsx'

/**
 * The one number the whole app is built around: total committed exposure
 * across everything active right now. Large, unmissable, on its own —
 * this is the payment-decoupling countermeasure, so it gets the most
 * visual weight on the page.
 */
export default function HeadlineExposure({ commitments }) {
  const total = totalAnnualExposure(commitments)
  const activeCount = commitments.filter((c) => c.status === 'active').length
  const subsCount = commitments.filter((c) => c.status === 'active' && c.type === 'subscription').length
  const bnplCount = activeCount - subsCount

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-6 text-white shadow-raised sm:p-8">
      {/* Decorative — a faint oversized watermark of the app's own mark, purely for texture */}
      <IconLogo className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/10" />

      <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
        Total annualised exposure right now
      </div>

      <p className="tabular relative mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
        {formatGBP(total)}
      </p>

      <p className="relative mt-4 max-w-md text-sm text-brand-50/90">
        Across {activeCount} active {activeCount === 1 ? 'commitment' : 'commitments'}
        {activeCount > 0 && (
          <>
            {' '}
            — {subsCount} subscription{subsCount === 1 ? '' : 's'} annualised, plus what's still owed on {bnplCount}{' '}
            BNPL {bnplCount === 1 ? 'plan' : 'plans'}.
          </>
        )}
        {activeCount === 0 && '. Add one below to see it here.'}
      </p>
    </div>
  )
}
