/**
 * Every colour is a CSS variable holding an "R G B" triplet, defined in
 * src/index.css per theme and per accent. That indirection is what makes
 * three things possible without touching components:
 *
 *   - dark mode       .dark on <html> swaps the neutral and status values
 *   - accent colour   [data-accent] on <html> swaps the brand scale
 *   - opacity         `<alpha-value>` keeps /12, /40 etc. working, because
 *                     the variable is a bare triplet rather than a colour
 *
 * Semantic accent tokens exist because one brand step can't serve every
 * role in both themes. brand-600 is a button background (must stay dark for
 * white text) and was also link text (must go light on a dark surface).
 * `accent` and `accent-text` separate those jobs, and dark mode can move
 * one without breaking the other.
 */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Driven by a class on <html> rather than the media query, so the user's
  // Light / Dark / System choice wins. "System" re-applies the media query
  // in JS — see src/lib/appearance.jsx.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Categorical chart colours. Fixed per entity and never tied to the
        // accent: changing your accent must not repaint "Streaming".
        series: { 1: v('series-1'), 2: v('series-2'), 3: v('series-3') },
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        accent: {
          DEFAULT: v('accent'), // solid fill: primary buttons, active controls
          strong: v('accent-strong'), // its hover / pressed state
          text: v('accent-text'), // links and accent-coloured text
          soft: v('accent-soft'), // tinted backgrounds
          fg: v('accent-fg'), // text on an accent fill
        },
        ink: { primary: v('ink-primary'), secondary: v('ink-secondary'), muted: v('ink-muted') },
        // raised: a surface lifted above its container — the active pill in a
        // segmented control. White in light mode; lighter than the card in
        // dark mode, where "raised" has to mean brighter, not whiter.
        surface: { DEFAULT: v('surface'), page: v('surface-page'), sunken: v('surface-sunken'), raised: v('surface-raised') },
        status: {
          good: v('status-good'),
          'good-text': v('status-good-text'),
          warning: v('status-warning'),
          'warning-text': v('status-warning-text'),
          critical: v('status-critical'),
          // Text-weight variants. The base values read well as fills and
          // icons but measured under AA as small text: green 3.35:1, amber
          // 3.12:1, red 4.41:1 on their own tints. Each *-text step clears
          // 4.5:1 in both themes.
          'critical-text': v('status-critical-text'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Shadow colour and strength come from variables too. A bluish shadow
      // at 6% opacity is elegant on off-white and invisible on charcoal, so
      // dark mode switches to black and multiplies the strength.
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow-ink) / calc(0.04 * var(--shadow-k))), 0 1px 1px rgb(var(--shadow-ink) / calc(0.03 * var(--shadow-k)))',
        'card-hover':
          '0 4px 16px rgb(var(--shadow-ink) / calc(0.07 * var(--shadow-k))), 0 1px 2px rgb(var(--shadow-ink) / calc(0.04 * var(--shadow-k)))',
        raised:
          '0 8px 30px rgb(var(--shadow-tint) / calc(0.10 * var(--shadow-k))), 0 2px 8px rgb(var(--shadow-tint) / calc(0.06 * var(--shadow-k)))',
        // Layered rather than one big blur: a tight contact shadow, a mid
        // ambient one, and a wide soft one.
        elevated:
          '0 1px 2px rgb(var(--shadow-tint) / calc(0.06 * var(--shadow-k))), 0 8px 24px -4px rgb(var(--shadow-tint) / calc(0.10 * var(--shadow-k))), 0 24px 48px -12px rgb(var(--shadow-tint) / calc(0.12 * var(--shadow-k)))',
        // Tinted to the accent, so a primary button glows in its own colour.
        action: '0 1px 2px rgb(var(--brand-800) / 0.24), 0 6px 16px -4px rgb(var(--brand-800) / 0.40)',
        'action-hover': '0 2px 4px rgb(var(--brand-800) / 0.24), 0 10px 24px -6px rgb(var(--brand-800) / 0.48)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      // Tailwind 3's opacity scale is multiples of 5, and an opacity
      // modifier off that scale (`/8`, `/12`) emits no CSS at all — silently.
      // See scripts/check-tailwind-classes.mjs, which CI runs after build.
      opacity: {
        8: '0.08',
        12: '0.12',
      },
      // Density: row and card padding read from variables, so "Compact"
      // is one attribute on <html> rather than a prop through every table.
      spacing: {
        'row-y': 'var(--density-row-y)',
        'card-pad': 'var(--density-card-pad)',
      },
      // Enter and exit motion. Short and eased: a sheet that takes more
      // than ~200ms to arrive feels like lag. All of it is neutralised by
      // the reduce-motion rule in index.css.
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'sheet-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
        },
        'menu-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'menu-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(-3px) scale(0.98)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'fade-out': 'fade-out 140ms ease-in forwards',
        'sheet-in': 'sheet-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-out': 'sheet-out 140ms ease-in forwards',
        'menu-in': 'menu-in 140ms cubic-bezier(0.16, 1, 0.3, 1)',
        'menu-out': 'menu-out 110ms ease-in forwards',
        'rise-in': 'rise-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
