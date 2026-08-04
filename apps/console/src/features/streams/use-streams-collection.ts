import { useCallback, useMemo, useState } from "react"
import { createStreamListEntries } from "./stream-list-entry"
import { useYouTubeStreams } from "./use-youtube-streams"
import { useZoomMeetings } from "./use-zoom-meetings"
import { useQueryText } from "@/hooks/use-query-text"

export function useStreamsCollection() {
  const [searchQuery, setSearchQuery] = useQueryText()
  const [createOpen, setCreateOpen] = useState(false)
  const youtube = useYouTubeStreams(searchQuery)
  const zoom = useZoomMeetings(searchQuery)
  const entries = useMemo(
    () => createStreamListEntries(youtube.meta.filters.filtered, zoom.meta.filters.filtered),
    [youtube.meta.filters.filtered, zoom.meta.filters.filtered],
  )

  const youtubeAvailable = youtube.meta.isConnected && youtube.meta.canCreate
  const zoomAvailable = zoom.meta.isConnected && zoom.meta.canCreate
  const isConnected = youtube.meta.isConnected || zoom.meta.isConnected
  const isLoading = youtube.meta.isLoading || zoom.meta.isLoading
  const hasActiveFilters = youtube.meta.filters.hasActiveFilters || zoom.meta.filters.hasActiveFilters
  const syncYouTube = youtube.actions.sync
  const syncZoom = zoom.actions.sync

  const openCreate = useCallback(() => setCreateOpen(true), [])
  const syncConnected = useCallback(async () => {
    const tasks: Promise<void>[] = []
    if (youtube.meta.isConnected) tasks.push(syncYouTube())
    if (zoom.meta.isConnected) tasks.push(syncZoom())
    await Promise.all(tasks)
  }, [syncYouTube, syncZoom, youtube.meta.isConnected, zoom.meta.isConnected])

  return {
    state: { searchQuery, createOpen },
    actions: { setSearchQuery, setCreateOpen, openCreate, syncConnected },
    meta: {
      entries,
      youtube,
      zoom,
      youtubeAvailable,
      zoomAvailable,
      canCreate: youtubeAvailable || zoomAvailable,
      isConnected,
      isLoading,
      isSyncing: youtube.state.isSyncing || zoom.state.isSyncing,
      hasActiveFilters,
    },
  }
}
