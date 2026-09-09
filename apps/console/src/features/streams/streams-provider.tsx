import { fetchStreams, fetchYouTubeConnection } from "@/data/fetch-streams"
import { fetchZoomConnection, fetchZoomMeetings } from "@/data/fetch-zoom"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"
import { useWorkspace } from "@/lib/workspace-context"
import type { Stream, YouTubeConnection } from "@moc/types/streams/stream"
import type { ZoomConnection, ZoomMeeting } from "@moc/types/streams/zoom"
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"

type StreamsContextValue = {
  state: {
    streams: Stream[]
    youtubeConnection: YouTubeConnection | null
    zoomConnection: ZoomConnection | null
    zoomMeetings: ZoomMeeting[]
    isLoadingStreams: boolean
    isLoadingConnection: boolean
    isLoadingZoomConnection: boolean
    isLoadingZoomMeetings: boolean
    streamsError: Error | null
    youtubeConnectionError: Error | null
    zoomConnectionError: Error | null
    zoomMeetingsError: Error | null
  }
  actions: {
    loadStreams: () => Promise<void>
    retryStreams: () => Promise<void>
    loadYouTubeConnection: () => Promise<void>
    retryYouTubeConnection: () => Promise<void>
    loadZoomConnection: () => Promise<void>
    retryZoomConnection: () => Promise<void>
    loadZoomMeetings: () => Promise<void>
    retryZoomMeetings: () => Promise<void>
    syncStream: (stream: Stream) => void
    removeStream: (id: string) => void
    setStreams: (streams: Stream[]) => void
    setYouTubeConnection: (conn: YouTubeConnection | null) => void
    syncMeeting: (meeting: ZoomMeeting) => void
    removeMeeting: (id: string) => void
    setZoomMeetings: (meetings: ZoomMeeting[]) => void
    setZoomConnection: (conn: ZoomConnection | null) => void
  }
}

const StreamsContext = createContext<StreamsContextValue | null>(null)
const emptyStreams: Stream[] = []
const emptyMeetings: ZoomMeeting[] = []

export function StreamsProvider({ children }: { children: ReactNode }) {
  const { currentWorkspaceId } = useWorkspace()
  const { data: streams, error: streamsError, isLoading: isLoadingStreams, load: loadStreamsResource, setData: setStreams, updateData: updateStreams } = useWorkspaceResource({ emptyValue: emptyStreams, fetcher: fetchStreams, resource: "streams", workspaceId: currentWorkspaceId })
  const { data: youtubeConnection, error: youtubeConnectionError, isLoading: isLoadingConnection, load: loadYouTubeConnectionResource, setData: setYouTubeConnection } = useWorkspaceResource({ emptyValue: null, fetcher: fetchYouTubeConnection, resource: "youtube-connection", workspaceId: currentWorkspaceId })
  const { data: zoomConnection, error: zoomConnectionError, isLoading: isLoadingZoomConnection, load: loadZoomConnectionResource, setData: setZoomConnection } = useWorkspaceResource({ emptyValue: null, fetcher: fetchZoomConnection, resource: "zoom-connection", workspaceId: currentWorkspaceId })
  const { data: zoomMeetings, error: zoomMeetingsError, isLoading: isLoadingZoomMeetings, load: loadZoomMeetingsResource, setData: setZoomMeetings, updateData: updateZoomMeetings } = useWorkspaceResource({ emptyValue: emptyMeetings, fetcher: fetchZoomMeetings, resource: "zoom-meetings", workspaceId: currentWorkspaceId })

  const syncStream = useCallback((updated: Stream) => {
    updateStreams((current) => {
      const exists = current.some((stream) => stream.id === updated.id)
      if (exists) return current.map((stream) => stream.id === updated.id ? updated : stream)
      return [updated, ...current]
    })
  }, [updateStreams])

  const removeStream = useCallback((id: string) => {
    updateStreams((current) => current.filter((stream) => stream.id !== id))
  }, [updateStreams])

  const syncMeeting = useCallback((updated: ZoomMeeting) => {
    updateZoomMeetings((current) => {
      const exists = current.some((meeting) => meeting.id === updated.id)
      if (exists) return current.map((meeting) => meeting.id === updated.id ? updated : meeting)
      return [updated, ...current]
    })
  }, [updateZoomMeetings])

  const removeMeeting = useCallback((id: string) => {
    updateZoomMeetings((current) => current.filter((meeting) => meeting.id !== id))
  }, [updateZoomMeetings])

  const loadStreams = useCallback(async () => {
    await loadStreamsResource()
  }, [loadStreamsResource])

  const retryStreams = useCallback(async () => {
    await loadStreamsResource(true)
  }, [loadStreamsResource])

  const loadYouTubeConnection = useCallback(async () => {
    await loadYouTubeConnectionResource()
  }, [loadYouTubeConnectionResource])

  const retryYouTubeConnection = useCallback(async () => {
    await loadYouTubeConnectionResource(true)
  }, [loadYouTubeConnectionResource])

  const loadZoomConnection = useCallback(async () => {
    await loadZoomConnectionResource()
  }, [loadZoomConnectionResource])

  const retryZoomConnection = useCallback(async () => {
    await loadZoomConnectionResource(true)
  }, [loadZoomConnectionResource])

  const loadZoomMeetings = useCallback(async () => {
    await loadZoomMeetingsResource()
  }, [loadZoomMeetingsResource])

  const retryZoomMeetings = useCallback(async () => {
    await loadZoomMeetingsResource(true)
  }, [loadZoomMeetingsResource])

  const value = useMemo<StreamsContextValue>(() => ({
    state: {
      streams,
      youtubeConnection,
      zoomConnection,
      zoomMeetings,
      isLoadingStreams,
      isLoadingConnection,
      isLoadingZoomConnection,
      isLoadingZoomMeetings,
      streamsError,
      youtubeConnectionError,
      zoomConnectionError,
      zoomMeetingsError,
    },
    actions: {
      loadStreams,
      retryStreams,
      loadYouTubeConnection,
      retryYouTubeConnection,
      loadZoomConnection,
      retryZoomConnection,
      loadZoomMeetings,
      retryZoomMeetings,
      syncStream,
      removeStream,
      setStreams,
      setYouTubeConnection,
      syncMeeting,
      removeMeeting,
      setZoomMeetings,
      setZoomConnection,
    },
  }), [isLoadingConnection, isLoadingStreams, isLoadingZoomConnection, isLoadingZoomMeetings, loadStreams, loadYouTubeConnection, loadZoomConnection, loadZoomMeetings, removeMeeting, removeStream, retryStreams, retryYouTubeConnection, retryZoomConnection, retryZoomMeetings, setStreams, setYouTubeConnection, setZoomConnection, setZoomMeetings, streams, streamsError, syncMeeting, syncStream, youtubeConnection, youtubeConnectionError, zoomConnection, zoomConnectionError, zoomMeetings, zoomMeetingsError])

  return <StreamsContext.Provider value={value}>{children}</StreamsContext.Provider>
}

export function useStreams() {
  const context = useContext(StreamsContext)

  if (!context) {
    throw new Error("useStreams must be used within a StreamsProvider")
  }

  return context
}
