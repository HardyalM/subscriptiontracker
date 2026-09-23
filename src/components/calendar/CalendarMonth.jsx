import { useMemo, useState } from 'react'
import { forecastByDay, formatGBP, toMidnight } from '../../lib/calculations.js'
import { IconChevronLeft, IconChevronRight } from '../Icon.jsx'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * A month grid of projected payments, hand-built rather than pulled from a
 * calendar kit — a month is six rows of seven cells, and a dependency would
 * bring its own visual language with it.
 *
 * Weeks run Monday to Sunday, which is what a UK user expects, and the
 * trailing column gives each week's total so the question "can I cover this
 * week" is answerable without adding up cells.
 */
export default function CalendarMonth({ commitments, monthsAhead = 3 }) {
  const today = useMemo(() => toMidnight(new Date()), [])
  const [offset, setOffset] = useState(0)

  // Project once for the whole horizon, then slice per month as the user
  // pages — re-projecting on every click would be wasted work.
  const daysWithPayments = useMemo(
    () => forecastByDay(commitments, monthsAhead, today),
    [commitments, monthsAhead, today],
  )
  const byDate = useMemo(
    () => new Map(daysWithPayments.map((d) => [d.date, d])),
    [daysWithPayments],
  )

  const viewed = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const year = viewed.getFullYear()
  const month = viewed.getMonth()

  const weeks = useMemo(() => buildWeeks(year, month), [year, month])

  const monthTotal = daysWithPayments
    .filter((d) => d.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .reduce((sum, d) => sum + d.total, 0)

  const canGoBack = offset > 0
  const canGoForward = offset < monthsAhead

  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-surface p-card-pad shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold text-ink-primary">
            {MONTHS[month]} {year}
          </h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {monthTotal > 0 ? `${formatGBP(monthTotal)} due this month` : 'Nothing due this month'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NavButton label="Previous month" disabled={!canGoBack} onClick={() => setOffset((o) => o - 1)}>
            <IconChevronLeft className="h-4 w-4" />
          </NavButton>
          <NavButton label="Next month" disabled={!canGoForward} onClick={() => setOffset((o) => o + 1)}>
            <IconChevronRight className="h-4 w-4" />
          </NavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(7,minmax(0,1fr))_auto]">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {day}
          </div>
        ))}
        <div className="hidden pb-1 pl-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-muted sm:block">
          Week
        </div>

        {weeks.map((week, i) => {
          const weekTotal = week.reduce((sum, cell) => sum + (cell ? byDate.get(cell)?.total ?? 0 : 0), 0)
          return (
            <Week key={i} week={week} byDate={byDate} today={today} weekTotal={weekTotal} />
          )
        })}
      </div>
    </section>
  )
}

function Week({ week, byDate, today, weekTotal }) {
  return (
    <>
      {week.map((date, i) => (
        <DayCell key={date ?? `pad-${i}`} date={date} day={date ? byDate.get(date) : null} today={today} />
      ))}
      <div className="hidden items-center justify-end pl-2 sm:flex">
        <span className={`tabular text-xs ${weekTotal > 0 ? 'font-semibold text-ink-secondary' : 'text-ink-muted/50'}`}>
          {weekTotal > 0 ? formatGBP(weekTotal) : '—'}
        </span>
      </div>
    </>
  )
}

function DayCell({ date, day, today }) {
  if (!date) return <div aria-hidden="true" />

  const isToday = date === toIso(today)
  const isPast = date < toIso(today)
  const total = day?.total ?? 0
  const names = day?.occurrences.map((o) => o.name).join(', ')

  return (
    <div
      title={total > 0 ? `${formatGBP(total)} — ${names}` : undefined}
      className={`flex min-h-[3.25rem] flex-col rounded-lg border p-1.5 transition ${
        total > 0
          ? 'border-accent/25 bg-accent-soft/60'
          : 'border-transparent bg-surface-sunken/50'
      } ${isPast ? 'opacity-55' : ''}`}
    >
      <span
        className={`text-[11px] ${
          isToday
            ? 'inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent font-semibold text-accent-fg'
            : 'text-ink-muted'
        }`}
      >
        {Number(date.slice(8, 10))}
      </span>
      {total > 0 && (
        // Smaller on a phone so "£15.99" fits a narrow cell whole:
        // truncating to "£..." is useless where there is no hover to
        // recover the value from.
        <span className="tabular mt-auto text-[10px] font-semibold leading-tight text-accent-text sm:text-[11px]">
          {formatGBP(total)}
        </span>
      )}
    </div>
  )
}

function NavButton({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        disabled
          ? 'cursor-not-allowed border-ink-muted/10 text-ink-muted/40'
          : 'border-ink-muted/20 text-ink-secondary hover:bg-surface-sunken'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Rows of seven ISO date strings, padded with nulls so the 1st lands under
 * its real weekday. Monday-first, so JS's Sunday-is-0 is shifted by one.
 */
function buildWeeks(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7

  const cells = Array(leadingBlanks).fill(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
