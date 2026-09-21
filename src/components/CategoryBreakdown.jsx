import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { categoryBreakdown, totalAnnualExposure, formatGBP } from '../lib/calculations.js'
import { IconTag } from './Icon.jsx'

// Fixed categorical order from the validated dataviz palette — never cycled,
// never re-derived from data order.
const CATEGORY_COLORS = {
  Streaming: '#2a78d6', // slot 1 — blue
  'Retail BNPL': '#eb6834', // slot 2 — orange
  'Other subscriptions': '#1baf7a', // slot 3 — aqua
  Other: '#898781', // muted ink — explicit "everything else" bucket, not a series colour
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const { category, total } = payload[0].payload
  return (
    <div className="rounded-lg border border-ink-muted/15 bg-white px-3 py-2 text-sm shadow-card-hover">
      <p className="font-medium text-ink-primary">{category}</p>
      <p className="tabular text-ink-secondary">{formatGBP(total)} / year</p>
    </div>
  )
}

/**
 * Grouped annualised spend by category — nice-to-have per spec, kept to a
 * single measure (magnitude) so a simple bar chart is the right form; no
 * dual axes, no more than a handful of bars.
 */
export default function CategoryBreakdown({ commitments }) {
  const data = categoryBreakdown(commitments)
  const total = totalAnnualExposure(commitments)

  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <IconTag className="h-4 w-4 text-ink-muted" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-secondary">By category</h2>
      </div>

      {data.length === 0 ? (
        <p className="py-4 text-sm text-ink-secondary">Add an active commitment to see the breakdown.</p>
      ) : (
        <>
          <div style={{ width: '100%', height: Math.max(110, data.length * 52) }}>
            <ResponsiveContainer>
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barCategoryGap={14}>
                <XAxis type="number" hide domain={[0, (dataMax) => dataMax * 1.12]} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={132}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52514e', fontSize: 13 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(11,11,11,0.03)' }} />
                <Bar dataKey="total" radius={[4, 4, 4, 4]} maxBarSize={24}>
                  {data.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Other} />
                  ))}
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v) => formatGBP(v)}
                    style={{ fill: '#0b0b0b', fontSize: 13, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-between border-t border-ink-muted/10 pt-3 text-xs text-ink-muted">
            <span>{data.length} active {data.length === 1 ? 'category' : 'categories'}</span>
            <span className="tabular">Total {formatGBP(total)}</span>
          </div>
        </>
      )}
    </section>
  )
}
