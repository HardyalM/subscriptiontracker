import { useState } from 'react'
import { findCancellationGuide } from '../../lib/merchantMatching.js'
import { useCancellationReference } from '../../lib/guideQueries.js'
import { IconChevronRight } from '../Icon.jsx'

/**
 * How to stop paying for something — information only.
 *
 * This app never contacts a provider on anyone's behalf. It tells you where
 * to go and what to expect, and you do it. That line is deliberate: acting
 * on someone's account without them watching is exactly the kind of silent
 * action the rest of this app refuses to take.
 *
 * Providers are matched through the same merchant_patterns table bank sync
 * uses, so one curated list serves both.
 */
export default function CancellationGuide({ commitment }) {
  const { data } = useCancellationReference()
  const [open, setOpen] = useState(false)

  if (!data) return null

  const guide = findCancellationGuide(commitment.name, data.patterns, data.guides)
  if (!guide) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:underline"
      >
        <IconChevronRight className={`h-3 w-3 transition ${open ? 'rotate-90' : ''}`} />
        How to stop paying for this
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border border-ink-muted/12 bg-surface-sunken/60 px-3 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{guide.provider_name}</p>

          {guide.steps?.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {guide.steps.map((step, i) => (
                <li key={i} className="text-xs leading-relaxed text-ink-secondary">
                  {step}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            {guide.cancel_url && (
              <a
                href={guide.cancel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
              >
                Open {guide.provider_name} →
              </a>
            )}
            {guide.phone && <span className="text-xs text-ink-secondary">{guide.phone}</span>}
          </div>

          <p className="mt-2 text-[11px] leading-snug text-ink-muted">
            You do this yourself — this app never contacts a provider for you.
          </p>
        </div>
      )}
    </div>
  )
}
