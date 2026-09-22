/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Category/series colours — validated dataviz palette, fixed order.
        // Also doubles as the UI's brand accent (slot 1 blue) so the chart
        // and the interface read as one system, not two palettes bolted
        // together.
        series: {
          1: '#2a78d6', // blue — brand accent / Streaming
          2: '#eb6834', // orange — Retail BNPL / renewal-checkpoint accent
          3: '#1baf7a', // aqua — Other subscriptions
        },
        brand: {
          50: '#eef5fd',
          100: '#dbeafc',
          200: '#b0d3f7',
          300: '#7fb6f0',
          400: '#4a93e6',
          500: '#2a78d6',
          600: '#1e5fb5',
          700: '#184c92',
          800: '#163f77',
          900: '#153563',
        },
        ink: {
          primary: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781',
        },
        surface: {
          DEFAULT: '#ffffff',
          page: '#f7f7f5',
          sunken: '#f1f1ee',
        },
        status: {
          good: '#0ca30c',
          warning: '#d97a06',
          critical: '#d03b3b',
          // Text-weight variant. #d03b3b reads well as a fill or an icon,
          // but as small text on its own pale tint it measures 4.41:1 —
          // under AA. This step measures 5.02:1 on the same background.
          'critical-text': '#c23434',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,11,11,0.04), 0 1px 1px rgba(11,11,11,0.03)',
        'card-hover': '0 4px 16px rgba(11,11,11,0.07), 0 1px 2px rgba(11,11,11,0.04)',
        raised: '0 8px 30px rgba(21,53,99,0.10), 0 2px 8px rgba(21,53,99,0.06)',
        // Layered rather than one big blur: a tight contact shadow, a mid
        // ambient one, and a wide soft one. That is what makes a surface
        // read as sitting *on* the page rather than having a grey halo
        // airbrushed behind it.
        elevated:
          '0 1px 2px rgba(21,53,99,0.06), 0 8px 24px -4px rgba(21,53,99,0.10), 0 24px 48px -12px rgba(21,53,99,0.12)',
        // For the primary action: a coloured shadow tinted to the button
        // itself, so it glows rather than smudges.
        action: '0 1px 2px rgba(22,63,119,0.24), 0 6px 16px -4px rgba(22,63,119,0.40)',
        'action-hover': '0 2px 4px rgba(22,63,119,0.24), 0 10px 24px -6px rgba(22,63,119,0.48)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
