import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { applyKeepDecision, exposureFor } from '../../lib/calculations.js'
import { buildDemoCommitments } from '../../lib/demoData.js'
import { formatShortDate } from '../../lib/format.js'
import { IconLogo, IconLayout, IconGear, IconDownload, IconPlus, IconCheck } from '../Icon.jsx'
import StatGrid from '../dashboard/StatGrid.jsx'
import ReviewQueue from '../dashboard/ReviewQueue.jsx'
import CashFlowForecast from '../calendar/CashFlowForecast.jsx'

// The width the dashboard is laid out at before it is scaled into the
// panel — about what it gets on a laptop, so the grid takes its real
// four-column desktop shape rather than a squeezed one.
const CANVAS_WIDTH = 1120
// How far the window runs past the panel's right edge.
const BLEED = 48
// Solid down to 230px above the foot, clear by 88px above it — just over
// the disclaimer, which sits 56px up.
const FADE = 'linear-gradient(to bottom, black calc(100% - 230px), transparent calc(100% - 88px))'

/**
 * The dashboard itself, shown on the sign-in screen.
 *
 * Not a screenshot. These are the real StatGrid, ReviewQueue and
 * CashFlowForecast, fed the example data and scaled down, so the preview
 * is sharp at any resolution, follows the theme and accent the visitor
 * picked, and can never drift out of date with the product it advertises.
 *
 * The example set is shown one step in: "Fitness app" has just been kept.
 * That is what the floating toast reports, and the queue beneath it agrees
 * — the renewal has moved on a week and the tally reads one decision made.
 *
 * Purely a picture. Hidden from assistive technology, inert, and unable to
 * take a click or focus, so nothing in it can be mistaken for a control on
 * the sign-in form.
 */
export default function ProductPreview({ className = '' }) {
  const areaRef = useRef(null)
  const canvasRef = useRef(null)
  const [frame, setFrame] = useState(null) // { scale, height }

  const { commitments, kept } = useMemo(() => {
    const today = new Date()
    const all = buildDemoCommitments(today)
    const target = all.find((c) => c.name === 'Fitness app')
    if (!target) return { commitments: all, kept: null }

    const patched = {
      ...target,
      ...applyKeepDecision(target),
      decisionLog: [
        ...(target.decisionLog || []),
        { date: today.toISOString().slice(0, 10), decision: 'kept', amount: exposureFor(target) || 0 },
      ],
    }
    return { commitments: all.map((c) => (c === target ? patched : c)), kept: patched }
  }, [])

  // Fit the canvas to the panel, and keep it fitted as the window resizes.
  useLayoutEffect(() => {
    const area = areaRef.current
    const canvas = canvasRef.current
    if (!area || !canvas) return undefined

    const measure = () => {
      const width = area.clientWidth - 56 + BLEED // starts at the panel's 56px gutter
      const scale = Math.max(0.3, width / CANVAS_WIDTH)
      setFrame({ scale, height: canvas.offsetHeight * scale })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={areaRef}
      aria-hidden="true"
      inert=""
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      // Fades out towards the foot of the panel, so the dashboard reads as
      // continuing below. Measured from the bottom rather than as a
      // percentage: it must be fully clear of the disclaimer at every
      // screen height, not just proportionally faded.
      style={{ maskImage: FADE, WebkitMaskImage: FADE }}
    >
      <div
        className={`absolute left-14 top-7 overflow-hidden rounded-[18px] bg-surface-page ring-1 ring-white/15 ${
          frame ? 'animate-rise-in' : 'opacity-0'
        }`}
        style={{
          width: frame ? CANVAS_WIDTH * frame.scale : CANVAS_WIDTH,
          height: frame ? frame.height : undefined,
          boxShadow:
            '0 0 0 1px rgb(0 0 0 / 0.06), 0 30px 60px -20px rgb(2 8 23 / 0.55), 0 60px 120px -30px rgb(2 8 23 / 0.6)',
        }}
      >
        <div
          ref={canvasRef}
          style={{ width: CANVAS_WIDTH, transform: `scale(${frame?.scale ?? 1})`, transformOrigin: 'top left' }}
        >
          <WindowBar />
          <div className="space-y-8 p-8">
            <StatGrid commitments={commitments} onReviewClick={() => {}} />
            <ReviewQueue commitments={commitments} onAction={() => {}} />
            <CashFlowForecast commitments={commitments} />
          </div>
        </div>
      </div>

      {/* From xl up only: on narrower panels it would sit over the window's
          title bar, including the "Example data" label. */}
      {kept && frame && (
        <div className="absolute right-10 top-0 hidden w-[20rem] animate-rise-in items-start gap-3 rounded-2xl border border-ink-muted/12 bg-surface p-3.5 shadow-elevated xl:flex [animation-delay:550ms] [animation-fill-mode:both]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-status-good/12 text-status-good-text">
            <IconCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-ink-primary">Kept {kept.name}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-secondary">
              Moved on to its next payment, {formatShortDate(kept.nextPaymentDate)}.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The app's header, drawn as a window title bar. Static markup rather than
 * the real AppShell, which carries the account menu and a live session.
 */
function WindowBar() {
  return (
    <div className="flex h-16 items-center gap-5 border-b border-ink-muted/12 bg-surface/90 px-6">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-action">
          <IconLogo className="h-5 w-5" />
        </span>
        <span className="font-display text-[15px] font-bold tracking-tight text-ink-primary">BNPL Tracker</span>
        {/* Says plainly that these figures are illustrative. Beside the
            name, where the floating toast never covers it. */}
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-text">
          Example data
        </span>
      </div>
      <nav className="flex h-16 items-center gap-1">
        <span className="relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-primary">
          <IconLayout className="h-4 w-4" />
          Dashboard
          <span className="absolute inset-x-3 -bottom-[14px] h-[2px] rounded-full bg-accent" />
        </span>
        <span className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-secondary">
          <IconGear className="h-4 w-4" />
          Settings
        </span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-muted/20 bg-surface px-3 text-sm font-semibold text-ink-primary shadow-sm">
          <IconDownload className="h-4 w-4" />
          Export CSV
        </span>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-accent-fg shadow-action">
          <IconPlus className="h-4 w-4" />
          Add
        </span>
        <span className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg">
          D
        </span>
      </div>
    </div>
  )
}
