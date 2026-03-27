import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockRequests } from '@/lib/mock-requests'
import type { CultureRequest } from '@/types'

function fetchRequests(filters?: Record<string, string>): Promise<CultureRequest[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results = [...mockRequests]
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value) {
            results = results.filter((r) => String(r[key as keyof CultureRequest]) === value)
          }
        }
      }
      resolve(results)
    }, 0)
  })
}

export function useRequests(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.requests.list(filters),
    queryFn: () => fetchRequests(filters),
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<CultureRequest, 'id' | 'created_at' | 'updated_at'>): Promise<CultureRequest> => {
      const now = new Date().toISOString()
      const newRequest: CultureRequest = {
        ...data,
        id: `req-${Date.now()}`,
        created_at: now,
        updated_at: now,
      }
      mockRequests.push(newRequest)
      return Promise.resolve(newRequest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CultureRequest['status'] }): Promise<void> => {
      const req = mockRequests.find((r) => r.id === id)
      if (req) {
        req.status = status
        req.updated_at = new Date().toISOString()
      }
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}
