// Local browser storage. As of Phase 3 this is no longer where commitments
// live — Supabase is (see commitmentQueries.js). What remains here is the
// reader for data saved by v1, so a one-time import can rescue it, plus the
// id helper the demo data still uses.

const STORAGE_KEY = 'bnpl-tracker:commitments:v1'

/**
 * Whatever v1 left in this browser. Returns an empty array rather than
 * throwing on malformed or blocked storage — a failed read should mean
 * "nothing to import", never a crash on load.
 */
export function readLocalCommitments() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('Could not read locally saved commitments.', err)
    return []
  }
}

/**
 * Called only after an import has succeeded, so the prompt stops reappearing.
 * The data now lives in the account; leaving a stale copy in the browser
 * invites importing it twice.
 */
export function clearLocalCommitments() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('Could not clear locally saved commitments.', err)
  }
}

export function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
