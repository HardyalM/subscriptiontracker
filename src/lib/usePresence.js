import { useEffect, useRef, useState } from 'react'

/**
 * Keeps an element mounted long enough to play its exit animation.
 *
 * React removes an element the instant its condition goes false, which is
 * why overlays usually vanish in one frame while arriving smoothly. This
 * holds it for one more phase — 'exiting' — so it can animate out, then
 * unmounts.
 *
 * Unmounting waits for the animation's own `animationend` rather than a
 * guessed timer, so it can't cut an animation short or linger after one. A
 * fallback timer covers the case where no animation runs at all — which is
 * exactly what happens with reduce-motion on, where every animation is
 * collapsed to ~0ms.
 *
 * @returns {{ mounted: boolean, exiting: boolean, onAnimationEnd: () => void }}
 */
export function usePresence(open, fallbackMs = 220) {
  const [held, setHeld] = useState(open)
  const timer = useRef(null)

  // Mounted on the same render that opens it, not one render later. A
  // consumer's own effects on `open` — moving focus inside, trapping Tab —
  // need the element to exist when they run.
  const mounted = open || held
  const exiting = !open && held

  useEffect(() => {
    if (open) {
      setHeld(true)
      return undefined
    }
    if (!held) return undefined
    timer.current = setTimeout(() => setHeld(false), fallbackMs)
    return () => clearTimeout(timer.current)
  }, [open, held, fallbackMs])

  function onAnimationEnd(e) {
    // Only the element's own exit animation ends the presence — not a
    // child's animation bubbling up.
    if (!exiting || (e && e.target !== e.currentTarget)) return
    clearTimeout(timer.current)
    setHeld(false)
  }

  return { mounted, exiting, onAnimationEnd }
}
