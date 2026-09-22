import { IconLogo } from '../Icon.jsx'

/**
 * One metric.
 *
 * Two variants. `hero` is the filled sapphire card used exactly once, for
 * the annualised exposure figure — this app's whole argument is that the
 * annual number is the true one, so it is the only metric given that much
 * weight. Everything else is a quiet white card; if three cards shout, none
 * of them does.
 *
 * Values render in the display face with tabular figures, so digits line up
 * column-to-column and a changing number doesn't make the card twitch.
 */
export default function StatCard({ label, value, detail, hero = false, tone, footer }) {
  if (hero) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-brand-800 p-6 shadow-elevated sm:col-span-2 sm:p-7">
        {/* Same lighting treatment as the sign-in panel, so the two read as
            one product rather than two designs. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(36rem 24rem at 12% 0%, rgba(122,182,240,0.22), transparent 62%), radial-gradient(28rem 20rem at 95% 110%, rgba(42,120,214,0.30), transparent 58%)',
          }}
        />
        <IconLogo aria-hidden="true" className="pointer-events-none absolute -right-7 -top-7 h-40 w-40 text-white/[0.07]" />

        <div className="relative">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-200" aria-hidden="true" />
            {label}
          </p>
          <p className="tabular mt-4 font-display text-[2.75rem] font-extrabold leading-none tracking-tight text-white sm:text-5xl">
            {value}
          </p>
          {detail && <p className="relative mt-3.5 max-w-md text-sm leading-relaxed text-brand-100/85">{detail}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card transition-all duration-200 hover:border-ink-muted/20 hover:shadow-card-hover">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">{label}</p>
      <p
        className={`tabular mt-3 font-display text-3xl font-bold leading-none tracking-tight ${
          tone === 'warning' ? 'text-status-warning' : 'text-ink-primary'
        }`}
      >
        {value}
      </p>
      {detail && <p className="mt-2.5 text-sm leading-snug text-ink-secondary">{detail}</p>}
      {footer}
    </div>
  )
}
