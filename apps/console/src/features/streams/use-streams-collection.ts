import { useCallback, useEffect, useMemo, useState } from "react"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"
import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { useQueryText } from "@/hooks/use-query-text"
import { useViewQuery } from "@/hooks/use-view-query"
import { createStreamCalendarEvents, createStreamListEntries } from "./stream-list-entry"
import { useStreamListDetail } from "./stream-list-detail"
import { useYouTubeStreams } from "./use-youtube-streams"
import { useZoomMeetings } from "./use-zoom-meetings"

const streamViews = ["list", "calendar"] as const

export function useStreamsCollection() {
  const [searchQuery, setSearchQuery] = useQueryText()
  const [activeView, setActiveView] = useViewQuery(streamViews, "list")
  const [createOpen, setCreateOpen] = useState(false)
  const isMobile = useIsMobile()
  const detail = useStreamListDetail()
  const youtube = useYouTubeStreams(searchQuery)
  const zoom = useZoomMeetings(searchQuery)
  const listEntries = useMemo(
    () => createStreamListEntries(youtube.meta.filters.filtered, zoom.meta.filters.filtered),
    [youtube.meta.filters.filtered, zoom.meta.filters.filtered],
  )
  const calendarEntries = useMemo(
    () => createStreamListEntries(youtube.meta.filters.calendarFiltered, zoom.meta.filters.calendarFiltered),
    [youtube.meta.filters.calendarFiltered, zoom.meta.filters.calendarFiltered],
  )
  const calendarEvents = useMemo(() => createStreamCalendarEvents(calendarEntries), [calendarEntries])

  const youtubeAvailable = youtube.meta.isConnected && youtube.meta.canCreate
  const zoomAvailable = zoom.meta.isConnected && zoom.meta.canCreate
  const isConnected = youtube.meta.isConnected || zoom.meta.isConnected
  const isLoading = youtube.meta.isLoading || zoom.meta.isLoading
  const hasActiveFilters = youtube.meta.filters.hasActiveFilters || zoom.meta.filters.hasActiveFilters
  const syncYouTube = youtube.actions.sync
  const syncZoom = zoom.actions.sync
  const closeDetail = detail.actions.close
  const openStreamDetail = detail.actions.selectStream
  const openMeetingDetail = detail.actions.selectMeeting

  useEffect(() => {
    closeDetail()
  }, [activeView, closeDetail])

  const openCreate = useCallback(() => setCreateOpen(true), [])
  const syncConnected = useCallback(async () => {
    const tasks: Promise<void>[] = []
    if (youtube.meta.isConnected) tasks.push(syncYouTube())
    if (zoom.meta.isConnected) tasks.push(syncZoom())
    await Promise.all(tasks)
  }, [syncYouTube, syncZoom, youtube.meta.isConnected, zoom.meta.isConnected])

  const selectStream = useCallback((stream: Stream) => {
    openStreamDetail(stream, youtube.actions.edit, youtube.actions.remove)
  }, [openStreamDetail, youtube.actions.edit, youtube.actions.remove])

  const selectMeeting = useCallback((meeting: ZoomMeeting) => {
    openMeetingDetail(meeting, zoom.actions.edit, zoom.actions.remove)
  }, [openMeetingDetail, zoom.actions.edit, zoom.actions.remove])

  function changeView(value: string) {
    setActiveView(value)
  }

  return {
    state: { searchQuery, createOpen, activeView },
    actions: { setSearchQuery, setCreateOpen, openCreate, syncConnected, changeView, selectStream, selectMeeting },
    meta: {
      listEntries,
      calendarEvents,
      youtube,
      zoom,
      isMobile,
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
