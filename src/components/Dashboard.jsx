import CommitmentRow from './CommitmentRow.jsx'
import { IconWallet } from './Icon.jsx'

/**
 * Every commitment, per-payment cost and annualised/remaining cost shown
 * side by side (spec requirement — never show one without the other).
 */
export default function Dashboard({ commitments, onEdit, onToggleStatus, isFiltered = false }) {
  const active = commitments.filter((c) => c.status === 'active')
  const cancelled = commitments.filter((c) => c.status === 'cancelled')

  if (commitments.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-muted/25 bg-white/60 px-8 py-12 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink-muted/10 text-ink-muted">
          <IconWallet className="h-5 w-5" />
        </div>
        <p className="text-sm text-ink-secondary">
          {isFiltered
            ? 'Nothing matches those filters. Clear them to see everything again.'
            : 'No commitments yet — add your first subscription or BNPL plan above to see it here.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-secondary">Active commitments</h2>
          <span className="tabular text-xs text-ink-muted">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <p className="py-4 text-sm text-ink-secondary">Nothing active right now.</p>
        ) : (
          <div className="divide-y divide-ink-muted/8">
            {active.map((c) => (
              <CommitmentRow key={c.id} commitment={c} onEdit={onEdit} onToggleStatus={onToggleStatus} />
            ))}
          </div>
        )}
      </div>

      {cancelled.length > 0 && (
        <div className="rounded-2xl border border-ink-muted/12 bg-white p-5 shadow-card sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Cancelled</h2>
            <span className="tabular text-xs text-ink-muted">{cancelled.length}</span>
          </div>
          <div className="divide-y divide-ink-muted/8">
            {cancelled.map((c) => (
              <CommitmentRow key={c.id} commitment={c} onEdit={onEdit} onToggleStatus={onToggleStatus} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
