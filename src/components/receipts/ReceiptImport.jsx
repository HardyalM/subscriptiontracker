import { useRef, useState } from 'react'
import { useParseReceipt, deleteReceipt } from '../../lib/receiptQueries.js'
import { toCommitmentDraft } from '../../lib/receiptSchema.js'
import { IconUpload, IconX, IconCheck } from '../Icon.jsx'

/**
 * Reads a receipt or order-confirmation email into a draft commitment.
 *
 * Two deliberate properties, both from the same principle the renewal
 * checkpoint is built on — surface something, let the person decide:
 *   - the consent step is its own screen, shown at the point of use, naming
 *     exactly what leaves the device and why
 *   - the result pre-fills the normal add form. Nothing is ever written
 *     straight to the database from a model's output.
 */
export default function ReceiptImport({ onDraft, onClose }) {
  const [stage, setStage] = useState('consent') // consent | input
  const [mode, setMode] = useState('upload') // upload | paste
  const [text, setText] = useState('')
  const [failure, setFailure] = useState('')
  const inputRef = useRef(null)
  const parse = useParseReceipt()

  async function run({ file, pastedText }) {
    setFailure('')
    try {
      const result = await parse.mutateAsync({ file, text: pastedText })

      if (!result.ok) {
        // A parsing failure is surfaced as one — never a half-filled form.
        setFailure(result.reason)
        await deleteReceipt(result.storagePath)
        return
      }

      onDraft(toCommitmentDraft(result.receipt))
    } catch (err) {
      setFailure(err?.message ?? "Couldn't read that. Nothing was saved.")
    }
  }

  return (
    <div className="max-h-[85vh] overflow-y-auto rounded-2xl border border-ink-muted/12 bg-surface shadow-raised">
      <div className="flex items-center justify-between gap-3 border-b border-ink-muted/10 px-5 py-4 sm:px-6">
        <h2 id="receipt-import-heading" className="text-sm font-semibold text-ink-primary">
          Read a receipt
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-sunken hover:text-ink-primary"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {stage === 'consent' ? (
          <>
            <p className="text-sm font-semibold text-ink-primary">This one sends data off your device</p>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-secondary">
              <li>· The receipt image, or the text you paste, is sent to Anthropic's Claude API to be read.</li>
              <li>· It's used once, to pull out the merchant, amount and payment dates. Nothing else.</li>
              <li>· Uploaded images are stored privately in your own account, and you can delete them.</li>
              <li>· Whatever comes back is shown to you as a draft. Nothing is saved until you confirm it.</li>
              <li>· Every other feature in this app works without sending anything anywhere.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStage('input')}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong"
              >
                I understand — continue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-ink-muted/20 px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex rounded-lg bg-surface-sunken p-1 text-sm">
              {[
                ['upload', 'Upload a photo'],
                ['paste', 'Paste an email'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
                    mode === value ? 'bg-surface text-ink-primary shadow-card' : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'upload' ? (
              <>
                <button
                  type="button"
                  disabled={parse.isPending}
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-muted/25 py-6 text-sm font-semibold text-ink-secondary transition hover:border-brand-500 hover:bg-accent-soft/60 hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconUpload className="h-4 w-4" />
                  {parse.isPending ? 'Reading…' : 'Choose a photo'}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) run({ file })
                  }}
                />
                <p className="text-xs text-ink-muted">PNG, JPEG or WebP, up to 5 MB.</p>
              </>
            ) : (
              <>
                <textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the confirmation email here…"
                  className="w-full rounded-lg border border-ink-muted/20 bg-surface px-3 py-2.5 text-sm text-ink-primary shadow-sm transition focus-ring"
                />
                <button
                  type="button"
                  disabled={parse.isPending || text.trim().length < 20}
                  onClick={() => run({ pastedText: text })}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <IconCheck className="h-4 w-4" />
                  {parse.isPending ? 'Reading…' : 'Read it'}
                </button>
              </>
            )}

            {failure && (
              <p role="alert" className="rounded-lg bg-status-critical/8 px-3 py-2 text-sm leading-relaxed text-status-critical-text">
                {failure} Nothing was saved — you can try another photo, or just add it by hand.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
