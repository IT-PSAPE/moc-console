import { useCallback, useMemo, useState } from "react"
import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { useQueryText } from "@/hooks/use-query-text"
import { createStreamListEntries } from "./stream-list-entry"
import { useStreamListDetail } from "./stream-list-detail"
import { useYouTubeStreams } from "./use-youtube-streams"
import { useZoomMeetings } from "./use-zoom-meetings"

export function useStreamsCollection() {
  const [searchQuery, setSearchQuery] = useQueryText()
  const [createOpen, setCreateOpen] = useState(false)
  const detail = useStreamListDetail()
  const youtube = useYouTubeStreams(searchQuery)
  const zoom = useZoomMeetings(searchQuery)
  const listEntries = useMemo(
    () => createStreamListEntries(youtube.meta.filters.filtered, zoom.meta.filters.filtered),
    [youtube.meta.filters.filtered, zoom.meta.filters.filtered],
  )

  const youtubeAvailable = youtube.meta.isConnected && youtube.meta.canCreate
  const zoomAvailable = zoom.meta.isConnected && zoom.meta.canCreate
  const canSync = (youtube.meta.isConnected && youtube.meta.canSync)
    || (zoom.meta.isConnected && zoom.meta.canSync)
  const isConnected = youtube.meta.isConnected || zoom.meta.isConnected
  const hasActiveFilters = youtube.meta.filters.hasActiveFilters || zoom.meta.filters.hasActiveFilters
  const syncYouTube = youtube.actions.sync
  const syncZoom = zoom.actions.sync
  const openStreamDetail = detail.actions.selectStream
  const openMeetingDetail = detail.actions.selectMeeting

  const openCreate = useCallback(() => setCreateOpen(true), [])
  const syncConnected = useCallback(async () => {
    const tasks: Promise<void>[] = []
    if (youtube.meta.isConnected && youtube.meta.canSync) tasks.push(syncYouTube())
    if (zoom.meta.isConnected && zoom.meta.canSync) tasks.push(syncZoom())
    await Promise.all(tasks)
  }, [syncYouTube, syncZoom, youtube.meta.canSync, youtube.meta.isConnected, zoom.meta.canSync, zoom.meta.isConnected])

  const selectStream = useCallback((stream: Stream) => {
    openStreamDetail(stream, youtube.actions.edit, youtube.actions.remove)
  }, [openStreamDetail, youtube.actions.edit, youtube.actions.remove])

  const selectMeeting = useCallback((meeting: ZoomMeeting) => {
    openMeetingDetail(meeting, zoom.actions.edit, zoom.actions.remove)
  }, [openMeetingDetail, zoom.actions.edit, zoom.actions.remove])

  return {
    state: { searchQuery, createOpen },
    actions: { setSearchQuery, setCreateOpen, openCreate, syncConnected, selectStream, selectMeeting },
    meta: {
      listEntries,
      youtube,
      zoom,
      youtubeAvailable,
      zoomAvailable,
      canCreate: youtubeAvailable || zoomAvailable,
      canSync,
      isConnected,
      isInitialLoading: youtube.meta.isInitialLoading || zoom.meta.isInitialLoading,
      isSyncing: youtube.state.isSyncing || zoom.state.isSyncing,
      hasActiveFilters,
    },
  }
}
