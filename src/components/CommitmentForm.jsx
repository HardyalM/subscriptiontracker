import { useEffect, useState } from 'react'
import { CATEGORIES, FREQUENCIES, defaultCategoryFor } from '../lib/constants.js'
import { newId } from '../lib/storage.js'
import { validateCommitment, normaliseCommitment } from '../lib/commitmentValidation.js'
import { describeWriteError } from '../lib/writeErrors.js'
import { IconX } from './Icon.jsx'

const emptyDraft = (type = 'subscription') => ({
  id: null,
  name: '',
  type,
  costPerPayment: '',
  frequency: 'monthly',
  nextPaymentDate: '',
  totalOriginalAmount: '',
  instalmentsRemaining: '',
  bnplMode: 'fixed',
  status: 'active',
  category: defaultCategoryFor(type),
})

// Saved records store nulls for BNPL-only/optional fields (see App.jsx
// handleSave). Controlled number/text inputs need '' instead of null, or
// React logs an uncontrolled-to-controlled warning the moment the field
// would otherwise render `value={null}`.
function toDraft(record) {
  return {
    ...record,
    totalOriginalAmount: record.totalOriginalAmount ?? '',
    instalmentsRemaining: record.instalmentsRemaining ?? '',
    bnplMode: record.bnplMode ?? 'fixed',
  }
}

/**
 * Add/edit form for a single Commitment. Controlled, single-entity form —
 * v1 scope deliberately has no bulk import or multi-step wizard.
 */
export default function CommitmentForm({ editingCommitment, onSave, onCancel, saveError = null, isSaving = false }) {
  const [draft, setDraft] = useState(() => (editingCommitment ? toDraft(editingCommitment) : emptyDraft()))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(editingCommitment ? toDraft(editingCommitment) : emptyDraft())
    setError('')
  }, [editingCommitment])

  function update(field, value) {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      // Re-pick a sensible category default when the type changes, unless
      // the user already customised it away from the previous default.
      if (field === 'type') {
        const wasDefault = prev.category === defaultCategoryFor(prev.type)
        next.category = wasDefault ? defaultCategoryFor(value) : prev.category
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    // The CSV importer runs these exact rules — see commitmentValidation.js.
    const problem = validateCommitment(draft)
    if (problem) return setError(problem)

    setError('')
    const record = {
      ...draft,
      ...normaliseCommitment(draft),
      id: draft.id || newId(),
      decisionLog: draft.decisionLog || [],
    }
    onSave(record)
    if (!editingCommitment) setDraft(emptyDraft(draft.type))
  }

  const inputClass =
    'w-full rounded-lg border border-ink-muted/20 bg-white px-3 py-2.5 text-sm text-ink-primary shadow-sm transition focus-ring'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5'

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[85vh] overflow-y-auto rounded-2xl border border-ink-muted/12 bg-white shadow-raised"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-muted/10 px-5 py-4 sm:px-6">
        <h2 id="commitment-form-heading" className="text-sm font-semibold text-ink-primary">
          {editingCommitment ? 'Edit commitment' : 'Add a commitment'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-sunken p-1 text-sm">
            {['subscription', 'bnpl'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update('type', t)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  draft.type === t ? 'bg-white text-brand-600 shadow-card' : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {t === 'subscription' ? 'Subscription' : 'BNPL'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-sunken hover:text-ink-primary"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div>
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className={inputClass}
            type="text"
            placeholder={draft.type === 'bnpl' ? 'e.g. Trainers (Klarna)' : 'e.g. Netflix'}
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="costPerPayment">
              Cost per payment (£)
            </label>
            <input
              id="costPerPayment"
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={draft.costPerPayment}
              onChange={(e) => update('costPerPayment', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="frequency">
              Frequency
            </label>
            <select
              id="frequency"
              className={inputClass}
              value={draft.frequency}
              onChange={(e) => update('frequency', e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f === 'one-off installments' ? 'One-off installments' : f[0].toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="nextPaymentDate">
              {draft.type === 'bnpl' ? 'Next instalment date' : 'Next renewal date'}
            </label>
            <input
              id="nextPaymentDate"
              className={inputClass}
              type="date"
              value={draft.nextPaymentDate}
              onChange={(e) => update('nextPaymentDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className={inputClass}
              value={draft.category}
              onChange={(e) => update('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {draft.type === 'bnpl' && (
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-series-2/20 bg-series-2/5 p-4">
            <div>
              <label className={labelClass} htmlFor="totalOriginalAmount">
                Total original amount (£)
              </label>
              <input
                id="totalOriginalAmount"
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={draft.totalOriginalAmount}
                onChange={(e) => update('totalOriginalAmount', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="instalmentsRemaining">
                Instalments remaining
              </label>
              <input
                id="instalmentsRemaining"
                className={inputClass}
                type="number"
                min="0"
                step="1"
                value={draft.instalmentsRemaining}
                onChange={(e) => update('instalmentsRemaining', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass} htmlFor="bnplMode">
                Plan type
              </label>
              <select
                id="bnplMode"
                className={inputClass}
                value={draft.bnplMode || 'fixed'}
                onChange={(e) => update('bnplMode', e.target.value)}
              >
                <option value="fixed">Fixed — ends when the instalments run out</option>
                <option value="recurring">Recurring — an open-ended credit line</option>
              </select>
              <p className="mt-1.5 text-xs leading-snug text-ink-muted">
                {draft.bnplMode === 'recurring'
                  ? "Keeps rolling on to the next payment, the way a subscription does."
                  : 'Counts down and finishes.'}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={`${inputClass} max-w-[10rem]`}
            value={draft.status}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {(error || saveError) && (
          <p role="alert" className="rounded-lg bg-status-critical/8 px-3 py-2 text-sm text-status-critical">
            {error || describeWriteError(saveError)}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : editingCommitment ? 'Save changes' : 'Add commitment'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-ink-muted/20 px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
