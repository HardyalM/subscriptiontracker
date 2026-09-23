import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exposureTrend, formatGBP } from '../../lib/calculations.js'
import {
  useChartTheme,
  gridProps,
  axisProps,
  cursorProps,
  activeDot,
  tooltipProps,
  formatGBPCompact,
  ChartCard,
  ChartTooltip,
  FadeGradient,
  LegendItem,
  monthShort,
  monthLong,
} from '../charts/chartKit.jsx'

/**
 * Annualised exposure over the last 12 months, split into subscriptions and
 * BNPL and stacked, so the top edge is the total and each band shows how
 * much of it is which.
 *
 * Smooth (monotone) curves here, unlike the cash-flow chart: this is a
 * month-end reading of a level, and monotone interpolation never overshoots
 * between points, so the curve can't invent a peak or a dip that isn't in
 * the data.
 *
 * The legend carries this month's figure for each band, so it doubles as
 * a direct label and the chart reads without hovering.
 */
export default function ExposureTrend({ commitments }) {
  const t = useChartTheme()

  const data = useMemo(() => {
    const subs = exposureTrend(commitments.filter((c) => c.type === 'subscription'), 12)
    const bnpl = exposureTrend(commitments.filter((c) => c.type === 'bnpl'), 12)
    return subs.map((point, i) => ({
      month: point.month,
      subscriptions: point.exposure,
      bnpl: bnpl[i]?.exposure ?? 0,
      total: point.exposure + (bnpl[i]?.exposure ?? 0),
    }))
  }, [commitments])

  if (!data.some((p) => p.total > 0)) return null

  const latest = data[data.length - 1]
  const first = data.find((p) => p.total > 0) ?? data[0]
  const change = latest.total - first.total

  return (
    <ChartCard
      title="Annualised exposure over time"
      description="What your active commitments added up to at the end of each month."
      aside={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <LegendItem color={t.series1} label="Subscriptions" value={formatGBP(latest.subscriptions)} />
          <LegendItem color={t.series2} label="BNPL" value={formatGBP(latest.bnpl)} />
        </div>
      }
      footer={
        <div className="flex flex-wrap justify-between gap-2 text-xs text-ink-secondary">
          <span>
            Now <span className="tabular font-semibold text-ink-primary">{formatGBP(latest.total)}</span> a year
          </span>
          {first !== latest && (
            <span className="tabular">
              {change === 0 ? 'No change' : `${change > 0 ? 'Up' : 'Down'} ${formatGBP(Math.abs(change))}`} since{' '}
              {monthLong(first.month)}
            </span>
          )}
        </div>
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <FadeGradient id="trend-subs" color={t.series1} />
              <FadeGradient id="trend-bnpl" color={t.series2} />
            </defs>
            <CartesianGrid {...gridProps(t)} />
            <XAxis dataKey="month" tickFormatter={monthShort} interval="preserveStartEnd" minTickGap={24} {...axisProps(t)} />
            <YAxis width={48} tickCount={4} tickFormatter={formatGBPCompact} {...axisProps(t)} />
            <Tooltip
              {...tooltipProps(t)}
              cursor={cursorProps(t)}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                return (
                  <ChartTooltip
                    title={monthLong(p.month)}
                    rows={[
                      { label: 'Subscriptions', value: formatGBP(p.subscriptions), color: t.series1 },
                      { label: 'BNPL', value: formatGBP(p.bnpl), color: t.series2 },
                    ]}
                    total={{ label: 'Per year', value: formatGBP(p.total) }}
                  />
                )
              }}
            />
            {/* BNPL at the bottom of the stack. Months with no BNPL then
                draw its line flat along zero, which is true; stacked on top
                instead, a zero band's line would lie exactly over the
                subscriptions line and paint it the wrong colour. */}
            <Area
              type="monotone"
              dataKey="bnpl"
              stackId="exposure"
              stroke={t.series2}
              strokeWidth={2}
              fill="url(#trend-bnpl)"
              activeDot={activeDot(t, t.series2)}
              isAnimationActive={t.animate}
              animationDuration={700}
            />
            <Area
              type="monotone"
              dataKey="subscriptions"
              stackId="exposure"
              stroke={t.series1}
              strokeWidth={2}
              fill="url(#trend-subs)"
              activeDot={activeDot(t, t.series1)}
              isAnimationActive={t.animate}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
