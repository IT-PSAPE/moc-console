import { QueryClient } from '@tanstack/react-query'

// Browser-only, in-memory server state. Each app owns its own client instance.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 30 * 60_000,
        retry: false,
      },
      mutations: { retry: false },
    },
  })
}
