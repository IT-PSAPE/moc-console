import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchBroadcastById, fetchPublicBroadcast } from "@/data/fetch-public-broadcast"
import { moc } from "@/lib/moc-client"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { useCallback, useEffect, useRef } from "react"

const DEBOUNCE_MS = 500
const FALLBACK_REFRESH_MS = 60_000
export const publicBroadcastQueryKey = (slug: string | undefined) => ["public-broadcast", slug ?? null] as const
export const publicBroadcastByIdQueryKey = (id: string) => ["public-broadcast-by-id", id] as const

export function usePublicBroadcast(slug: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: publicBroadcastQueryKey(slug),
    queryFn: () => fetchPublicBroadcast(slug as string),
    enabled: Boolean(slug),
    staleTime: FALLBACK_REFRESH_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const broadcast = slug ? query.data ?? null : null
  const broadcastIdRef = useRef<string | null>(broadcast?.id ?? null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshBroadcast = useCallback(async (requestedId: string) => {
    try {
      await queryClient.invalidateQueries({ queryKey: publicBroadcastByIdQueryKey(requestedId), exact: true })
      const next = await queryClient.fetchQuery<Broadcast | null>({
        queryKey: publicBroadcastByIdQueryKey(requestedId),
        queryFn: () => fetchBroadcastById(requestedId),
        staleTime: 0,
      })
      if (broadcastIdRef.current !== requestedId) return
      queryClient.setQueryData<Broadcast | null>(publicBroadcastQueryKey(slug), next)
    } catch {
      // Keep the last successful public broadcast visible during background errors.
    }
  }, [queryClient, slug])

  const scheduleRefetch = useCallback(() => {
    const requestedId = broadcastIdRef.current
    if (!requestedId) return
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void refreshBroadcast(requestedId)
    }, DEBOUNCE_MS)
  }, [refreshBroadcast])

  useEffect(() => {
    broadcastIdRef.current = broadcast?.id ?? null
  }, [broadcast?.id])

  useEffect(() => {
    const broadcastId = broadcast?.id
    if (!broadcastId) return
    return moc.broadcasts.subscribe(broadcastId, scheduleRefetch)
  }, [broadcast?.id, scheduleRefetch])

  useEffect(() => {
    const broadcastId = broadcast?.id
    if (!broadcastId) return
    const interval = setInterval(() => void refreshBroadcast(broadcastId), FALLBACK_REFRESH_MS)
    return () => clearInterval(interval)
  }, [broadcast?.id, refreshBroadcast])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") scheduleRefetch()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [scheduleRefetch])

  useEffect(() => () => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current)
  }, [])

  function retry() {
    return query.refetch()
  }

  return {
    broadcast,
    isLoading: Boolean(slug) && query.isPending,
    error: query.data === undefined && query.error instanceof Error ? query.error.message : null,
    retry,
  }
}
