import { useCallback, useEffect, useState } from 'react'

/**
 * A minimal hash router: '#/settings/appearance' -> ['settings', 'appearance'].
 *
 * Hash-based rather than a routing library because the app has two screens,
 * and a hash needs no server configuration — deep links and the back button
 * work on any static host, including the Cloud Run container, with no
 * rewrite rules.
 */
function parse() {
  return window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function useHashRoute() {
  const [segments, setSegments] = useState(parse)

  useEffect(() => {
    const onChange = () => setSegments(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((path) => {
    const next = `#/${path.replace(/^\/+/, '')}`
    if (window.location.hash !== next) window.location.hash = next
    window.scrollTo({ top: 0 })
  }, [])

  return { segments, navigate }
}
