// Small hand-rolled icon set (no icon-library dependency) — consistent
// 1.75px stroke, rounded joins, 20x20 viewBox. Kept to exactly the glyphs
// this app uses.

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconPlus({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

export function IconDownload({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 14.5v1a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1" />
    </svg>
  )
}

export function IconPencil({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M12.7 3.7l3.6 3.6-9 9-4.1.5.5-4.1 9-9z" />
      <path d="M11 5.4l3.6 3.6" />
    </svg>
  )
}

export function IconBan({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <circle cx="10" cy="10" r="7" />
      <path d="M5.5 5.5l9 9" />
    </svg>
  )
}

export function IconRestore({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M4 4.5V8h3.5" />
      <path d="M4.3 8a6 6 0 111.2 6.2" />
    </svg>
  )
}

export function IconWallet({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <rect x="2.5" y="5" width="15" height="11" rx="2.2" />
      <path d="M2.5 8.5h15" />
      <path d="M13 12h2.2" />
    </svg>
  )
}

export function IconCalendarClock({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <rect x="2.5" y="3.8" width="15" height="13.4" rx="2.2" />
      <path d="M2.5 8h15M6.3 2.2v3.2M13.7 2.2v3.2" />
      <circle cx="13" cy="13.2" r="2.9" />
      <path d="M13 11.8v1.4l1 .7" />
    </svg>
  )
}

export function IconCheck({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M4.5 10.3l3.3 3.3 7.7-8" />
    </svg>
  )
}

export function IconRewind({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 4.5a6 6 0 11-5.2 3" />
      <path d="M3.2 3.5v3.4h3.4" />
    </svg>
  )
}

export function IconTag({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10.8 3H4.8A1.8 1.8 0 003 4.8v6l7.4 7.4a1.6 1.6 0 002.3 0l4.3-4.3a1.6 1.6 0 000-2.3L10.8 3z" />
      <circle cx="7.3" cy="7.3" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

// The app's mark: an open ring (a commitment's renewal cycle, never fully
// "closed" while it's active), a hand reaching from the centre out to a
// solid point on the ring (the next renewal date), and a solid centre dot
// (the commitment itself). Reads at a glance as "a payment, viewed across
// its cycle" — the app's actual thesis, not a generic finance glyph.
export function IconLogo({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M13.5 3.94A7 7 0 1 1 6.5 3.94" />
      <path d="M10 10L12.45 5.76" />
      <circle cx="10" cy="10" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="3.94" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSliders({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M3 6h14M3 10h14M3 14h14" />
      <circle cx="8" cy="6" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="13" cy="10" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="14" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSignOut({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M12.5 6.2V4.6A1.6 1.6 0 0010.9 3H5.1A1.6 1.6 0 003.5 4.6v10.8A1.6 1.6 0 005.1 17h5.8a1.6 1.6 0 001.6-1.6v-1.6" />
      <path d="M8.5 10h8m0 0l-2.6-2.6M16.5 10l-2.6 2.6" />
    </svg>
  )
}

export function IconSearch({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="M12.7 12.7L17 17" />
    </svg>
  )
}

export function IconUpload({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" />
      <path d="M4 14.5v1A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5v-1" />
    </svg>
  )
}

export function IconChevronLeft({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M12.5 4.5L7 10l5.5 5.5" />
    </svg>
  )
}

export function IconChevronRight({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M7.5 4.5L13 10l-5.5 5.5" />
    </svg>
  )
}

export function IconCamera({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M2.8 6.8h2.4l1.2-2h7.2l1.2 2h2.4a1.3 1.3 0 011.3 1.3v6.6a1.3 1.3 0 01-1.3 1.3H2.8a1.3 1.3 0 01-1.3-1.3V8.1a1.3 1.3 0 011.3-1.3z" />
      <circle cx="10" cy="11.2" r="2.8" />
    </svg>
  )
}

export function IconSpinner({ className }) {
  // Stroke-dash arc rather than a filled ring, so it keeps the same 1.75
  // stroke weight as every other glyph here. Animation is applied by the
  // caller so reduce-motion can suppress it.
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 2.5a7.5 7.5 0 1 1-7.5 7.5" />
    </svg>
  )
}

export function IconEye({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M1.8 10S4.6 4.8 10 4.8 18.2 10 18.2 10 15.4 15.2 10 15.2 1.8 10 1.8 10z" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  )
}

export function IconEyeOff({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M7.9 5.2A7.9 7.9 0 0 1 10 4.8c5.4 0 8.2 5.2 8.2 5.2a14.6 14.6 0 0 1-2.4 3.1" />
      <path d="M4.5 6.3A14.4 14.4 0 0 0 1.8 10S4.6 15.2 10 15.2a7.7 7.7 0 0 0 2.9-.55" />
      <path d="M8.4 8.5a2.4 2.4 0 0 0 3.3 3.4" />
      <path d="M3 3l14 14" />
    </svg>
  )
}

export function IconShield({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M10 2.4l6 2.2v4.6c0 3.6-2.5 6.7-6 8.4-3.5-1.7-6-4.8-6-8.4V4.6l6-2.2z" />
      <path d="M7.4 10.1l1.9 1.9 3.4-3.6" />
    </svg>
  )
}

export function IconX({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...common}>
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  )
}
