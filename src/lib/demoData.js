// Realistic example data, generated relative to "today" so it always looks
// current no matter when it's loaded — including a mix of urgent, overdue,
// and comfortably-far-out items so the renewal checkpoint actually has
// something to show. Generic service descriptions rather than real brand
// names, since this ships inside the app itself rather than as a form
// placeholder.

import { addDays } from './calculations.js'
import { newId } from './storage.js'

/**
 * Builds a fresh set of demo commitments. Every call gets new ids and dates
 * relative to `today`, so "Load example data" is safe to use repeatedly
 * without accumulating stale entries — callers should replace, not append.
 */
export function buildDemoCommitments(today = new Date()) {
  const empty = () => ({ decisionLog: [], status: 'active' })

  return [
    {
      ...empty(),
      id: newId(),
      name: 'Video streaming',
      type: 'subscription',
      costPerPayment: 15.99,
      frequency: 'monthly',
      nextPaymentDate: addDays(today, 3),
      totalOriginalAmount: null,
      instalmentsRemaining: null,
      category: 'Streaming',
    },
    {
      ...empty(),
      id: newId(),
      name: 'Music streaming',
      type: 'subscription',
      costPerPayment: 10.99,
      frequency: 'monthly',
      nextPaymentDate: addDays(today, 20),
      totalOriginalAmount: null,
      instalmentsRemaining: null,
      category: 'Streaming',
    },
    {
      ...empty(),
      id: newId(),
      name: 'Cloud storage',
      type: 'subscription',
      costPerPayment: 2.99,
      frequency: 'monthly',
      nextPaymentDate: addDays(today, 12),
      totalOriginalAmount: null,
      instalmentsRemaining: null,
      category: 'Other subscriptions',
    },
    {
      ...empty(),
      id: newId(),
      name: 'Fitness app',
      type: 'subscription',
      costPerPayment: 4.5,
      frequency: 'weekly',
      nextPaymentDate: addDays(today, -2), // overdue — shows the "N days overdue" state
      totalOriginalAmount: null,
      instalmentsRemaining: null,
      category: 'Other subscriptions',
    },
    {
      ...empty(),
      id: newId(),
      name: 'Trainers (instalments)',
      type: 'bnpl',
      costPerPayment: 22.5,
      frequency: 'monthly',
      nextPaymentDate: addDays(today, 5),
      totalOriginalAmount: 90,
      instalmentsRemaining: 2,
      category: 'Retail BNPL',
    },
    {
      ...empty(),
      id: newId(),
      name: 'Headphones (instalments)',
      type: 'bnpl',
      costPerPayment: 15,
      frequency: 'monthly',
      nextPaymentDate: addDays(today, 1),
      totalOriginalAmount: 60,
      instalmentsRemaining: 1,
      category: 'Retail BNPL',
    },
  ]
}
