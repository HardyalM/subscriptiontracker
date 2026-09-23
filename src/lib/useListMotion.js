import { useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useAppearance } from './appearance.jsx'

/**
 * Enter, exit and reorder motion for a list, from a ref on its parent.
 *
 * Rows animate when they arrive (an add, an import), leave (a delete, a
 * "Keep it" that moves the row out of the review queue) and move (a cancel
 * that sorts the row below the active ones). Without it those changes are
 * one-frame jumps, and a row that vanishes from under the cursor reads as
 * a glitch rather than a result.
 *
 * Follows the app's own reduce-motion setting, not just the OS one — the
 * setting in Appearance has to switch this off too.
 */
export function useListMotion() {
  const { reducedMotion } = useAppearance()
  const [ref, enable] = useAutoAnimate({ duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })

  useEffect(() => {
    enable(!reducedMotion)
  }, [enable, reducedMotion])

  return ref
}
