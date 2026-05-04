'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

/**
 * TanStack Query for SWR-style caching, background refetch, and optimistic mutations.
 * Defaults tuned for hospital dashboards (short stale window, keep previous data on refetch).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            gcTime: 1_000 * 60 * 15,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
