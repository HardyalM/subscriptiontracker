/**
 * An empty state that tells you what to do next, rather than just that
 * there is nothing here.
 *
 * The artwork is built from the app's own parts — three stacked cards,
 * the front one carrying the icon — so it recolours with the theme and the
 * accent instead of being a fixed illustration that looks pasted in on a
 * dark background.
 */
export default function EmptyState({ icon: Icon, title, description, actions, footnote, compact = false }) {
  return (
    <div
      className={`relative isolate flex flex-col items-center overflow-hidden rounded-2xl border border-ink-muted/12 bg-surface text-center shadow-card animate-rise-in ${
        compact ? 'px-6 py-10' : 'px-6 py-14 sm:py-16'
      }`}
    >
      {/* A faint dot grid, faded out towards the edges, and a wash of the
          accent behind the artwork. Both decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--ink-muted) / 0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(ellipse 60% 70% at 50% 35%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 35%, black, transparent)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-40 w-80 -translate-x-1/2 -translate-y-1/3 rounded-full bg-accent/10 blur-3xl"
      />

      {Icon && (
        <div aria-hidden="true" className={`relative ${compact ? 'mb-5 h-12 w-12' : 'mb-6 h-16 w-16'}`}>
          <span className="absolute inset-0 -translate-x-3 translate-y-1 -rotate-[10deg] rounded-2xl border border-ink-muted/12 bg-surface-sunken shadow-card" />
          <span className="absolute inset-0 translate-x-3 translate-y-1 rotate-[10deg] rounded-2xl border border-ink-muted/12 bg-surface-sunken shadow-card" />
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl border border-accent/20 bg-surface text-accent-text shadow-raised">
            <Icon className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
          </span>
        </div>
      )}

      <h3 className={`font-display font-bold tracking-tight text-ink-primary ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-secondary">{description}</p>}

      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      {footnote && <div className="mt-4 text-[13px] text-ink-secondary">{footnote}</div>}
    </div>
  )
}
