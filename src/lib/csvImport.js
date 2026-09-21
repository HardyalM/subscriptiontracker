// CSV import: parsing and row mapping, kept pure so the tricky parts are
// covered by tests rather than by clicking through the UI.
//
// Hand-rolled rather than pulling in PapaParse, for symmetry with
// csvExport.js and to keep the dependency list as short as the icon set. The
// awkward parts of CSV — quoted fields, escaped quotes, commas and newlines
// inside quotes — are handled below and tested directly.

import { validateCommitment, normaliseCommitment } from './commitmentValidation.js'
import { defaultCategoryFor } from './constants.js'

/**
 * Parses CSV text into an array of rows of raw string cells.
 * Handles quoted fields, "" escapes, and CRLF or LF line endings.
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const source = String(text ?? '').replace(/^﻿/, '') // strip a BOM from Excel

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      // Swallow the \n of a \r\n pair.
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  // A final field/row with no trailing newline.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

// Accepted header spellings, normalised. Deliberately generous about case,
// spacing and punctuation: a spreadsheet exported from anywhere should not
// fail on "Cost per payment" vs "cost_per_payment".
const HEADER_ALIASES = {
  name: 'name',
  type: 'type',
  costperpayment: 'costPerPayment',
  cost: 'costPerPayment',
  amount: 'costPerPayment',
  frequency: 'frequency',
  nextpaymentdate: 'nextPaymentDate',
  nextpayment: 'nextPaymentDate',
  date: 'nextPaymentDate',
  renewaldate: 'nextPaymentDate',
  totaloriginalamount: 'totalOriginalAmount',
  originalamount: 'totalOriginalAmount',
  total: 'totalOriginalAmount',
  instalmentsremaining: 'instalmentsRemaining',
  installmentsremaining: 'instalmentsRemaining',
  instalments: 'instalmentsRemaining',
  bnplmode: 'bnplMode',
  mode: 'bnplMode',
  status: 'status',
  category: 'category',
}

export function normaliseHeader(header) {
  const key = String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-().]/g, '')
  return HEADER_ALIASES[key] ?? null
}

/**
 * Turns parsed CSV rows into commitments, splitting them into those that
 * will import and those that will not.
 *
 * Every row goes through validateCommitment — the same function the add/edit
 * form uses — so the importer cannot be more permissive than the form.
 *
 * @returns {{valid: object[], invalid: {line: number, name: string, reason: string}[], headers: string[], unknownHeaders: string[]}}
 */
export function mapCsvToCommitments(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { valid: [], invalid: [], headers: [], unknownHeaders: [] }
  }

  const [headerRow, ...dataRows] = rows
  const headers = headerRow.map(normaliseHeader)
  const unknownHeaders = headerRow.filter((h, i) => headers[i] === null && String(h).trim() !== '')

  const valid = []
  const invalid = []

  dataRows.forEach((cells, index) => {
    const line = index + 2 // 1-indexed, and the header is line 1

    const draft = {}
    headers.forEach((key, i) => {
      if (!key) return
      const cell = String(cells[i] ?? '').trim()
      draft[key] = cell
    })

    if (Object.values(draft).every((v) => v === '')) return // a blank line

    const prepared = prepareDraft(draft)
    const problem = validateCommitment(prepared)

    if (problem) {
      invalid.push({ line, name: prepared.name || '(no name)', reason: problem })
      return
    }

    valid.push(normaliseCommitment(prepared))
  })

  return { valid, invalid, headers, unknownHeaders }
}

/**
 * Nudges raw cells towards the shapes the validator expects, without ever
 * inventing a value it could reject on. Missing type defaults to
 * subscription and missing category follows the type, because those are the
 * two a spreadsheet most often omits; everything else must be present and
 * correct, and fails loudly if not.
 */
function prepareDraft(draft) {
  const type = (draft.type || 'subscription').toLowerCase()
  const prepared = {
    ...draft,
    name: draft.name ?? '',
    type,
    frequency: (draft.frequency || 'monthly').toLowerCase(),
    nextPaymentDate: normaliseDate(draft.nextPaymentDate),
    costPerPayment: stripCurrency(draft.costPerPayment),
    totalOriginalAmount: draft.totalOriginalAmount ? stripCurrency(draft.totalOriginalAmount) : null,
    status: (draft.status || 'active').toLowerCase(),
    category: draft.category || defaultCategoryFor(type),
  }

  if (type === 'bnpl') {
    prepared.bnplMode = (draft.bnplMode || 'fixed').toLowerCase()
  } else {
    delete prepared.bnplMode
    prepared.instalmentsRemaining = null
  }

  return prepared
}

/** '£12.99' / '1,234.50' -> '12.99' / '1234.50'. */
export function stripCurrency(value) {
  return String(value ?? '')
    .replace(/[£$€,\s]/g, '')
    .trim()
}

/**
 * Accepts ISO directly, and converts the UK DD/MM/YYYY that a spreadsheet
 * will usually produce. Anything else is passed through untouched so the
 * validator rejects it with a clear message rather than this guessing.
 */
export function normaliseDate(value) {
  const raw = String(value ?? '').trim()
  const uk = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (uk) {
    const [, d, m, y] = uk
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return raw
}
