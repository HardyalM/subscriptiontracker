import { useEffect, useState } from 'react'
import { CATEGORIES, FREQUENCIES, defaultCategoryFor } from '../lib/constants.js'
import { newId } from '../lib/storage.js'
import { validateCommitment, normaliseCommitment } from '../lib/commitmentValidation.js'
import { describeWriteError } from '../lib/writeErrors.js'
import { IconX, IconSpinner } from './Icon.jsx'

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
    // Not followed by a draft reset. This used to clear the fields straight
    // after calling onSave — which is async and not awaited — so a failed
    // save left the dialog open with everything the user typed already
    // gone. On success the dialog closes and unmounts, which discards the
    // draft anyway; on failure it must survive so the user can fix and
    // resubmit.
    onSave(record)
  }

  // A receipt draft arrives through editingCommitment but has no id, so it
  // is a new record. Checking for the id, not the prop, is what tells an
  // edit from an add — otherwise a parsed receipt opens titled "Edit".
  const isEdit = Boolean(editingCommitment?.id)

  const inputClass =
    'h-11 w-full rounded-xl border border-ink-muted/25 bg-white px-3.5 text-[15px] text-ink-primary shadow-sm outline-none transition-all duration-150 placeholder:text-ink-secondary/60 hover:border-ink-muted/40 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12'
  const labelClass = 'mb-1.5 block text-[13px] font-semibold text-ink-secondary'

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-ink-muted/12 bg-white shadow-elevated"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink-muted/10 px-6 pb-4 pt-5">
        <div className="min-w-0">
          <h2 id="commitment-form-heading" className="font-display text-lg font-bold tracking-tight text-ink-primary">
            {isEdit ? 'Edit commitment' : 'Add a commitment'}
          </h2>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {isEdit
              ? 'Changes apply straight away.'
              : 'A subscription that renews, or a BNPL plan you are paying off.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div>
          <span className={labelClass}>Type</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-sunken p-1" role="radiogroup" aria-label="Type">
            {['subscription', 'bnpl'].map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={draft.type === t}
                onClick={() => update('type', t)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                  draft.type === t ? 'bg-white text-ink-primary shadow-card' : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {t === 'subscription' ? 'Subscription' : 'BNPL plan'}
              </button>
            ))}
          </div>
        </div>

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
          <fieldset className="grid grid-cols-2 gap-4 rounded-xl border border-series-2/20 bg-series-2/[0.04] p-4">
            <legend className="px-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-series-2">Plan details</legend>
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
              <p className="mt-1.5 text-xs leading-snug text-ink-secondary">
                {draft.bnplMode === 'recurring'
                  ? "Keeps rolling on to the next payment, the way a subscription does."
                  : 'Counts down and finishes.'}
              </p>
            </div>
          </fieldset>
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
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-status-critical/20 bg-status-critical/[0.06] px-3.5 py-3"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-critical" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-status-critical-text">{error || describeWriteError(saveError)}</p>
          </div>
        )}
      </div>

      {/* Native dialog footer: sunken bar, actions right-aligned, the
          primary action last where the eye ends up. */}
      <div className="flex flex-col-reverse gap-2 border-t border-ink-muted/10 bg-surface-sunken/60 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-ink-muted/20 bg-white px-4 text-sm font-semibold text-ink-primary shadow-sm transition-all duration-150 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-action transition-all duration-150 hover:bg-brand-700 hover:shadow-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-wait disabled:opacity-80"
        >
          {isSaving && <IconSpinner className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Add commitment'}
        </button>
      </div>
    </form>
  )
}
