import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../lib/session.jsx'
import { useEmailAlertPreference, setEmailAlerts } from '../../lib/guideQueries.js'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../../lib/notifications.js'
import { notify } from '../../lib/notify.jsx'
import Switch from '../ui/Switch.jsx'
import { SettingsCard, SettingRow } from './SettingsCard.jsx'

export default function PreferencesSection() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { data: emailAlerts, isPending: alertsLoading } = useEmailAlertPreference()
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [permission, setPermission] = useState(getNotificationPermission)

  async function toggleEmail(next) {
    setSavingAlerts(true)
    try {
      await setEmailAlerts(next)
      await queryClient.invalidateQueries({ queryKey: ['email-alerts', user?.id] })
      notify.success(next ? 'Email alerts on' : 'Email alerts off', {
        description: next ? "You'll get one email on days something falls due within 48 hours." : undefined,
      })
    } catch (error) {
      notify.error("Couldn't change email alerts", error, { retry: () => toggleEmail(next) })
    } finally {
      setSavingAlerts(false)
    }
  }

  async function toggleBrowser() {
    if (permission !== 'default') return
    setPermission(await requestNotificationPermission())
  }

  return (
    <div className="space-y-5">
      <SettingsCard title="Notifications" description="Both are off until you switch them on.">
        <SettingRow
          title="Email me what's due"
          description="One email a day, and only on days something falls due in the next 48 hours."
          control={
            alertsLoading ? (
              <div className="h-[26px] w-[44px] animate-pulse rounded-full bg-ink-muted/15" />
            ) : (
              <Switch label="Email me what's due" checked={Boolean(emailAlerts)} busy={savingAlerts} onChange={toggleEmail} />
            )
          }
        />
        {isNotificationSupported() && (
          <SettingRow
            title="Browser reminders"
            description={
              permission === 'denied'
                ? 'Blocked in your browser settings. Allow notifications for this site to switch them on.'
                : permission === 'granted'
                  ? "On. They only fire while this tab is open — there's no background push."
                  : "Only fires while this tab is open — there's no background push."
            }
            control={
              <Switch
                label="Browser reminders"
                checked={permission === 'granted'}
                disabled={permission !== 'default'}
                onChange={toggleBrowser}
              />
            }
          />
        )}
      </SettingsCard>
    </div>
  )
}
