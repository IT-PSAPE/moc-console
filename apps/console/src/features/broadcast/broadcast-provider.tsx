import { fetchMedia, fetchPlaylists } from "@moc/data/fetch-broadcast"
import { fetchStreams, fetchYouTubeConnection } from "@moc/data/fetch-streams"
import { fetchZoomConnection, fetchZoomMeetings } from "@moc/data/fetch-zoom"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import type { Playlist } from "@moc/types/broadcast/broadcast"
import type { Stream } from "@moc/types/broadcast/stream"
import type { YouTubeConnection } from "@moc/types/broadcast/stream"
import type { ZoomConnection, ZoomMeeting } from "@moc/types/broadcast/zoom"
import { useWorkspace } from "@/lib/workspace-context"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

type BroadcastContextValue = {
  state: {
    media: MediaItem[]
    playlists: Playlist[]
    streams: Stream[]
    youtubeConnection: YouTubeConnection | null
    zoomConnection: ZoomConnection | null
    zoomMeetings: ZoomMeeting[]
    isLoadingMedia: boolean
    isLoadingPlaylists: boolean
    isLoadingStreams: boolean
    isLoadingConnection: boolean
    isLoadingZoomConnection: boolean
    isLoadingZoomMeetings: boolean
  }
  actions: {
    loadMedia: () => Promise<void>
    loadPlaylists: () => Promise<void>
    loadStreams: () => Promise<void>
    loadYouTubeConnection: () => Promise<void>
    loadZoomConnection: () => Promise<void>
    loadZoomMeetings: () => Promise<void>
    syncPlaylist: (playlist: Playlist) => void
    removePlaylist: (id: string) => void
    syncMediaItem: (item: MediaItem) => void
    removeMediaItem: (id: string) => void
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

const BroadcastContext = createContext<BroadcastContextValue | null>(null)

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [youtubeConnection, setYouTubeConnection] = useState<YouTubeConnection | null>(null)
  const [zoomConnection, setZoomConnectionState] = useState<ZoomConnection | null>(null)
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [isLoadingStreams, setIsLoadingStreams] = useState(false)
  const [isLoadingConnection, setIsLoadingConnection] = useState(false)
  const [isLoadingZoomConnection, setIsLoadingZoomConnection] = useState(false)
  const [isLoadingZoomMeetings, setIsLoadingZoomMeetings] = useState(false)

  const mediaLoadedRef = useRef(false)
  const mediaPromiseRef = useRef<Promise<void> | null>(null)
  const playlistsLoadedRef = useRef(false)
  const playlistsPromiseRef = useRef<Promise<void> | null>(null)
  const streamsLoadedRef = useRef(false)
  const streamsPromiseRef = useRef<Promise<void> | null>(null)
  const connectionLoadedRef = useRef(false)
  const connectionPromiseRef = useRef<Promise<void> | null>(null)
  const zoomConnectionLoadedRef = useRef(false)
  const zoomConnectionPromiseRef = useRef<Promise<void> | null>(null)
  const zoomMeetingsLoadedRef = useRef(false)
  const zoomMeetingsPromiseRef = useRef<Promise<void> | null>(null)

  const { currentWorkspaceId } = useWorkspace()
  useEffect(() => {
    mediaLoadedRef.current = false
    playlistsLoadedRef.current = false
    streamsLoadedRef.current = false
    connectionLoadedRef.current = false
    zoomConnectionLoadedRef.current = false
    zoomMeetingsLoadedRef.current = false
    setMedia([])
    setPlaylists([])
    setStreams([])
    setYouTubeConnection(null)
    setZoomConnectionState(null)
    setZoomMeetings([])
  }, [currentWorkspaceId])

  // ─── Playlist actions ──────────────────────────────────

  const syncPlaylist = useCallback((updated: Playlist) => {
    setPlaylists((prev) => {
      const exists = prev.some((p) => p.id === updated.id)
      if (exists) return prev.map((p) => (p.id === updated.id ? updated : p))
      return [updated, ...prev]
    })
  }, [])

  const removePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // ─── Media actions ─────────────────────────────────────

  const syncMediaItem = useCallback((updated: MediaItem) => {
    setMedia((prev) => {
      const exists = prev.some((m) => m.id === updated.id)
      if (exists) return prev.map((m) => (m.id === updated.id ? updated : m))
      return [updated, ...prev]
    })
  }, [])

  const removeMediaItem = useCallback((id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ─── YouTube actions ───────────────────────────────────

  const handleSetYouTubeConnection = useCallback((conn: YouTubeConnection | null) => {
    setYouTubeConnection(conn)
    if (!conn) {
      connectionLoadedRef.current = false
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
      zoomConnectionLoadedRef.current = false
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

  const loadMedia = useCallback(async () => {
    if (mediaLoadedRef.current) return
    if (mediaPromiseRef.current) return mediaPromiseRef.current

    setIsLoadingMedia(true)
    mediaPromiseRef.current = fetchMedia()
      .then((data) => { setMedia(data); mediaLoadedRef.current = true })
      .finally(() => { mediaPromiseRef.current = null; setIsLoadingMedia(false) })

    return mediaPromiseRef.current
  }, [])

  const loadPlaylists = useCallback(async () => {
    if (playlistsLoadedRef.current) return
    if (playlistsPromiseRef.current) return playlistsPromiseRef.current

    setIsLoadingPlaylists(true)
    playlistsPromiseRef.current = fetchPlaylists()
      .then((data) => { setPlaylists(data); playlistsLoadedRef.current = true })
      .finally(() => { playlistsPromiseRef.current = null; setIsLoadingPlaylists(false) })

    return playlistsPromiseRef.current
  }, [])

  const loadStreams = useCallback(async () => {
    if (streamsLoadedRef.current) return
    if (streamsPromiseRef.current) return streamsPromiseRef.current

    setIsLoadingStreams(true)
    streamsPromiseRef.current = fetchStreams()
      .then((data) => { setStreams(data); streamsLoadedRef.current = true })
      .finally(() => { streamsPromiseRef.current = null; setIsLoadingStreams(false) })

    return streamsPromiseRef.current
  }, [])

  const loadYouTubeConnection = useCallback(async () => {
    if (connectionLoadedRef.current) return
    if (connectionPromiseRef.current) return connectionPromiseRef.current

    setIsLoadingConnection(true)
    connectionPromiseRef.current = fetchYouTubeConnection()
      .then((data) => { setYouTubeConnection(data); connectionLoadedRef.current = true })
      .finally(() => { connectionPromiseRef.current = null; setIsLoadingConnection(false) })

    return connectionPromiseRef.current
  }, [])

  const loadZoomConnection = useCallback(async () => {
    if (zoomConnectionLoadedRef.current) return
    if (zoomConnectionPromiseRef.current) return zoomConnectionPromiseRef.current

    setIsLoadingZoomConnection(true)
    zoomConnectionPromiseRef.current = fetchZoomConnection()
      .then((data) => { setZoomConnectionState(data); zoomConnectionLoadedRef.current = true })
      .finally(() => { zoomConnectionPromiseRef.current = null; setIsLoadingZoomConnection(false) })

    return zoomConnectionPromiseRef.current
  }, [])

  const loadZoomMeetings = useCallback(async () => {
    if (zoomMeetingsLoadedRef.current) return
    if (zoomMeetingsPromiseRef.current) return zoomMeetingsPromiseRef.current

    setIsLoadingZoomMeetings(true)
    zoomMeetingsPromiseRef.current = fetchZoomMeetings()
      .then((data) => { setZoomMeetings(data); zoomMeetingsLoadedRef.current = true })
      .finally(() => { zoomMeetingsPromiseRef.current = null; setIsLoadingZoomMeetings(false) })

    return zoomMeetingsPromiseRef.current
  }, [])

  // ─── Context value ─────────────────────────────────────

  const value = useMemo(
    () => ({
      state: {
        media, playlists, streams, youtubeConnection,
        zoomConnection, zoomMeetings,
        isLoadingMedia, isLoadingPlaylists, isLoadingStreams, isLoadingConnection,
        isLoadingZoomConnection, isLoadingZoomMeetings,
      },
      actions: {
        loadMedia, loadPlaylists, loadStreams, loadYouTubeConnection,
        loadZoomConnection, loadZoomMeetings,
        syncPlaylist, removePlaylist, syncMediaItem, removeMediaItem,
        syncStream, removeStream, setStreams,
        setYouTubeConnection: handleSetYouTubeConnection,
        syncMeeting, removeMeeting, setZoomMeetings,
        setZoomConnection: handleSetZoomConnection,
      },
    }),
    [
      media, playlists, streams, youtubeConnection,
      zoomConnection, zoomMeetings,
      isLoadingMedia, isLoadingPlaylists, isLoadingStreams, isLoadingConnection,
      isLoadingZoomConnection, isLoadingZoomMeetings,
      loadMedia, loadPlaylists, loadStreams, loadYouTubeConnection,
      loadZoomConnection, loadZoomMeetings,
      syncPlaylist, removePlaylist, syncMediaItem, removeMediaItem,
      syncStream, removeStream,
      handleSetYouTubeConnection, handleSetZoomConnection,
      syncMeeting, removeMeeting,
    ],
  )

  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>
}

export function useBroadcast() {
  const context = useContext(BroadcastContext)

  if (!context) {
    throw new Error("useBroadcast must be used within a BroadcastProvider")
  }

  return context
}
