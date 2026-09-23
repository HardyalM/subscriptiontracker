import { useState } from 'react'
import { useCommitments, useClearCommitments, useReplaceCommitments } from '../../lib/commitmentQueries.js'
import { buildDemoCommitments } from '../../lib/demoData.js'
import { deleteAccount } from '../../lib/accountActions.js'
import { notify } from '../../lib/notify.jsx'
import { IconWarning } from '../Icon.jsx'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ConfirmDialog.jsx'
import { SettingsCard, SettingRow } from './SettingsCard.jsx'

/**
 * Destructive actions, kept apart from everything else and each behind a
 * confirmation that waits for the database before it closes.
 *
 * "Replace with example data" lives here rather than in a menu: it deletes
 * every commitment before inserting the examples. It used to sit in the
 * account dropdown with no confirmation at all.
 */
export default function DangerZoneSection() {
  const { data: commitments = [] } = useCommitments()
  const clear = useClearCommitments()
  const replace = useReplaceCommitments()
  const [dialog, setDialog] = useState(null) // 'demo' | 'clear' | 'account'

  const count = commitments.length
  const plural = (n) => `${n} ${n === 1 ? 'commitment' : 'commitments'}`

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-status-critical/25 bg-status-critical/[0.05] px-card-pad py-4">
        <IconWarning className="mt-0.5 h-5 w-5 shrink-0 text-status-critical-text" />
        <p className="text-sm leading-relaxed text-ink-secondary">
          Everything here is permanent. Each action asks you to confirm, and none of them can be undone afterwards.
        </p>
      </div>

      <SettingsCard tone="danger" title="Your data" description={count ? `You have ${plural(count)}.` : 'You have no commitments yet.'}>
        <SettingRow
          title="Replace with example data"
          description={
            count
              ? `Deletes your ${plural(count)} and their decision history, then loads a realistic example set.`
              : 'Loads a realistic example set so you can see how the app works.'
          }
          control={
            <Button variant={count ? 'danger' : 'secondary'} onClick={() => (count ? setDialog('demo') : loadDemo())}>
              {count ? 'Replace…' : 'Load examples'}
            </Button>
          }
        />
        <SettingRow
          title="Delete all commitments"
          description="Removes every commitment and its decision history. Your account stays."
          control={
            <Button variant="danger" disabled={!count} onClick={() => setDialog('clear')}>
              Delete all…
            </Button>
          }
        />
      </SettingsCard>

      <SettingsCard tone="danger" title="Account">
        <SettingRow
          title="Delete account"
          description="Permanently deletes your account, every commitment, all decision history, uploaded receipts and any bank connection. You'll be signed out."
          control={
            <Button variant="danger" onClick={() => setDialog('account')}>
              Delete account…
            </Button>
          }
        />
      </SettingsCard>

      <ConfirmDialog
        open={dialog === 'demo'}
        title="Replace your data with examples?"
        body={<p>This deletes your {plural(count)} and their decision history, then loads an example set. It can't be undone.</p>}
        confirmLabel="Replace"
        busyLabel="Replacing…"
        onConfirm={async () => {
          await replace.mutateAsync(buildDemoCommitments())
          notify.success('Example data loaded')
        }}
        onClose={() => {
          setDialog(null)
          replace.reset()
        }}
      />

      <ConfirmDialog
        open={dialog === 'clear'}
        title="Delete all commitments?"
        body={<p>This removes all {plural(count)} and their decision history. Your account stays. It can't be undone.</p>}
        confirmLabel="Delete all"
        busyLabel="Deleting…"
        onConfirm={async () => {
          await clear.mutateAsync()
          notify.success('All commitments deleted')
        }}
        onClose={() => {
          setDialog(null)
          clear.reset()
        }}
      />

      <ConfirmDialog
        open={dialog === 'account'}
        title="Delete your account?"
        body={
          <>
            <p>
              This permanently deletes your account and everything in it — every commitment, all decision history,
              uploaded receipts and any bank connection.
            </p>
            <p className="mt-2">There is no recovery. If you only want to start over, delete your commitments instead.</p>
          </>
        }
        requireText="DELETE"
        confirmLabel="Delete account"
        busyLabel="Deleting account…"
        onConfirm={() => deleteAccount('DELETE')}
        onClose={() => setDialog(null)}
      />
    </div>
  )

  async function loadDemo() {
    try {
      await replace.mutateAsync(buildDemoCommitments())
      notify.success('Example data loaded')
    } catch (error) {
      notify.error("Couldn't load example data", error, { retry: loadDemo })
    }
  }
}
