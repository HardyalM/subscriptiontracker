import { useCallback, useState } from 'react'

/**
 * Tracks which specific actions are in flight, by key.
 *
 * A mutation's own isPending only says *that* something is running, and its
 * `variables` only remember the latest call — so with two rows' buttons
 * tapped in quick succession, a mutation-level spinner lands on the wrong
 * row. Keying by what was actually pressed ("decision:<id>:kept",
 * "row:<id>") puts the spinner on the button the person touched.
 *
 * It also answers the double-tap problem: a button whose key is pending is
 * disabled, so a slow network can't turn one "Keep it" into two
 * decision_log rows.
 */
export function usePendingActions() {
  const [pending, setPending] = useState(() => new Set())

  const run = useCallback(async (key, fn) => {
    setPending((prev) => new Set(prev).add(key))
    try {
      return await fn()
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  const isPending = useCallback((key) => pending.has(key), [pending])

  /** True if any in-flight key starts with this prefix — e.g. any decision on one row. */
  const isPendingPrefix = useCallback(
    (prefix) => Array.from(pending).some((key) => key.startsWith(prefix)),
    [pending],
  )

  return { run, isPending, isPendingPrefix }
}
