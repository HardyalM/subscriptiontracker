import { describe, it, expect } from 'vitest'
import { parseCsv, normaliseHeader, mapCsvToCommitments, stripCurrency, normaliseDate } from './csvImport.js'

describe('parseCsv', () => {
  it('parses a simple table', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('name,note\n"Smith, John",hi')).toEqual([['name', 'note'], ['Smith, John', 'hi']])
  })

  it('unescapes doubled quotes', () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']])
  })

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('a,b\n"one\ntwo",3')).toEqual([['a', 'b'], ['one\ntwo', '3']])
  })

  it('strips a BOM from a spreadsheet export', () => {
    expect(parseCsv('﻿name\nSpotify')).toEqual([['name'], ['Spotify']])
  })

  it('handles a missing trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('drops entirely blank lines', () => {
    expect(parseCsv('a\n\n1')).toEqual([['a'], ['1']])
  })

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv(null)).toEqual([])
  })
})

describe('normaliseHeader', () => {
  it('matches regardless of case, spaces and punctuation', () => {
    expect(normaliseHeader('Cost Per Payment')).toBe('costPerPayment')
    expect(normaliseHeader('cost_per_payment')).toBe('costPerPayment')
    expect(normaliseHeader('COSTPERPAYMENT')).toBe('costPerPayment')
  })

  it('accepts both British and American instalment spellings', () => {
    expect(normaliseHeader('instalments remaining')).toBe('instalmentsRemaining')
    expect(normaliseHeader('installments remaining')).toBe('instalmentsRemaining')
  })

  it('returns null for an unrecognised header', () => {
    expect(normaliseHeader('vendor notes')).toBeNull()
  })
})

describe('stripCurrency / normaliseDate', () => {
  it('strips symbols and thousands separators', () => {
    expect(stripCurrency('£1,234.50')).toBe('1234.50')
    expect(stripCurrency('12.99')).toBe('12.99')
  })

  it('converts UK dates to ISO', () => {
    expect(normaliseDate('01/10/2026')).toBe('2026-10-01')
    expect(normaliseDate('1/10/2026')).toBe('2026-10-01')
  })

  it('passes ISO through untouched', () => {
    expect(normaliseDate('2026-10-01')).toBe('2026-10-01')
  })

  it('passes anything else through for the validator to reject', () => {
    expect(normaliseDate('next Tuesday')).toBe('next Tuesday')
  })
})

describe('mapCsvToCommitments', () => {
  const header = 'name,type,cost per payment,frequency,next payment date,category'

  it('maps a valid row', () => {
    const { valid, invalid } = mapCsvToCommitments(
      parseCsv(`${header}\nVideo streaming,subscription,12.99,monthly,2026-10-01,Streaming`),
    )
    expect(invalid).toHaveLength(0)
    expect(valid[0]).toMatchObject({
      name: 'Video streaming',
      type: 'subscription',
      costPerPayment: 12.99,
      frequency: 'monthly',
      nextPaymentDate: '2026-10-01',
      category: 'Streaming',
    })
  })

  it('reports an invalid row with its line number and reason, and keeps the good ones', () => {
    const { valid, invalid } = mapCsvToCommitments(
      parseCsv(
        `${header}\nGood,subscription,10,monthly,2026-10-01,Streaming\nBad,subscription,0,monthly,2026-10-01,Streaming`,
      ),
    )
    expect(valid).toHaveLength(1)
    expect(invalid).toEqual([{ line: 3, name: 'Bad', reason: expect.stringMatching(/greater than 0/i) }])
  })

  it('applies the same rules as the form — an unknown category is rejected', () => {
    const { invalid } = mapCsvToCommitments(
      parseCsv(`${header}\nThing,subscription,10,monthly,2026-10-01,Groceries`),
    )
    expect(invalid[0].reason).toMatch(/category/i)
  })

  it('accepts £ and commas in the cost column', () => {
    const { valid } = mapCsvToCommitments(
      parseCsv(`${header}\nBig,subscription,"£1,234.50",monthly,2026-10-01,Other`),
    )
    expect(valid[0].costPerPayment).toBe(1234.5)
  })

  it('accepts a UK-formatted date', () => {
    const { valid } = mapCsvToCommitments(
      parseCsv(`${header}\nThing,subscription,10,monthly,01/10/2026,Other`),
    )
    expect(valid[0].nextPaymentDate).toBe('2026-10-01')
  })

  it('defaults type and category when the columns are absent', () => {
    const { valid } = mapCsvToCommitments(
      parseCsv('name,cost,frequency,date\nThing,10,monthly,2026-10-01'),
    )
    expect(valid[0].type).toBe('subscription')
    expect(valid[0].category).toBe('Other subscriptions')
  })

  it('requires instalments for a BNPL row', () => {
    const { invalid } = mapCsvToCommitments(
      parseCsv(`${header}\nTrainers,bnpl,25,monthly,2026-10-01,Retail BNPL`),
    )
    expect(invalid[0].reason).toMatch(/instalments/i)
  })

  it('imports a recurring BNPL row', () => {
    const { valid } = mapCsvToCommitments(
      parseCsv(
        'name,type,cost,frequency,date,category,instalments,mode\nLine,bnpl,25,monthly,2026-10-01,Retail BNPL,4,recurring',
      ),
    )
    expect(valid[0]).toMatchObject({ bnplMode: 'recurring', instalmentsRemaining: 4 })
  })

  it('surfaces unrecognised headers without failing the import', () => {
    const { valid, unknownHeaders } = mapCsvToCommitments(
      parseCsv(`${header},vendor notes\nThing,subscription,10,monthly,2026-10-01,Other,ignore me`),
    )
    expect(unknownHeaders).toEqual(['vendor notes'])
    expect(valid).toHaveLength(1)
  })

  it('ignores blank rows rather than reporting them as errors', () => {
    const { valid, invalid } = mapCsvToCommitments(
      parseCsv(`${header}\nThing,subscription,10,monthly,2026-10-01,Other\n,,,,,`),
    )
    expect(valid).toHaveLength(1)
    expect(invalid).toHaveLength(0)
  })

  it('returns empty results for no rows', () => {
    expect(mapCsvToCommitments([])).toEqual({ valid: [], invalid: [], headers: [], unknownHeaders: [] })
  })
})
