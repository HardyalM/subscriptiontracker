import { QueryClient } from '@tanstack/react-query'

/**
 * One client for the app. The defaults are tuned for a single-user dataset
 * of a few dozen rows that only this person changes:
 *
 * - a 30s staleTime, because nobody else is editing behind your back, so
 *   refetching on every window focus is noise
 * - one retry, so a dropped connection recovers quietly but a genuine RLS
 *   or constraint rejection surfaces immediately instead of after four
 *   identical failures
 *
 * Mutations are not retried at all: an insert that failed a CHECK will fail
 * again, and an insert that timed out mid-flight might have succeeded.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
