/**
 * A group of related settings: a hairline-bordered card with a soft shadow,
 * a title, and a short description of what the group is for.
 *
 * `tone="danger"` is the red-tinted variant for destructive actions. It is
 * distinct at a glance — tinted border, tinted header — so destructive
 * controls can never be mistaken for ordinary preferences.
 */
export function SettingsCard({ title, description, tone = 'default', children }) {
  const danger = tone === 'danger'
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-surface shadow-card ${
        danger ? 'border-status-critical/30' : 'border-ink-muted/12'
      }`}
    >
      <header
        className={`border-b px-card-pad py-4 ${
          danger ? 'border-status-critical/20 bg-status-critical/[0.05]' : 'border-ink-muted/12'
        }`}
      >
        <h3 className={`font-display text-[15px] font-bold tracking-tight ${danger ? 'text-status-critical-text' : 'text-ink-primary'}`}>
          {title}
        </h3>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
      </header>
      <div className="divide-y divide-ink-muted/12">{children}</div>
    </section>
  )
}

/**
 * One setting: a bold title, a muted description, and its control on the
 * right. Stacks below `sm` so a long description never squeezes the
 * control.
 */
export function SettingRow({ title, description, control, htmlFor, stack = false }) {
  const Title = htmlFor ? 'label' : 'p'
  return (
    <div
      className={`flex flex-col gap-3 px-card-pad py-4 ${stack ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-6'}`}
    >
      <div className="min-w-0">
        <Title htmlFor={htmlFor} className="block text-sm font-semibold text-ink-primary">
          {title}
        </Title>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">{description}</p>}
      </div>
      {control && <div className={`shrink-0 ${stack ? 'w-full' : ''}`}>{control}</div>}
    </div>
  )
}
