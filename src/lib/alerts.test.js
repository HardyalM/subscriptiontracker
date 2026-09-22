import { describe, it, expect } from 'vitest'
import { commitmentsDueWithin, buildAlertEmail, ALERT_WINDOW_DAYS } from './alerts.js'

const today = new Date('2026-09-22')
const row = (over) => ({
  name: 'Video streaming',
  status: 'active',
  cost_per_payment: 12.99,
  next_payment_date: '2026-09-23',
  ...over,
})

describe('commitmentsDueWithin', () => {
  it('includes something due today', () => {
    expect(commitmentsDueWithin([row({ next_payment_date: '2026-09-22' })], 2, today)).toHaveLength(1)
  })

  it('includes the last day of the window', () => {
    expect(commitmentsDueWithin([row({ next_payment_date: '2026-09-24' })], 2, today)).toHaveLength(1)
  })

  it('excludes the day after the window', () => {
    expect(commitmentsDueWithin([row({ next_payment_date: '2026-09-25' })], 2, today)).toHaveLength(0)
  })

  it('excludes overdue payments', () => {
    // The money has already moved; an email cannot help, and the app shows
    // overdue items when it is opened.
    expect(commitmentsDueWithin([row({ next_payment_date: '2026-09-20' })], 2, today)).toHaveLength(0)
  })

  it('excludes cancelled commitments', () => {
    expect(commitmentsDueWithin([row({ status: 'cancelled' })], 2, today)).toHaveLength(0)
  })

  it('sorts soonest first', () => {
    const list = [row({ name: 'B', next_payment_date: '2026-09-24' }), row({ name: 'A', next_payment_date: '2026-09-22' })]
    expect(commitmentsDueWithin(list, 2, today).map((c) => c.name)).toEqual(['A', 'B'])
  })
})

describe('buildAlertEmail', () => {
  it('returns null when nothing is due, so no empty email is ever sent', () => {
    expect(buildAlertEmail([])).toBeNull()
    expect(buildAlertEmail(null)).toBeNull()
  })

  it('names the commitment in the subject when there is only one', () => {
    const email = buildAlertEmail([row({ next_payment_date: '2026-09-22' })])
    expect(email.subject).toContain('Video streaming')
    expect(email.subject).toContain('£12.99')
  })

  it('counts them in the subject when there are several', () => {
    const email = buildAlertEmail([row(), row({ name: 'Music' })])
    expect(email.subject).toBe(`2 payments due in the next ${ALERT_WINDOW_DAYS} days`)
  })

  it('totals the amounts in the body', () => {
    const email = buildAlertEmail([row({ cost_per_payment: 10 }), row({ cost_per_payment: 5 })])
    expect(email.text).toContain('Total: £15')
  })

  it('includes a link back when one is given', () => {
    expect(buildAlertEmail([row()], { appUrl: 'https://example.test' }).text).toContain('https://example.test')
  })

  it('always says why the email arrived and how to stop it', () => {
    const email = buildAlertEmail([row()])
    expect(email.text).toMatch(/email alerts are switched on/i)
    expect(email.text).toMatch(/turn them off in settings/i)
  })

  it('does not tell the reader what to do about it', () => {
    // Same register as the renewal checkpoint: state the facts, let the
    // person decide. No urgency, no instruction.
    const email = buildAlertEmail([row()])
    expect(email.text).not.toMatch(/act now|don't miss|hurry|urgent|immediately/i)
  })
})
