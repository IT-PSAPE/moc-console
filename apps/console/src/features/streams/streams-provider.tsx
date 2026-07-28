import { fetchStreams, fetchYouTubeConnection } from "@/data/fetch-streams"
import { fetchZoomConnection, fetchZoomMeetings } from "@/data/fetch-zoom"
import type { Stream } from "@moc/types/streams/stream"
import type { YouTubeConnection } from "@moc/types/streams/stream"
import type { ZoomConnection, ZoomMeeting } from "@moc/types/streams/zoom"
import { useWorkspace } from "@/lib/workspace-context"
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

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
  }
  actions: {
    loadStreams: () => Promise<void>
    loadYouTubeConnection: () => Promise<void>
    loadZoomConnection: () => Promise<void>
    loadZoomMeetings: () => Promise<void>
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

export function StreamsProvider({ children }: { children: ReactNode }) {
  const [streams, setStreams] = useState<Stream[]>([])
  const [youtubeConnection, setYouTubeConnection] = useState<YouTubeConnection | null>(null)
  const [zoomConnection, setZoomConnectionState] = useState<ZoomConnection | null>(null)
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([])
  const [isLoadingStreams, setIsLoadingStreams] = useState(false)
  const [isLoadingConnection, setIsLoadingConnection] = useState(false)
  const [isLoadingZoomConnection, setIsLoadingZoomConnection] = useState(false)
  const [isLoadingZoomMeetings, setIsLoadingZoomMeetings] = useState(false)

  const streamsLoadedRef = useRef<string | null>(null)
  const streamsPromiseRef = useRef<Promise<void> | null>(null)
  const connectionLoadedRef = useRef<string | null>(null)
  const connectionPromiseRef = useRef<Promise<void> | null>(null)
  const zoomConnectionLoadedRef = useRef<string | null>(null)
  const zoomConnectionPromiseRef = useRef<Promise<void> | null>(null)
  const zoomMeetingsLoadedRef = useRef<string | null>(null)
  const zoomMeetingsPromiseRef = useRef<Promise<void> | null>(null)

  const { currentWorkspaceId } = useWorkspace()
  const [trackedWorkspaceId, setTrackedWorkspaceId] = useState(currentWorkspaceId)
  if (trackedWorkspaceId !== currentWorkspaceId) {
    setTrackedWorkspaceId(currentWorkspaceId)
    setStreams([])
    setYouTubeConnection(null)
    setZoomConnectionState(null)
    setZoomMeetings([])
  }

  // ─── YouTube actions ───────────────────────────────────

  const handleSetYouTubeConnection = useCallback((conn: YouTubeConnection | null) => {
    setYouTubeConnection(conn)
    if (!conn) {
      connectionLoadedRef.current = null
    }
  }, [])

  const syncStream = useCallback((updated: Stream) => {
    setStreams((prev) => {
      const exists = prev.some((s) => s.id === updated.id)
      if (exists) return prev.map((s) => (s.id === updated.id ? updated : s))
      return [updated, ...prev]
    })
  }, [])

  const removeStream = useCallback((id: string) => {
    setStreams((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // ─── Zoom actions ──────────────────────────────────────

  const handleSetZoomConnection = useCallback((conn: ZoomConnection | null) => {
    setZoomConnectionState(conn)
    if (!conn) {
      zoomConnectionLoadedRef.current = null
    }
  }, [])

  const syncMeeting = useCallback((updated: ZoomMeeting) => {
    setZoomMeetings((prev) => {
      const exists = prev.some((m) => m.id === updated.id)
      if (exists) return prev.map((m) => (m.id === updated.id ? updated : m))
      return [updated, ...prev]
    })
  }, [])

  const removeMeeting = useCallback((id: string) => {
    setZoomMeetings((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ─── Loaders ───────────────────────────────────────────

  const loadStreams = useCallback(async () => {
    if (streamsLoadedRef.current === currentWorkspaceId) return
    if (streamsPromiseRef.current) return streamsPromiseRef.current

    setIsLoadingStreams(true)
    streamsPromiseRef.current = fetchStreams()
      .then((data) => { setStreams(data); streamsLoadedRef.current = currentWorkspaceId })
      .finally(() => { streamsPromiseRef.current = null; setIsLoadingStreams(false) })

    return streamsPromiseRef.current
  }, [currentWorkspaceId])

  const loadYouTubeConnection = useCallback(async () => {
    if (connectionLoadedRef.current === currentWorkspaceId) return
    if (connectionPromiseRef.current) return connectionPromiseRef.current

    setIsLoadingConnection(true)
    connectionPromiseRef.current = fetchYouTubeConnection()
      .then((data) => { setYouTubeConnection(data); connectionLoadedRef.current = currentWorkspaceId })
      .finally(() => { connectionPromiseRef.current = null; setIsLoadingConnection(false) })

    return connectionPromiseRef.current
  }, [currentWorkspaceId])

  const loadZoomConnection = useCallback(async () => {
    if (zoomConnectionLoadedRef.current === currentWorkspaceId) return
    if (zoomConnectionPromiseRef.current) return zoomConnectionPromiseRef.current

    setIsLoadingZoomConnection(true)
    zoomConnectionPromiseRef.current = fetchZoomConnection()
      .then((data) => { setZoomConnectionState(data); zoomConnectionLoadedRef.current = currentWorkspaceId })
      .finally(() => { zoomConnectionPromiseRef.current = null; setIsLoadingZoomConnection(false) })

    return zoomConnectionPromiseRef.current
  }, [currentWorkspaceId])

  const loadZoomMeetings = useCallback(async () => {
    if (zoomMeetingsLoadedRef.current === currentWorkspaceId) return
    if (zoomMeetingsPromiseRef.current) return zoomMeetingsPromiseRef.current

    setIsLoadingZoomMeetings(true)
    zoomMeetingsPromiseRef.current = fetchZoomMeetings()
      .then((data) => { setZoomMeetings(data); zoomMeetingsLoadedRef.current = currentWorkspaceId })
      .finally(() => { zoomMeetingsPromiseRef.current = null; setIsLoadingZoomMeetings(false) })

    return zoomMeetingsPromiseRef.current
  }, [currentWorkspaceId])

  // ─── Context value ─────────────────────────────────────

  const value = useMemo(
    () => ({
      state: {
        streams, youtubeConnection,
        zoomConnection, zoomMeetings,
        isLoadingStreams, isLoadingConnection,
        isLoadingZoomConnection, isLoadingZoomMeetings,
      },
      actions: {
        loadStreams, loadYouTubeConnection,
        loadZoomConnection, loadZoomMeetings,
        syncStream, removeStream, setStreams,
        setYouTubeConnection: handleSetYouTubeConnection,
        syncMeeting, removeMeeting, setZoomMeetings,
        setZoomConnection: handleSetZoomConnection,
      },
    }),
    [
      streams, youtubeConnection,
      zoomConnection, zoomMeetings,
      isLoadingStreams, isLoadingConnection,
      isLoadingZoomConnection, isLoadingZoomMeetings,
      loadStreams, loadYouTubeConnection,
      loadZoomConnection, loadZoomMeetings,
      syncStream, removeStream,
      handleSetYouTubeConnection, handleSetZoomConnection,
      syncMeeting, removeMeeting,
    ],
  )

  return <StreamsContext.Provider value={value}>{children}</StreamsContext.Provider>
}

export function useStreams() {
  const context = useContext(StreamsContext)

  if (!context) {
    throw new Error("useStreams must be used within a StreamsProvider")
  }

  return context
}
