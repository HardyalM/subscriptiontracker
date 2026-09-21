import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exposureTrend, formatGBP } from '../../lib/calculations.js'

/**
 * Total annualised exposure over the last 12 months.
 *
 * One series, so there is no legend — the heading names it. Change over time
 * is an area chart; the fill carries the magnitude and the 2px stroke keeps
 * the line readable where months are flat.
 */
export default function ExposureTrend({ commitments }) {
  const data = useMemo(() => exposureTrend(commitments, 12), [commitments])

  const hasMovement = data.some((p) => p.exposure > 0)
  if (!hasMovement) return null

  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-1">
        <h2 className="font-display text-sm font-bold text-ink-primary">Annualised exposure over time</h2>
        <p className="mt-0.5 text-xs text-ink-secondary">
          What your active commitments added up to at the end of each month.
        </p>
      </div>

      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Recessive grid: horizontal only, so it reads as a reference
                rather than competing with the line. */}
            <CartesianGrid vertical={false} stroke="#898781" strokeOpacity={0.14} />
            <XAxis
              dataKey="month"
              tickFormatter={shortMonth}
              tick={{ fontSize: 11, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
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
              content={<TrendTooltip />}
            />
            <Area
              type="monotone"
              dataKey="exposure"
              stroke="#2a78d6"
              strokeWidth={2}
              fill="url(#exposureFill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-muted/15 bg-white px-3 py-2 shadow-raised">
      <p className="text-xs font-medium text-ink-secondary">{longMonth(label)}</p>
      <p className="tabular text-sm font-semibold text-ink-primary">{formatGBP(payload[0].value)}</p>
    </div>
  )
}

function shortMonth(month) {
  const [y, m] = String(month).split('-')
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m) - 1]} ${y.slice(2)}`
}

function longMonth(month) {
  const [y, m] = String(month).split('-')
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${names[Number(m) - 1]} ${y}`
}
