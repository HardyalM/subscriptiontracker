/**
 * Authorship credit, with a link to verify it.
 *
 * Shown on the sign-in screen as well as inside the app, because most
 * people who look at a portfolio project never create an account — the
 * credit has to be visible before the auth wall, not only behind it.
 */
export const AUTHOR = {
  name: 'Hardyal Mahal',
  linkedin: 'https://www.linkedin.com/in/hardy-mahal-371442252/',
}

// A prop rather than a className override: two arbitrary font sizes on one
// element would leave the winner to Tailwind's stylesheet order. `md` stays
// at 13px on phones, where 14px wraps the line in two.
const SIZES = { sm: 'text-[13px]', md: 'text-[13px] sm:text-sm' }

export default function BuiltBy({ size = 'sm', className = '' }) {
  return (
    <p className={`${SIZES[size]} leading-relaxed text-ink-secondary ${className}`}>
      Designed and built by <span className="font-semibold text-ink-primary">{AUTHOR.name}</span>
      <span aria-hidden="true"> · </span>
      <a
        href={AUTHOR.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded font-semibold text-accent-text underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        LinkedIn<span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  )
}
