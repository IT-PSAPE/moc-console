import { fetchMedia, fetchPlaylists } from "@/data/fetch-broadcast"
import type { MediaItem } from "@/types/broadcast/media-item"
import type { Playlist } from "@/types/broadcast/broadcast"
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

type BroadcastContextValue = {
  state: {
    media: MediaItem[]
    playlists: Playlist[]
    isLoadingMedia: boolean
    isLoadingPlaylists: boolean
  }
  actions: {
    loadMedia: () => Promise<void>
    loadPlaylists: () => Promise<void>
    syncPlaylist: (playlist: Playlist) => void
    removePlaylist: (id: string) => void
    syncMediaItem: (item: MediaItem) => void
    removeMediaItem: (id: string) => void
  }
}

const BroadcastContext = createContext<BroadcastContextValue | null>(null)

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)

  const mediaLoadedRef = useRef(false)
  const mediaPromiseRef = useRef<Promise<void> | null>(null)
  const playlistsLoadedRef = useRef(false)
  const playlistsPromiseRef = useRef<Promise<void> | null>(null)

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

  const loadMedia = useCallback(async () => {
    if (mediaLoadedRef.current) return
    if (mediaPromiseRef.current) return mediaPromiseRef.current

    setIsLoadingMedia(true)
    mediaPromiseRef.current = fetchMedia()
      .then((data) => {
        setMedia(data)
        mediaLoadedRef.current = true
      })
      .finally(() => {
        mediaPromiseRef.current = null
        setIsLoadingMedia(false)
      })

    return mediaPromiseRef.current
  }, [])

  const loadPlaylists = useCallback(async () => {
    if (playlistsLoadedRef.current) return
    if (playlistsPromiseRef.current) return playlistsPromiseRef.current

    setIsLoadingPlaylists(true)
    playlistsPromiseRef.current = fetchPlaylists()
      .then((data) => {
        setPlaylists(data)
        playlistsLoadedRef.current = true
      })
      .finally(() => {
        playlistsPromiseRef.current = null
        setIsLoadingPlaylists(false)
      })

    return playlistsPromiseRef.current
  }, [])

  const value = useMemo(
    () => ({
      state: { media, playlists, isLoadingMedia, isLoadingPlaylists },
      actions: { loadMedia, loadPlaylists, syncPlaylist, removePlaylist, syncMediaItem, removeMediaItem },
    }),
    [media, playlists, isLoadingMedia, isLoadingPlaylists, loadMedia, loadPlaylists, syncPlaylist, removePlaylist, syncMediaItem, removeMediaItem],
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
