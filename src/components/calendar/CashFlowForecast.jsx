import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cumulativeOutflow, formatGBP } from '../../lib/calculations.js'

/**
 * Running total of what leaves the account between now and the horizon.
 *
 * A step line rather than a smooth curve, because the underlying quantity
 * genuinely steps: nothing happens between payment dates, and drawing a
 * gentle slope across those gaps would imply money trickling out daily.
 *
 * One series, so no legend — the heading names it.
 */
export default function CashFlowForecast({ commitments, monthsAhead = 3 }) {
  const data = useMemo(() => cumulativeOutflow(commitments, monthsAhead), [commitments, monthsAhead])

  if (data.length === 0) return null

  const total = data[data.length - 1].cumulative

  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
      <div>
        <h2 className="font-display text-sm font-bold text-ink-primary">What you'll need, and when</h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Running total of payments due over the next {monthsAhead} months — {formatGBP(total)} in all.
        </p>
      </div>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#898781" strokeOpacity={0.14} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => formatGBP(v)}
            />
            <Tooltip
              cursor={{ stroke: '#898781', strokeOpacity: 0.35, strokeWidth: 1 }}
              content={<ForecastTooltip />}
            />
            <Line
              type="stepAfter"
              dataKey="cumulative"
              stroke="#2a78d6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ForecastTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-ink-muted/15 bg-white px-3 py-2 shadow-raised">
      <p className="text-xs font-medium text-ink-secondary">{longDate(point.date)}</p>
      <p className="tabular text-sm font-semibold text-ink-primary">{formatGBP(point.cumulative)} by this date</p>
      <p className="tabular text-xs text-ink-secondary">{formatGBP(point.outflow)} due on the day</p>
    </div>
  )
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function shortDate(date) {
  const [, m, d] = String(date).split('-')
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`
}

function longDate(date) {
  const [y, m, d] = String(date).split('-')
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]} ${y}`
}
