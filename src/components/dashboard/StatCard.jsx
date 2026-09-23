import { IconLogo } from '../Icon.jsx'

/**
 * One metric, as a widget.
 *
 * `hero` is the filled sapphire card, used exactly once — for annualised
 * exposure, because this app's argument is that the annual figure is the
 * true one. It spans two rows in the bento grid and uses the extra height
 * for a split of where the total comes from, rather than padding.
 *
 * The rest are quiet white cards with a small tinted icon: a hairline
 * border, a soft shadow that deepens a touch on hover, and the value set
 * large in the display face with tabular figures so digits line up across
 * cards.
 */
export default function StatCard({ label, value, detail, icon, tone = 'neutral', footer }) {
  const iconTone = {
    neutral: 'bg-surface-sunken text-ink-secondary ring-ink-muted/15',
    brand: 'bg-accent-soft text-accent-text ring-brand-500/15',
    warning: 'bg-status-warning/10 text-status-warning ring-status-warning/20',
    bnpl: 'bg-series-2/10 text-series-2 ring-series-2/20',
  }[tone]

  return (
    <div className="flex flex-col rounded-2xl border border-ink-muted/[0.13] bg-surface p-card-pad shadow-card transition-all duration-200 hover:-translate-y-px hover:border-ink-muted/20 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${iconTone}`}>
            {icon}
          </span>
        )}
      </div>
      <p
        className={`tabular mt-2 font-display text-[1.85rem] font-bold leading-none tracking-tight ${
          tone === 'warning' ? 'text-status-warning-text' : 'text-ink-primary'
        }`}
      >
        {value}
      </p>
      {detail && <div className="mt-2.5 text-sm leading-snug text-ink-secondary">{detail}</div>}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  )
}

export function HeroStatCard({ label, value, detail, breakdown }) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-brand-800 p-6 shadow-elevated sm:col-span-2 lg:row-span-2 sm:p-7">
      {/* Same lighting as the sign-in panel, so the two screens read as one
          product. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(36rem 26rem at 10% 0%, rgb(var(--brand-300) / 0.24), transparent 62%), radial-gradient(28rem 22rem at 100% 110%, rgb(var(--brand-500) / 0.32), transparent 58%)',
        }}
      />
      <IconLogo aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.06]" />

      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-200">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-200" aria-hidden="true" />
          {label}
        </p>
        <p className="tabular mt-4 font-display text-[2.9rem] font-extrabold leading-none tracking-tight text-white sm:text-[3.4rem]">
          {value}
        </p>
        {detail && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-brand-100/85">{detail}</p>}
      </div>

      {breakdown && (
        <div className="relative mt-auto grid grid-cols-2 gap-3 pt-7">
          {breakdown.map((part) => (
            <div key={part.label} className="rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200/85">{part.label}</p>
              <p className="tabular mt-1.5 font-display text-xl font-bold tracking-tight text-white">{part.value}</p>
              <p className="mt-0.5 text-xs text-brand-100/75">{part.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
