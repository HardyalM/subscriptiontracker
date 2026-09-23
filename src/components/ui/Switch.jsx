/**
 * An iOS-style toggle switch.
 *
 * A real <button role="switch">, so Space and Enter toggle it and screen
 * readers announce "on" / "off". The knob stays white in both themes, as a
 * native switch's does; the track carries the state, in the accent colour.
 */
export default function Switch({ checked, onChange, disabled = false, label, busy = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed ${
        checked ? 'bg-accent' : 'bg-ink-muted/30'
      } ${disabled ? 'opacity-50' : ''} ${busy ? 'cursor-wait' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25),0_1px_1px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
