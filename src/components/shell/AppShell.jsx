import { IconLogo } from '../Icon.jsx'

/**
 * The application shell: a sticky top bar and a centred content column.
 *
 * Top navigation rather than a sidebar, deliberately. A sidebar earns its
 * width when there are places to go; this app is one page with sections on
 * it, so a permanent nav rail would be a column of whitespace pretending to
 * be structure. The bar keeps identity and account controls anchored and
 * gives the content the full width instead.
 *
 * `actions` are the page-level controls (export, add, import). They sit in
 * the bar on desktop and drop below it on small screens rather than
 * crowding the logo.
 */
export default function AppShell({ actions, menu, children }) {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-20 border-b border-ink-muted/10 bg-surface-page/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface-page/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-action">
              <IconLogo className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold leading-tight tracking-tight text-ink-primary">
                Subscription &amp; BNPL Tracker
              </p>
              <p className="hidden text-xs leading-tight text-ink-secondary sm:block">
                What your recurring costs actually add up to.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{actions}</div>
            {menu}
          </div>
        </div>

        {/* Below md the page actions get their own row, so the identity
            block never has to compete with them for width. */}
        <div className="flex items-center justify-end gap-2 border-t border-ink-muted/10 px-4 py-2.5 sm:px-6 md:hidden">
          {actions}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}

/**
 * Section heading used between blocks of the dashboard, so the page reads
 * as deliberate groups rather than a stack of unrelated cards.
 */
export function SectionHeading({ title, description, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold tracking-tight text-ink-primary">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>}
      </div>
      {children}
    </div>
  )
}
