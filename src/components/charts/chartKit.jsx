import { useMemo, useSyncExternalStore } from 'react'
import { useAppearance } from '../../lib/appearance.jsx'

/**
 * Shared parts for every chart: colours, axes, tooltip, and the card they
 * sit in. One place, so the charts can't drift apart in style.
 */

// ── Colour ──────────────────────────────────────────────────────────────
//
// Recharts draws SVG and takes colours as plain strings, so it can't use a
// Tailwind class, and a CSS var() inside an SVG presentation attribute isn't
// reliable across browsers. The hook below reads the resolved values off
// <html> instead.
//
// It re-reads when the theme class or the accent attribute actually change
// on the element — watched with a MutationObserver — rather than when the
// appearance state changes. The provider applies that state in an effect,
// which runs after its children render, so a chart that re-read on the
// state change would read the previous theme every time.

function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] })
  return () => observer.disconnect()
}

function themeKey() {
  const el = document.documentElement
  return `${el.classList.contains('dark') ? 'dark' : 'light'}|${el.dataset.accent ?? ''}`
}

function readColors() {
  const styles = getComputedStyle(document.documentElement)
  const rgb = (name) => `rgb(${styles.getPropertyValue(`--${name}`).trim().split(/\s+/).join(', ')})`
  return {
    // Categorical: fixed per entity, never the accent. Changing your accent
    // must not repaint "Streaming".
    series1: rgb('series-1'),
    series2: rgb('series-2'),
    series3: rgb('series-3'),
    // Single-series charts are "the app's own line", so they take the accent.
    accent: rgb('accent'),
    muted: rgb('ink-muted'),
    secondary: rgb('ink-secondary'),
    primary: rgb('ink-primary'),
    surface: rgb('surface'),
    sunken: rgb('surface-sunken'),
  }
}

export function useChartTheme() {
  const key = useSyncExternalStore(subscribe, themeKey, () => 'light|')
  const { reducedMotion } = useAppearance()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(readColors, [key])
  return { ...colors, animate: !reducedMotion, dark: key.startsWith('dark') }
}

// ── Axes and grid ───────────────────────────────────────────────────────
//
// No axis lines, no tick marks, no vertical grid. What's left is a faint
// dashed line at each Y tick: enough to read a value against, recessive
// enough that the data is the first thing you see.

export function gridProps(t) {
  return { vertical: false, stroke: t.muted, strokeOpacity: t.dark ? 0.28 : 0.3, strokeDasharray: '3 5' }
}

export function axisProps(t) {
  return {
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 11, fill: t.secondary, fontFeatureSettings: '"tnum"' },
    tickMargin: 8,
  }
}

export function cursorProps(t) {
  return { stroke: t.muted, strokeOpacity: 0.55, strokeWidth: 1, strokeDasharray: '3 3' }
}

/** A marker on the hovered point: the series colour, ringed in the card colour so it lifts off the line. */
export function activeDot(t, color) {
  return { r: 4.5, fill: color, stroke: t.surface, strokeWidth: 2.5 }
}

/**
 * The area fill under a line: a soft tint of the series colour that fades
 * to nothing at the baseline. Goes inside the chart's <defs>.
 */
export function FadeGradient({ id, color, from = 0.28, to = 0 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={from} />
      <stop offset="95%" stopColor={color} stopOpacity={to} />
    </linearGradient>
  )
}

/** Tooltip settings shared by every chart. */
export function tooltipProps(t) {
  return {
    wrapperStyle: { outline: 'none', zIndex: 10 },
    animationDuration: t.animate ? 140 : 0,
    offset: 14,
  }
}

/** £1.2k rather than £1,200.00 — axis ticks only. The tooltip carries the exact figure. */
export function formatGBPCompact(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 1000) {
    const k = n / 1000
    return `£${(Math.abs(k) >= 10 ? Math.round(k) : Math.round(k * 10) / 10).toString()}k`
  }
  return `£${Math.round(n)}`
}

// ── Tooltip ─────────────────────────────────────────────────────────────

/**
 * The one tooltip every chart uses: a small card in the theme's surface,
 * with a layered shadow, a title, and rows of label + value.
 *
 * Values are right-aligned tabular figures, so pounds and pence line up
 * down the column the way they would on a statement. A `total` row sits
 * under a hairline, in the heavier weight.
 */
export function ChartTooltip({ title, rows, total }) {
  return (
    <div className="min-w-[12.5rem] overflow-hidden rounded-xl border border-ink-muted/15 bg-surface/95 shadow-elevated backdrop-blur-md supports-[backdrop-filter]:bg-surface/85">
      <p className="border-b border-ink-muted/10 px-3.5 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-secondary">
        {title}
      </p>
      <dl className="space-y-1.5 px-3.5 py-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5">
            {row.color && (
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />
            )}
            <dt className="text-[13px] text-ink-secondary">{row.label}</dt>
            <dd className="tabular ml-auto pl-6 text-right text-[13px] font-semibold text-ink-primary">{row.value}</dd>
          </div>
        ))}
      </dl>
      {total && (
        <div className="flex items-center gap-2.5 border-t border-ink-muted/10 bg-surface-sunken/50 px-3.5 py-2">
          <span className="text-[13px] font-semibold text-ink-primary">{total.label}</span>
          <span className="tabular ml-auto pl-6 text-right font-display text-sm font-bold tracking-tight text-ink-primary">
            {total.value}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────

/**
 * The frame around a chart: title, one line saying what it shows, and an
 * optional legend or headline figure on the right.
 */
export function ChartCard({ title, description, aside, children, footer }) {
  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-surface p-card-pad shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-ink-primary">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
      {footer && <div className="mt-4 border-t border-ink-muted/10 pt-3">{footer}</div>}
    </section>
  )
}

/** A legend entry that doubles as a direct label: swatch, name, current value. */
export function LegendItem({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
      <span className="text-[13px] text-ink-secondary">{label}</span>
      {value && <span className="tabular text-[13px] font-semibold text-ink-primary">{value}</span>}
    </div>
  )
}

// ── Dates ───────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** '2026-09-23' → '23 Sep' */
export function dayMonth(date) {
  const [, m, d] = String(date).split('-')
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`
}

/** '2026-09-23' → '23 Sep 2026' */
export function dayMonthYear(date) {
  const [y, m, d] = String(date).split('-')
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]} ${y}`
}

/** '2026-09' → 'Sep 26' */
export function monthShort(month) {
  const [y, m] = String(month).split('-')
  return `${MONTHS_SHORT[Number(m) - 1]} ${y.slice(2)}`
}

/** '2026-09' → 'September 2026' */
export function monthLong(month) {
  const [y, m] = String(month).split('-')
  return `${MONTHS_LONG[Number(m) - 1]} ${y}`
}
