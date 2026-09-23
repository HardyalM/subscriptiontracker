import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cumulativeOutflow, formatGBP } from '../../lib/calculations.js'
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
  dayMonth,
  dayMonthYear,
} from '../charts/chartKit.jsx'

/**
 * Running total of what leaves the account between now and the horizon.
 *
 * Deliberately a step, not a smooth curve, even though the trend chart
 * below is smooth. This quantity genuinely steps: nothing happens between
 * payment dates, and a gentle curve across those gaps would imply money
 * trickling out every day. The styling — accent line, fading fill, faint
 * grid, the shared tooltip — matches the other charts; only the shape is
 * true to the data.
 *
 * One series, in the accent colour, so no legend: the headline figure on
 * the right names what the line adds up to.
 */
export default function CashFlowForecast({ commitments, monthsAhead = 3 }) {
  const t = useChartTheme()
  const data = useMemo(() => cumulativeOutflow(commitments, monthsAhead), [commitments, monthsAhead])

  if (data.length === 0) return null

  const total = data[data.length - 1].cumulative

  return (
    <ChartCard
      title="What you'll need, and when"
      description={`Running total of payments due over the next ${monthsAhead} months.`}
      aside={
        <div className="text-right">
          <p className="tabular font-display text-xl font-bold tracking-tight text-ink-primary">{formatGBP(total)}</p>
          <p className="text-xs text-ink-secondary">
            across {data.length} payment {data.length === 1 ? 'date' : 'dates'}
          </p>
        </div>
      }
    >
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <FadeGradient id="forecast-fill" color={t.accent} from={0.24} />
            </defs>
            <CartesianGrid {...gridProps(t)} />
            <XAxis dataKey="date" tickFormatter={dayMonth} interval="preserveStartEnd" minTickGap={32} {...axisProps(t)} />
            <YAxis width={48} tickCount={4} tickFormatter={formatGBPCompact} {...axisProps(t)} />
            <Tooltip
              {...tooltipProps(t)}
              cursor={cursorProps(t)}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                return (
                  <ChartTooltip
                    title={dayMonthYear(p.date)}
                    rows={[{ label: 'Due that day', value: formatGBP(p.outflow), color: t.accent }]}
                    total={{ label: 'Running total', value: formatGBP(p.cumulative) }}
                  />
                )
              }}
            />
            <Area
              type="stepAfter"
              dataKey="cumulative"
              stroke={t.accent}
              strokeWidth={2}
              strokeLinejoin="round"
              fill="url(#forecast-fill)"
              dot={false}
              activeDot={activeDot(t, t.accent)}
              isAnimationActive={t.animate}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
