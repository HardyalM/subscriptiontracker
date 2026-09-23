/**
 * Tracks whether the most recent interaction was keyboard or pointer, and
 * exposes it as data-modality on <html>.
 *
 * Exists because :focus-visible can't express "focus ring on keyboard only"
 * for text inputs — browsers match it on a clicked input too, since typing
 * is expected to follow. With this, index.css shows the input ring only
 * when focus arrived by keyboard, while the border still marks the active
 * field for everyone.
 */
const NAVIGATION_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'])

export function installModalityTracking(root = document.documentElement) {
  root.dataset.modality = 'pointer'

  const onKey = (e) => {
    // Typing into a field is not navigation — only keys that move focus
    // switch to keyboard mode.
    if (NAVIGATION_KEYS.has(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.modality = 'keyboard'
  }
  const onPointer = () => {
    root.dataset.modality = 'pointer'
  }

  window.addEventListener('keydown', onKey, true)
  window.addEventListener('pointerdown', onPointer, true)

  return () => {
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('pointerdown', onPointer, true)
  }
}
