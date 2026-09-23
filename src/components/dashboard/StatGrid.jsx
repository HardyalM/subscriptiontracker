import { useMemo } from 'react'
import {
  totalAnnualExposure,
  annualisedCost,
  remainingBnplBalance,
  monthlyRunRate,
  nextBnplPayment,
  forecastByDay,
  getRenewalCheckpointItems,
  daysUntil,
  formatGBP,
} from '../../lib/calculations.js'
import { formatShortDate, describeDue } from '../../lib/format.js'
import { IconRepeat, IconCalendarClock, IconWallet, IconInbox } from '../Icon.jsx'
import StatCard, { HeroStatCard } from './StatCard.jsx'

/**
 * The executive summary, as a bento grid: the annual figure tall on the
 * left, four widgets in a two-by-two beside it.
 *
 * Monthly spend sits directly beside the annual total on purpose. On its
 * own, a monthly figure is the comfortable framing this app exists to
 * counter — "only £X a month". Next to the annual number it becomes the
 * opposite: a way to see the same money two ways at once, which is the
 * product's founding rule.
 */
export default function StatGrid({ commitments, onReviewClick }) {
  const stats = useMemo(() => {
    const active = commitments.filter((c) => c.status === 'active')
    const subs = active.filter((c) => c.type === 'subscription')
    const bnpl = active.filter((c) => c.type === 'bnpl')

    const today = new Date().toISOString().slice(0, 10)
    const horizon = new Date()
    horizon.setDate(horizon.getDate() + 30)
    const cutoff = horizon.toISOString().slice(0, 10)

    return {
      total: totalAnnualExposure(commitments),
      activeCount: active.length,
      subsYearly: subs.reduce((sum, c) => sum + (annualisedCost(c) || 0), 0),
      subsCount: subs.length,
      bnplOwed: bnpl.reduce((sum, c) => sum + (remainingBnplBalance(c) || 0), 0),
      bnplCount: bnpl.length,
      monthly: monthlyRunRate(commitments),
      nextBnpl: nextBnplPayment(commitments),
      dueSoon: forecastByDay(commitments, 2)
        .filter((day) => day.date >= today && day.date <= cutoff)
        .reduce((sum, day) => sum + day.total, 0),
      needsReview: getRenewalCheckpointItems(commitments).length,
    }
  }, [commitments])

  const next = stats.nextBnpl
  const nextDays = next ? daysUntil(next.nextPaymentDate) : null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HeroStatCard
        label="Total annualised exposure"
        value={formatGBP(stats.total)}
        detail={
          stats.activeCount === 0
            ? 'Nothing tracked yet. Add a commitment to see it here.'
            : `What everything active adds up to — ${stats.activeCount} ${
                stats.activeCount === 1 ? 'commitment' : 'commitments'
              }, seen as a year rather than a payment.`
        }
        breakdown={
          stats.activeCount === 0
            ? null
            : [
                {
                  label: 'Subscriptions',
                  value: formatGBP(stats.subsYearly),
                  note: `${stats.subsCount} · per year`,
                },
                {
                  label: 'BNPL',
                  value: formatGBP(stats.bnplOwed),
                  note: `${stats.bnplCount} · still owed`,
                },
              ]
        }
      />

      <StatCard
        label="Monthly spend"
        icon={<IconRepeat className="h-4 w-4" />}
        tone="brand"
        value={formatGBP(stats.monthly)}
        // Deliberately no second "per year" figure here. monthly × 12 is
        // not the hero's number — BNPL counts toward the hero as what is
        // still owed, not as a rate — and two different annual figures side
        // by side would only invite "which one is right?".
        detail="Subscriptions and BNPL instalments, as a monthly rate." 
      />

      <StatCard
        label="Next BNPL payment"
        icon={<IconCalendarClock className="h-4 w-4" />}
        tone="bnpl"
        value={next ? formatGBP(next.costPerPayment) : '—'}
        detail={
          next ? (
            <>
              <span className="font-semibold text-ink-primary">{next.name}</span>
              <span className="block">
                {formatShortDate(next.nextPaymentDate)} · {describeDue(nextDays)}
              </span>
            </>
          ) : (
            'No BNPL instalments owed.'
          )
        }
      />

      <StatCard
        label="Due in next 30 days"
        icon={<IconWallet className="h-4 w-4" />}
        value={formatGBP(stats.dueSoon)}
        detail="Actually scheduled to leave your account."
      />

      <StatCard
        label="Needs review"
        icon={<IconInbox className="h-4 w-4" />}
        tone={stats.needsReview > 0 ? 'warning' : 'neutral'}
        value={String(stats.needsReview)}
        detail={stats.needsReview > 0 ? 'Due within 7 days, or overdue.' : 'Nothing due in the next 7 days.'}
        footer={
          stats.needsReview > 0 ? (
            <button
              type="button"
              onClick={onReviewClick}
              className="rounded text-sm font-semibold text-brand-600 underline-offset-4 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2"
            >
              Review them →
            </button>
          ) : null
        }
      />
    </div>
  )
}
