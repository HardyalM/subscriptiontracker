import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('the Edge Function copy of merchantMatching', () => {
  it('is byte-identical to the source of truth', () => {
    // The webhook runs on Deno and cannot reach into src/lib, so it ships a
    // copy. This test is the only thing stopping the two drifting apart —
    // if it fails, re-copy rather than editing one side:
    //   cp src/lib/merchantMatching.js supabase/functions/_shared/
    const source = readFileSync('src/lib/merchantMatching.js', 'utf8')
    const copy = readFileSync('supabase/functions/_shared/merchantMatching.js', 'utf8')
    expect(copy).toBe(source)
  })
})

describe('the Edge Function copy of receiptSchema', () => {
  it('is byte-identical to the source of truth', () => {
    //   cp src/lib/receiptSchema.js supabase/functions/_shared/
    const source = readFileSync('src/lib/receiptSchema.js', 'utf8')
    const copy = readFileSync('supabase/functions/_shared/receiptSchema.js', 'utf8')
    expect(copy).toBe(source)
  })
})
