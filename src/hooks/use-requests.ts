import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockRequests } from '@/lib/mock-requests'
import { mockRequestMembers } from '@/lib/mock-request-members'
import type { CultureRequest, RequestAssignee, RequestNote } from '@/types'

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

function updateRequestRecord(id: string, recipe: (request: CultureRequest) => void) {
  const request = mockRequests.find((item) => item.id === id)
  if (!request) throw new Error(`Request ${id} not found`)
  recipe(request)
  request.updated_at = new Date().toISOString()
  return request
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
        notes: data.notes ?? [],
        assignees: data.assignees ?? [],
        venues: data.venues ?? [],
        equipment: data.equipment ?? [],
        media: data.media ?? [],
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

export function useUpdateRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<CultureRequest> }) => {
      updateRequestRecord(id, (request) => {
        Object.assign(request, changes)
      })
      return Promise.resolve()
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
      updateRequestRecord(id, (request) => {
        request.status = status
      })
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}

export function useAddRequestComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, author, body }: { id: string; author: string; body: string }) => {
      updateRequestRecord(id, (request) => {
        const note: RequestNote = {
          id: `note-${Date.now()}`,
          request_id: id,
          author,
          body,
          created_at: new Date().toISOString(),
        }
        request.notes = [...(request.notes ?? []), note]
      })
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}

export function useAssignRequestAssignee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, memberId }: { id: string; memberId: string }) => {
      const member = mockRequestMembers.find((item) => item.id === memberId)
      if (!member) throw new Error(`Member ${memberId} not found`)

      updateRequestRecord(id, (request) => {
        const existing = request.assignees ?? []
        if (existing.some((assignee) => assignee.member_id === memberId)) return
        const assignee: RequestAssignee = {
          id: `assign-${Date.now()}`,
          request_id: id,
          member_id: member.id,
          member_name: member.name,
        }
        request.assignees = [...existing, assignee]
      })

      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}

export function useUnassignRequestAssignee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, memberId }: { id: string; memberId: string }) => {
      updateRequestRecord(id, (request) => {
        request.assignees = (request.assignees ?? []).filter((assignee) => assignee.member_id !== memberId)
      })
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all })
    },
  })
}
