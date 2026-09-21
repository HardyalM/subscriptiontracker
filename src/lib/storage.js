import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bnpl-tracker:commitments:v1'

/**
 * localStorage-backed state, so data survives a page reload without any
 * backend. If you move this to Firestore in AI Studio, swap the body of
 * this hook for a Firestore subscription and keep the same call signature —
 * every component just calls useCommitments() and doesn't know the
 * difference.
 */
export function useCommitments() {
  const [commitments, setCommitments] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (err) {
      console.warn('Could not read saved commitments, starting empty.', err)
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments))
    } catch (err) {
      console.warn('Could not save commitments.', err)
    }
  }, [commitments])

  return [commitments, setCommitments]
}

export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
