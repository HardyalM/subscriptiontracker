import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { categoryBreakdown, totalAnnualExposure, formatGBP } from '../lib/calculations.js'
import { IconTag } from './Icon.jsx'
import { useChartTheme, tooltipProps, ChartCard, ChartTooltip } from './charts/chartKit.jsx'

// Fixed categorical order from the validated dataviz palette — never cycled,
// never re-derived from data order, and never the accent colour: changing
// your accent must not repaint "Streaming".
const CATEGORY_SERIES = {
  Streaming: 'series1',
  'Retail BNPL': 'series2',
  'Other subscriptions': 'series3',
}

/**
 * Annualised spend by category. One measure (magnitude) across a handful of
 * categories, so a sorted horizontal bar is the right form — no axes at
 * all, since every bar carries its own value label.
 *
 * Each bar sits on a faint full-width track, so the length reads as a share
 * of the largest category rather than floating on white.
 */
export default function CategoryBreakdown({ commitments }) {
  const t = useChartTheme()
  const data = categoryBreakdown(commitments)
  const total = totalAnnualExposure(commitments)
  // "Other" is the explicit everything-else bucket — muted, not a series.
  const colorFor = (category) => (CATEGORY_SERIES[category] ? t[CATEGORY_SERIES[category]] : t.muted)

  return (
    <ChartCard
      title="By category"
      description="What each kind of commitment costs you over a year."
      aside={
        data.length > 0 && (
          <div className="text-right">
            <p className="tabular font-display text-xl font-bold tracking-tight text-ink-primary">{formatGBP(total)}</p>
            <p className="text-xs text-ink-secondary">a year, all categories</p>
          </div>
        )
      }
    >
      {data.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-sunken text-ink-secondary">
            <IconTag className="h-5 w-5" />
          </div>
          <p className="text-sm text-ink-secondary">Nothing active to break down. Reactivate or add a commitment to see it here.</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: Math.max(120, data.length * 48) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={12}>
              <XAxis type="number" hide domain={[0, 'dataMax']} />
              <YAxis
                type="category"
                dataKey="category"
                width={156}
                tickLine={false}
                axisLine={false}
                tick={{ fill: t.secondary, fontSize: 13 }}
              />
              <Tooltip
                {...tooltipProps(t)}
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload
                  const share = total > 0 ? Math.round((p.total / total) * 100) : 0
                  return (
                    <ChartTooltip
                      title={p.category}
                      rows={[
                        { label: 'Per year', value: formatGBP(p.total), color: colorFor(p.category) },
                        { label: 'Per month', value: formatGBP(p.total / 12) },
                        { label: 'Share of total', value: `${share}%` },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="total"
                radius={6}
                maxBarSize={22}
                background={{ fill: t.sunken, radius: 6 }}
                isAnimationActive={t.animate}
                animationDuration={600}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={colorFor(entry.category)} />
                ))}
                <LabelList
                  dataKey="total"
                  position="right"
                  offset={10}
                  formatter={(v) => formatGBP(v)}
                  style={{ fill: t.primary, fontSize: 13, fontWeight: 600, fontFeatureSettings: '"tnum"' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
