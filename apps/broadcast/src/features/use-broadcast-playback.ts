import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import type { ChangeEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  getMediaSourceKey,
  getNextPlaybackItem,
  getPreviousPlaybackItem,
} from "./playback-sequence"

type MediaDeck = 0 | 1

function getOtherDeck(deck: MediaDeck): MediaDeck {
  return deck === 0 ? 1 : 0
}

export function useBroadcastPlayback(broadcast: Broadcast) {
  const [activeItem, setActiveItem] = useState<BroadcastItem | null>(broadcast.items[0] ?? null)
  const [activeDeck, setActiveDeck] = useState<MediaDeck>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loadedDuration, setLoadedDuration] = useState(0)
  const lastAudibleVolumeRef = useRef(1)
  const mediaRefs = useRef<Array<HTMLMediaElement | null>>([null, null])
  const playerRootRef = useRef<HTMLElement | null>(null)

  const resolvedActiveItem = activeItem ?? broadcast.items[0] ?? null
  const activeItemId = resolvedActiveItem?.id ?? ""
  const activeItemKey = resolvedActiveItem ? getMediaSourceKey(resolvedActiveItem) : ""
  const nextItem = useMemo(
    () => (resolvedActiveItem ? getNextPlaybackItem(broadcast.items, resolvedActiveItem.id) : null),
    [broadcast.items, resolvedActiveItem],
  )
  const nextItemKey = nextItem ? getMediaSourceKey(nextItem) : ""
  const preloadItem = activeItemKey === nextItemKey ? null : nextItem
  const inactiveDeck = getOtherDeck(activeDeck)
  const deckItems: [BroadcastItem | null, BroadcastItem | null] = activeDeck === 0
    ? [resolvedActiveItem, preloadItem]
    : [preloadItem, resolvedActiveItem]
  // The stored duration lets the scrubber render a real track before the
  // browser has any metadata for the current item.
  const durationSeconds = loadedDuration || resolvedActiveItem?.durationSeconds || 0

  useEffect(() => {
    const activeElement = mediaRefs.current[activeDeck]
    const inactiveElement = mediaRefs.current[inactiveDeck]

    inactiveElement?.load()

    if (!isPlaying) {
      activeElement?.pause()
      inactiveElement?.pause()
      return
    }

    void activeElement?.play().catch(() => {
      setIsPlaying(false)
      setPlaybackError("Playback needs a user interaction to continue.")
    })
  }, [activeDeck, activeItemKey, inactiveDeck, isPlaying, nextItemKey])

  useEffect(() => {
    const element = mediaRefs.current[activeDeck]

    if (!element) {
      return
    }

    function syncElapsed() {
      const media = mediaRefs.current[activeDeck]
      if (media) setElapsedSeconds(media.currentTime)
    }

    function syncDuration() {
      const media = mediaRefs.current[activeDeck]
      if (media) setLoadedDuration(Number.isFinite(media.duration) ? media.duration : 0)
    }

    syncElapsed()
    syncDuration()
    element.addEventListener("timeupdate", syncElapsed)
    element.addEventListener("seeked", syncElapsed)
    element.addEventListener("durationchange", syncDuration)
    element.addEventListener("loadedmetadata", syncDuration)

    return () => {
      element.removeEventListener("timeupdate", syncElapsed)
      element.removeEventListener("seeked", syncElapsed)
      element.removeEventListener("durationchange", syncDuration)
      element.removeEventListener("loadedmetadata", syncDuration)
    }
  }, [activeDeck, activeItemKey])

  useEffect(() => {
    mediaRefs.current.forEach((element) => {
      if (element) {
        element.muted = isMuted
        element.volume = volume
      }
    })
  }, [isMuted, volume])

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === playerRootRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  function setFirstMediaElement(element: HTMLMediaElement | null) {
    mediaRefs.current[0] = element
  }

  function setSecondMediaElement(element: HTMLMediaElement | null) {
    mediaRefs.current[1] = element
  }

  function setPlayerRoot(element: HTMLElement | null) {
    playerRootRef.current = element
  }

  function startPlayback() {
    setPlaybackError(null)
    void mediaRefs.current[activeDeck]?.play().catch(() => {
      setIsPlaying(false)
      setPlaybackError("Playback needs a user interaction to continue.")
    })
    setIsPlaying(true)
  }

  function pausePlayback() {
    mediaRefs.current.forEach((element) => element?.pause())
    setIsPlaying(false)
  }

  function restartCurrentItem() {
    const activeElement = mediaRefs.current[activeDeck]
    if (!activeElement) {
      return
    }

    activeElement.currentTime = 0
    setPlaybackError(null)

    if (!isPlaying) {
      return
    }

    void activeElement.play().catch(() => {
      setIsPlaying(false)
      setPlaybackError("Playback needs a user interaction to continue.")
    })
  }

  function promoteItem(item: BroadcastItem) {
    const activeElement = mediaRefs.current[activeDeck]
    const preloadedElement = mediaRefs.current[inactiveDeck]
    const isPreloaded = nextItemKey === getMediaSourceKey(item)

    activeElement?.pause()
    setPlaybackError(null)

    if (isPreloaded) {
      if (isPlaying) {
        void preloadedElement?.play().catch(() => {
          setIsPlaying(false)
          setPlaybackError("Playback needs a user interaction to continue.")
        })
      }

      setActiveDeck(inactiveDeck)
    } else if (activeElement) {
      activeElement.currentTime = 0
    }

    setActiveItem(item)
  }

  function moveToNext() {
    if (!resolvedActiveItem) {
      return
    }

    if (!nextItem) {
      setActiveItem(null)
      setIsPlaying(false)
      return
    }

    if (activeItemKey === nextItemKey) {
      const activeElement = mediaRefs.current[activeDeck]
      if (activeElement) {
        activeElement.currentTime = 0
        if (isPlaying) {
          void activeElement.play().catch(() => {
            setIsPlaying(false)
            setPlaybackError("Playback needs a user interaction to continue.")
          })
        }
      }
      return
    }

    promoteItem(nextItem)
  }

  function moveToPrevious() {
    if (!resolvedActiveItem) {
      return
    }

    const previousItem = getPreviousPlaybackItem(broadcast.items, resolvedActiveItem.id)
    if (!previousItem) {
      return
    }

    if (getMediaSourceKey(previousItem) === activeItemKey) {
      restartCurrentItem()
      return
    }

    promoteItem(previousItem)
  }

  function selectItem(itemId: string) {
    const item = broadcast.items.find((queueItem) => queueItem.id === itemId)
    if (item && getMediaSourceKey(item) !== activeItemKey) {
      promoteItem(item)
    }
  }

  function togglePlayback() {
    if (isPlaying) {
      pausePlayback()
      return
    }

    startPlayback()
  }

  function toggleMuted() {
    if (isMuted || volume === 0) {
      const restoredVolume = Math.max(lastAudibleVolumeRef.current, 0.05)
      setVolume(restoredVolume)
      setIsMuted(false)
      return
    }

    setIsMuted(true)
  }

  function seek(event: ChangeEvent<HTMLInputElement>) {
    const element = mediaRefs.current[activeDeck]
    const nextTime = Number(event.currentTarget.value)

    if (element) {
      element.currentTime = nextTime
    }

    setElapsedSeconds(nextTime)
  }

  function changeVolume(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.currentTarget.value)
    if (nextVolume > 0) {
      lastAudibleVolumeRef.current = nextVolume
    }
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
  }

  function handleMediaError() {
    mediaRefs.current.forEach((element) => element?.pause())
    setIsPlaying(false)
    setPlaybackError("This media could not be played.")
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await playerRootRef.current?.requestFullscreen()
      }
    } catch {
      setPlaybackError("Fullscreen is not available in this browser.")
    }
  }

  return {
    state: {
      activeDeck,
      activeItem: resolvedActiveItem,
      activeItemId,
      deckItems,
      durationSeconds,
      elapsedSeconds,
      isFullscreen,
      isMuted,
      isPlaying,
      playbackError,
      volume,
    },
    actions: {
      changeVolume,
      moveToNext,
      moveToPrevious,
      seek,
      selectItem,
      setFirstMediaElement,
      handleMediaError,
      setPlayerRoot,
      setSecondMediaElement,
      toggleFullscreen,
      toggleMuted,
      togglePlayback,
    },
  }
}
