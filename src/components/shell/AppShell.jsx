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
export default function AppShell({ actions, menu, nav = [], children }) {
  return (
    <div className="min-h-screen bg-surface-page">
      {/* Frosted glass: translucent white over the page, blurred and
          slightly saturated so colour from the cards scrolling beneath
          reads through as a soft tint rather than a grey smear. Falls back
          to near-opaque where backdrop-filter is unsupported, so text stays
          legible either way. */}
      <header className="sticky top-0 z-20 border-b border-ink-muted/[0.12] bg-surface/90 supports-[backdrop-filter]:bg-surface/65 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-action">
                <IconLogo className="h-5 w-5" />
              </div>
              <p className="truncate font-display text-[15px] font-bold leading-tight tracking-tight text-ink-primary">
                {/* The full name needs the room the nav and actions take below
                    xl, so it shortens there as well as on phones. */}
                <span className="hidden xl:inline">Subscription &amp; BNPL Tracker</span>
                <span className="xl:hidden">BNPL Tracker</span>
              </p>
            </div>

            {nav.length > 0 && <NavTabs items={nav} className="hidden md:flex" />}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{actions}</div>
            {menu}
          </div>
        </div>

        {/* Below md, navigation and the page actions get their own row, so
            the identity block never has to compete with them for width. The
            active tab's underline sits on this row's bottom edge, as it sits
            on the header's from md up. */}
        <div className="flex items-center justify-between gap-2 border-t border-ink-muted/12 px-4 py-2 sm:px-6 md:hidden">
          {nav.length > 0 ? <NavTabs items={nav} className="flex" /> : <span />}
          <div className="flex items-center gap-2">{actions}</div>
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

/**
 * Primary navigation. Real links (#/settings), so middle-click, copy link
 * and the back button all behave; the click is intercepted only to route
 * without a full reload.
 */
function NavTabs({ items, className = '' }) {
  return (
    <nav aria-label="Primary" className={`items-center gap-1 ${className}`}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              item.onSelect()
            }}
            className={`relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              item.active ? 'text-ink-primary' : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary'
            }`}
          >
            {/* Icons drop on phones, where the tabs share a row with the actions. */}
            {Icon && <Icon className="hidden h-4 w-4 sm:block" />}
            {item.label}
            {item.active && (
              <span aria-hidden="true" className="absolute inset-x-3 -bottom-[7px] h-[2px] rounded-full bg-accent animate-fade-in md:-bottom-[13px]" />
            )}
          </a>
        )
      })}
    </nav>
  )
}
