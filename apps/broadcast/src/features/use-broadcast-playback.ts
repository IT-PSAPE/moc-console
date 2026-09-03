import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { startTransition, useMemo, useState } from "react"
import { getNextPlaybackIndex, getPreloadIndices } from "./playback-sequence"

export function useBroadcastPlayback(broadcast: Broadcast) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const activeItem = broadcast.items[activeIndex] ?? null
  const nextIndex = getNextPlaybackIndex(broadcast.items.length, activeIndex, broadcast.loopEnabled)
  const preloadIndices = useMemo(
    () => getPreloadIndices(broadcast.items.length, activeIndex, broadcast.preloadCount, broadcast.loopEnabled),
    [activeIndex, broadcast.items.length, broadcast.loopEnabled, broadcast.preloadCount],
  )

  function startPlayback() {
    setPlaybackError(null)
    setIsPlaying(true)
  }

  function pausePlayback() {
    setIsPlaying(false)
  }

  function selectIndex(index: number) {
    startTransition(() => {
      setActiveIndex(index)
      setPlaybackError(null)
    })
  }

  function moveToNext() {
    if (nextIndex === null) {
      setIsPlaying(false)
      return
    }

    startTransition(() => {
      setActiveIndex(nextIndex)
      setPlaybackError(null)
    })
  }

  return {
    state: {
      activeIndex,
      activeItem,
      isPlaying,
      playbackError,
      preloadIndices,
    },
    actions: {
      moveToNext,
      pausePlayback,
      selectIndex,
      setPlaybackError,
      startPlayback,
    },
  }
}
