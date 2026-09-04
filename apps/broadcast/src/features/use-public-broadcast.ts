import { fetchBroadcastById, fetchPublicBroadcast } from "@/data/fetch-public-broadcast"
import { supabase } from "@moc/data/supabase"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { useCallback, useEffect, useRef, useState } from "react"

const DEBOUNCE_MS = 500
const FALLBACK_REFRESH_MS = 60_000

export function usePublicBroadcast(slug: string | undefined) {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [broadcastId, setBroadcastId] = useState<string | null>(null)
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const broadcastIdRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshGenerationRef = useRef(0)

  async function refreshBroadcast(requestedId: string, generation: number) {
    try {
      const next = await fetchBroadcastById(requestedId)
      if (broadcastIdRef.current !== requestedId || refreshGenerationRef.current !== generation) {
        return
      }

      setBroadcast(next)
    } catch {
      // background refresh failure is non-destructive
    }
  }

  const scheduleRefetch = useCallback(() => {
    const requestedId = broadcastIdRef.current
    const generation = refreshGenerationRef.current
    if (!requestedId) {
      return
    }

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      debounceTimerRef.current = null
      await refreshBroadcast(requestedId, generation)
    }, DEBOUNCE_MS)
  }, [])

  // Initial fetch by slug
  useEffect(() => {
    if (!slug) {
      setBroadcast(null)
      setBroadcastId(null)
      setLoadedSlug(null)
      broadcastIdRef.current = null
      setIsLoading(false)
      return
    }

    const broadcastSlug = slug
    let cancelled = false
    const generation = refreshGenerationRef.current + 1
    refreshGenerationRef.current = generation

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const next = await fetchPublicBroadcast(broadcastSlug)

        if (cancelled || refreshGenerationRef.current !== generation) {
          return
        }

        setBroadcast(next)
        setBroadcastId(next?.id ?? null)
        setLoadedSlug(broadcastSlug)
        broadcastIdRef.current = next?.id ?? null
      } catch (err) {
        if (!cancelled && refreshGenerationRef.current === generation) {
          setBroadcast(null)
          setLoadedSlug(broadcastSlug)
          setError(err instanceof Error ? err.message : "The broadcast could not be loaded.")
        }
      } finally {
        if (!cancelled && refreshGenerationRef.current === generation) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      refreshGenerationRef.current += 1
      setBroadcastId(null)
      broadcastIdRef.current = null
    }
  }, [slug])

  // Subscribe to realtime changes on broadcasts and broadcast_items
  useEffect(() => {
    if (!broadcastId) return

    const channel = supabase
      .channel(`public-broadcast:${broadcastId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts", filter: `id=eq.${broadcastId}` },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_items", filter: `broadcast_id=eq.${broadcastId}` },
        scheduleRefetch,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [broadcastId, scheduleRefetch])

  // Periodic fallback refresh
  useEffect(() => {
    if (!broadcastId) return
    const requestedId = broadcastId
    const generation = refreshGenerationRef.current

    const interval = setInterval(async () => {
      await refreshBroadcast(requestedId, generation)
    }, FALLBACK_REFRESH_MS)

    return () => {
      clearInterval(interval)
    }
  }, [broadcastId])

  // Refresh when the tab becomes visible
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        scheduleRefetch()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [scheduleRefetch])

  const normalizedSlug = slug ?? null
  const hasCurrentResult = loadedSlug === normalizedSlug

  return {
    broadcast: hasCurrentResult ? broadcast : null,
    isLoading: isLoading || !hasCurrentResult,
    error: hasCurrentResult ? error : null,
  }
}
