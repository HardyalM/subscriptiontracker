import { downloadCommitmentsCsv } from '../lib/csvExport.js'
import { IconDownload } from './Icon.jsx'

export default function ExportButton({ commitments }) {
  return (
    <button
      onClick={() => downloadCommitmentsCsv(commitments)}
      disabled={commitments.length === 0}
      className="flex items-center gap-1.5 rounded-lg border border-ink-muted/25 px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-brand-500 hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-muted/25 disabled:hover:text-ink-secondary"
    >
      <IconDownload className="h-4 w-4" />
      <span className="hidden sm:inline">Export CSV</span>
    </button>
  )
}
