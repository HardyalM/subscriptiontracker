import { useRef } from 'react'

/**
 * A segmented control with a sliding thumb.
 *
 * The thumb is one element that moves, rather than a background toggled on
 * each segment — so switching glides instead of blinking. Segments are
 * equal width, which is what lets the thumb's position be a simple
 * percentage of its index.
 *
 * Behaves as a radio group: arrow keys move the selection, and only the
 * selected segment is in the tab order, the way native radio groups work.
 */
export default function SegmentedControl({ value, onChange, options, label, size = 'md' }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const buttons = useRef([])

  function handleKey(e) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  const height = size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKey}
      className="relative grid rounded-xl bg-surface-sunken p-1 ring-1 ring-inset ring-ink-muted/12"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-lg bg-surface-raised shadow-card ring-1 ring-ink-muted/12 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, i) => {
        const active = i === index
        return (
          <button
            key={option.value}
            ref={(el) => (buttons.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`relative z-[1] flex items-center justify-center gap-1.5 rounded-lg px-3 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${height} ${
              active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
