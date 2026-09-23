import { useCallback, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useBankConnections, useCreateLinkToken, useExchangePublicToken } from '../../lib/bankSyncQueries.js'
import { IconWallet, IconCheck } from '../Icon.jsx'
import { ConnectionCardSkeleton } from '../dashboard/Skeletons.jsx'

/**
 * Connecting a bank. Sandbox only — every surface here says so, because a
 * demo that lets someone believe their real account is attached is worse
 * than no demo.
 *
 * The consent step is deliberately its own screen rather than a line of
 * small print next to the button: it is the only place in this app where
 * data would leave the user's own account, so it says plainly what goes
 * where before anything happens.
 */
export default function BankSyncCard() {
  const { data: connections = [], isPending } = useBankConnections()
  const [stage, setStage] = useState('idle') // idle | consent | linking
  const [error, setError] = useState('')

  const createLinkToken = useCreateLinkToken()
  const exchange = useExchangePublicToken()
  const [linkToken, setLinkToken] = useState(null)

  const onSuccess = useCallback(
    async (publicToken, metadata) => {
      try {
        await exchange.mutateAsync({ publicToken, institutionName: metadata?.institution?.name ?? null })
        setStage('idle')
        setLinkToken(null)
      } catch (err) {
        setError(err?.message ?? "Couldn't finish connecting.")
        setStage('idle')
      }
    },
    [exchange],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => {
      setStage('idle')
      setLinkToken(null)
    },
  })

  async function handleAgree() {
    setError('')
    setStage('linking')
    try {
      const token = await createLinkToken.mutateAsync()
      setLinkToken(token)
    } catch (err) {
      setError(err?.message ?? "Couldn't start the connection.")
      setStage('idle')
    }
  }

  // Plaid Link opens as soon as the token arrives.
  if (linkToken && ready && stage === 'linking') open()

  if (isPending) return <ConnectionCardSkeleton />

  return (
    <section className="rounded-2xl border border-ink-muted/12 bg-surface p-card-pad shadow-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-secondary">
          <IconWallet className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-bold text-ink-primary">Bank sync</h2>

          {connections.length > 0 ? (
            <ConnectedList connections={connections} />
          ) : stage === 'consent' ? (
            <ConsentStep
              onAgree={handleAgree}
              onCancel={() => setStage('idle')}
              isBusy={createLinkToken.isPending}
            />
          ) : (
            <>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
                Spot recurring payments automatically instead of typing them in. Anything found is suggested for
                you to confirm — nothing is added on its own.
              </p>
              <SandboxNotice />
              <button
                type="button"
                onClick={() => setStage('consent')}
                className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong"
              >
                Connect a bank
              </button>
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-status-critical/8 px-3 py-2 text-sm text-status-critical-text">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ConsentStep({ onAgree, onCancel, isBusy }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-semibold text-ink-primary">Before you connect</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-secondary">
        <li>· You'll sign in through Plaid. This app never sees your bank login.</li>
        <li>· Plaid sends this app your transaction descriptions, amounts and dates.</li>
        <li>· Those are stored in your account here and used to spot recurring payments.</li>
        <li>· Nothing is shared with anyone else, and no payment can ever be made from this app.</li>
        <li>· You can disconnect at any time, which stops any further data arriving.</li>
      </ul>
      <SandboxNotice />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAgree}
          disabled={isBusy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? 'Opening…' : 'I understand — continue'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-ink-muted/20 px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken"
        >
          Not now
        </button>
      </div>
    </div>
  )
}

function ConnectedList({ connections }) {
  return (
    <div className="mt-1.5 space-y-2">
      {connections.map((connection) => (
        <div key={connection.id} className="flex flex-wrap items-center gap-2 text-sm">
          <IconCheck className="h-4 w-4 shrink-0 text-status-good" />
          <span className="font-medium text-ink-primary">{connection.institution_name ?? 'Connected account'}</span>
          <span className="rounded-md bg-status-warning/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-status-warning-text">
            {connection.plaid_env} — demo data
          </span>
          <span className="text-xs text-ink-muted">
            {connection.last_synced_at
              ? `Last synced ${new Date(connection.last_synced_at).toLocaleDateString('en-GB')}`
              : 'Waiting for first sync'}
          </span>
        </div>
      ))}
    </div>
  )
}

function SandboxNotice() {
  return (
    <p className="mt-2.5 rounded-lg bg-status-warning/8 px-3 py-2 text-xs leading-relaxed text-ink-secondary">
      <span className="font-semibold text-status-warning-text">Sandbox only.</span> This connects to Plaid's test
      environment and returns made-up transactions from a fake bank. It cannot reach a real account, and this app
      is not a regulated financial service.
    </p>
  )
}
