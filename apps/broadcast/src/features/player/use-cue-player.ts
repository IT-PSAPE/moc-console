import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'

// Drives linear progression through a playlist's (already filtered,
// already ordered) cues. Image cues advance on a timer; video/audio
// cues advance on their element's `ended` event, with an optional
// durationOverride acting as a hard cap.
//
// End-of-playlist: v1 implements playbackMode === 'loop' only. 'stop'
// and 'sequence' are read off the playlist but fall through to loop
// here — see Playlist.playbackMode / Playlist.nextPlaylistId.
// TODO(playback_mode): implement 'stop' (freeze on last frame) and
// 'sequence' (load nextPlaylistId).
export function useCuePlayer(playable: PlayablePlaylist) {
  const cues = playable.playlist.cues
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<number | null>(null)

  const cue = cues[index]
  const cueMedia = cue ? playable.mediaById[cue.mediaItemId] : undefined

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    setIndex((current) => {
      const next = current + 1
      if (next >= cues.length) {
        // 'loop' (and v1 fallback for 'stop' / 'sequence').
        return 0
      }
      return next
    })
  }, [cues.length])

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + cues.length) % cues.length)
  }, [cues.length])

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % cues.length)
  }, [cues.length])

  const togglePaused = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  // Image cues are time-driven. Video/audio cues self-advance via
  // onEnded (wired by the renderer) but still honour a durationOverride
  // hard cap here.
  useEffect(() => {
    clearTimer()
    if (!cue || paused) return

    const isImage = cue.mediaItemType === 'image'
    let seconds: number | null = null

    if (isImage) {
      seconds = cue.durationOverride ?? playable.playlist.defaultImageDuration
    } else if (cue.durationOverride != null) {
      seconds = cue.durationOverride
    }

    if (seconds != null && seconds > 0) {
      timerRef.current = window.setTimeout(advance, seconds * 1000)
    }
    return clearTimer
  }, [cue, index, paused, advance, clearTimer, playable.playlist.defaultImageDuration])

  return {
    cue,
    cueMedia,
    index,
    total: cues.length,
    paused,
    advance,
    goPrev,
    goNext,
    togglePaused,
    setPaused,
  }
}
