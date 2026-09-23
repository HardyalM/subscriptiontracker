import { useRef, useState } from 'react'
import { parseCsv, mapCsvToCommitments } from '../../lib/csvImport.js'
import { formatGBP, exposureFor } from '../../lib/calculations.js'
import { IconUpload, IconX, IconCheck } from '../Icon.jsx'

/**
 * CSV import with a mandatory preview step.
 *
 * Nothing is written until the user has seen exactly what will and will not
 * be imported, and why each rejected row was rejected. Rows are validated by
 * the same validateCommitment() the add/edit form uses, so the importer can
 * never be more permissive than typing it in by hand.
 */
export default function CsvImport({ onImport, isImporting, onClose }) {
  const [result, setResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [readError, setReadError] = useState('')
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setReadError('')
    setFileName(file.name)
    try {
      const text = await file.text()
      setResult(mapCsvToCommitments(parseCsv(text)))
    } catch {
      setReadError("That file couldn't be read. Is it a .csv?")
      setResult(null)
    }
  }

  const canImport = result && result.valid.length > 0

  return (
    <div className="max-h-[85vh] overflow-y-auto rounded-2xl border border-ink-muted/12 bg-surface shadow-raised">
      <div className="flex items-center justify-between gap-3 border-b border-ink-muted/10 px-5 py-4 sm:px-6">
        <h2 id="csv-import-heading" className="text-sm font-semibold text-ink-primary">
          Import from CSV
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
        {!result && (
          <>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Pick a .csv with a header row. Name, cost, frequency and date are needed; type and category are
              guessed if you leave them out. Nothing is imported until you've seen the preview.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-muted/25 py-6 text-sm font-semibold text-ink-secondary transition hover:border-brand-500 hover:bg-accent-soft/60 hover:text-accent-text"
            >
              <IconUpload className="h-4 w-4" />
              Choose a CSV file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {readError && (
              <p role="alert" className="rounded-lg bg-status-critical/8 px-3 py-2 text-sm text-status-critical-text">
                {readError}
              </p>
            )}
          </>
        )}

        {result && (
          <>
            <p className="text-xs text-ink-muted">{fileName}</p>

            {result.unknownHeaders.length > 0 && (
              <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-secondary">
                Ignoring {result.unknownHeaders.length === 1 ? 'a column' : 'columns'} this app doesn't use:{' '}
                {result.unknownHeaders.join(', ')}.
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-semibold text-ink-primary">
                {result.valid.length} {result.valid.length === 1 ? 'row' : 'rows'} ready
              </span>
              {result.invalid.length > 0 && (
                <span className="font-semibold text-status-critical-text">
                  {result.invalid.length} won't import
                </span>
              )}
            </div>

            {result.valid.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-ink-muted/15">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 text-right font-semibold">Exposure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.valid.map((c, i) => (
                      <tr key={i} className="border-t border-ink-muted/10">
                        <td className="truncate px-3 py-2 text-ink-primary">{c.name}</td>
                        <td className="px-3 py-2 text-ink-secondary">{c.type === 'bnpl' ? 'BNPL' : 'Subscription'}</td>
                        <td className="tabular px-3 py-2 text-right text-ink-primary">
                          {formatGBP(exposureFor(c) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.invalid.length > 0 && (
              <div className="rounded-xl border border-status-critical/25 bg-status-critical/5 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-status-critical-text">Skipped</p>
                <ul className="mt-1.5 space-y-1">
                  {result.invalid.map((row) => (
                    <li key={row.line} className="text-sm text-ink-secondary">
                      <span className="font-medium text-ink-primary">Line {row.line}</span>
                      {row.name !== '(no name)' && <> — {row.name}</>}: {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                disabled={!canImport || isImporting}
                onClick={() => onImport(result.valid)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-card transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconCheck className="h-4 w-4" />
                {isImporting
                  ? 'Importing…'
                  : `Import ${result.valid.length} ${result.valid.length === 1 ? 'row' : 'rows'}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setFileName('')
                }}
                className="rounded-lg border border-ink-muted/20 px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken"
              >
                Choose a different file
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
