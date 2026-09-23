import { useEffect, useState } from 'react'
import { useSession } from '../../lib/session.jsx'
import { notify } from '../../lib/notify.jsx'
import { IconSignOut } from '../Icon.jsx'
import Button from '../ui/Button.jsx'
import { SettingsCard, SettingRow } from './SettingsCard.jsx'

const joined = (iso) =>
  iso ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : ''

export default function ProfileSection() {
  const { user, workspace, renameWorkspace, signOut } = useSession()
  const [name, setName] = useState(workspace?.name ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => setName(workspace?.name ?? ''), [workspace?.name])

  const dirty = name.trim() !== (workspace?.name ?? '') && name.trim().length > 0

  async function save(e) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true)
    const { error } = await renameWorkspace(name)
    setSaving(false)
    if (error) notify.error("Couldn't rename your workspace", error, { retry: () => save(e) })
    else notify.success('Workspace renamed', { description: `Now called “${name.trim()}”.` })
  }

  return (
    <div className="space-y-5">
      <SettingsCard title="Account" description="How you sign in to this app.">
        <SettingRow
          title="Email"
          description="Used to sign in, and for alerts if you switch them on."
          control={<span className="text-sm font-medium text-ink-primary">{user?.email}</span>}
        />
        <SettingRow
          title="Member since"
          control={<span className="tabular text-sm font-medium text-ink-primary">{joined(user?.created_at)}</span>}
        />
        <SettingRow
          title="Sign out"
          description="Ends this session on this device. Your data stays in your account."
          control={
            <Button icon={<IconSignOut className="h-4 w-4" />} onClick={() => signOut()}>
              Sign out
            </Button>
          }
        />
      </SettingsCard>

      <SettingsCard title="Workspace" description="Where your commitments live.">
        <form onSubmit={save} noValidate>
          <SettingRow
            title="Workspace name"
            htmlFor="workspace-name"
            description="Only you can see this."
            stack
            control={
              workspace ? (
                <div className="flex gap-2">
                  <input
                    id="workspace-name"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    className="field h-10 min-w-0 flex-1 rounded-xl border border-ink-muted/25 bg-surface px-3.5 text-sm text-ink-primary shadow-sm transition-all duration-150 hover:border-ink-muted/40 sm:max-w-sm"
                  />
                  <Button type="submit" variant="primary" disabled={!dirty} loading={saving} loadingLabel="Saving…">
                    Save
                  </Button>
                </div>
              ) : (
                <div className="h-10 w-full max-w-sm animate-pulse rounded-xl bg-ink-muted/15" />
              )
            }
          />
        </form>
      </SettingsCard>
    </div>
  )
}
