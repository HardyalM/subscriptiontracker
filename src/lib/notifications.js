// Thin wrapper around the browser Notification API for the renewal
// checkpoint. Deliberately honest about its limits: with no service
// worker/push backend (out of scope — this is a local-only tracker), a
// notification can only fire while this tab is open and loaded. It is not
// a background reminder system. The one-per-day guard just stops it
// re-firing on every render/refresh within the same day.

const LAST_NOTIFIED_KEY = 'bnpl-tracker:last-notified-date'

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch (err) {
    console.warn('Could not request notification permission.', err)
    return getNotificationPermission()
  }
}

/**
 * Shows one notification for the day's checkpoint items, at most once per
 * calendar day, only if permission was already granted. Safe to call on
 * every render — the guard makes repeats a no-op.
 */
export function notifyIfDue(items, today = new Date()) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  if (!items || items.length === 0) return

  const todayIso = today.toISOString().slice(0, 10)
  let last = null
  try {
    last = window.localStorage.getItem(LAST_NOTIFIED_KEY)
  } catch {
    // localStorage unavailable — skip the guard rather than fail silently forever
  }
  if (last === todayIso) return

  const title = items.length === 1 ? '1 commitment needs a look' : `${items.length} commitments need a look`
  const names = items.slice(0, 3).map((c) => c.name)
  const body = names.join(', ') + (items.length > 3 ? `, +${items.length - 3} more` : '')

  try {
    new Notification(title, { body })
    window.localStorage.setItem(LAST_NOTIFIED_KEY, todayIso)
  } catch (err) {
    console.warn('Could not show notification.', err)
  }
}
