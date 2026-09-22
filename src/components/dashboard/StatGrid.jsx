import { useMemo } from 'react'
import {
  totalAnnualExposure,
  forecastByDay,
  getRenewalCheckpointItems,
  formatGBP,
} from '../../lib/calculations.js'
import StatCard from './StatCard.jsx'

/**
 * The executive summary.
 *
 * Four metrics, chosen so each answers a different question:
 *   what am I committed to  — annualised exposure, the hero
 *   what leaves soon        — actual cash due in 30 days
 *   how much am I carrying  — counts, split by kind
 *   what needs me           — the review queue's depth
 *
 * A "total monthly spend" card was considered and deliberately left out as
 * a headline. Restating an annual commitment as a comfortable monthly
 * figure is precisely the present-bias framing this product exists to
 * counter — leading with it would undo the app's own argument. The 30-day
 * figure below is a real cash-flow number (what is actually scheduled to
 * leave), not the same commitment divided by twelve.
 */
export default function StatGrid({ commitments, onReviewClick }) {
  const stats = useMemo(() => {
    const active = commitments.filter((c) => c.status === 'active')
    const subs = active.filter((c) => c.type === 'subscription').length
    const bnpl = active.length - subs

    const horizon = new Date()
    horizon.setDate(horizon.getDate() + 30)
    const cutoff = horizon.toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)

    const dueSoon = forecastByDay(commitments, 2)
      .filter((day) => day.date >= today && day.date <= cutoff)
      .reduce((sum, day) => sum + day.total, 0)

    const needsReview = getRenewalCheckpointItems(commitments).length

    return { total: totalAnnualExposure(commitments), active: active.length, subs, bnpl, dueSoon, needsReview }
  }, [commitments])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        hero
        label="Total annualised exposure"
        value={formatGBP(stats.total)}
        detail={
          stats.active === 0
            ? 'Nothing tracked yet. Add a commitment to see it here.'
            : `Across ${stats.active} active ${stats.active === 1 ? 'commitment' : 'commitments'} — ${stats.subs} ${
                stats.subs === 1 ? 'subscription' : 'subscriptions'
              } annualised, plus what's still owed on ${stats.bnpl} BNPL ${stats.bnpl === 1 ? 'plan' : 'plans'}.`
        }
      />

      <StatCard
        label="Due in next 30 days"
        value={formatGBP(stats.dueSoon)}
        detail="Actually scheduled to leave your account."
      />

      <StatCard
        label="Needs review"
        value={String(stats.needsReview)}
        tone={stats.needsReview > 0 ? 'warning' : undefined}
        detail={
          stats.needsReview > 0
            ? `${stats.needsReview === 1 ? 'One renews' : 'These renew'} within 7 days, or ${
                stats.needsReview === 1 ? 'is' : 'are'
              } already overdue.`
            : 'Nothing due in the next 7 days.'
        }
        footer={
          stats.needsReview > 0 ? (
            <button
              type="button"
              onClick={onReviewClick}
              className="mt-3 rounded-lg text-sm font-semibold text-brand-600 underline-offset-4 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2"
            >
              Review them →
            </button>
          ) : null
        }
      />
    </div>
  )
}
