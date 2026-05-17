import { useRef } from "react"
import type { TimelineTransport, TransportSnapshot } from "@moc/ui/components/timeline"

const TICK_MS = 50

export type PlaylistClockOptions = {
  /** Playlist length in **seconds** (longest lane). */
  duration: number
  /** At the end: loop to 0 (default) or stop. */
  atEnd?: "loop" | "stop"
}

// The authoritative master clock for a playlist (ADR-0005). A plain,
// seconds-accurate ticker — the single source of truth. Media never drive
// it; every media element subscribes to it and reconciles to its position
// (see useSubscriberSync). Implements TimelineTransport so the Console
// editor can feed it straight into the domain-agnostic Timeline primitive's
// injected port (ADR-0003 — the primitive stays clock-free).
export interface PlaylistClock extends TimelineTransport {
  setDuration(duration: number): void
  destroy(): void
}

export function createPlaylistClock(options: PlaylistClockOptions): PlaylistClock {
  let duration = Math.max(0, options.duration)
  const atEnd = options.atEnd ?? "loop"

  let snapshot: TransportSnapshot = { currentTime: 0, isPlaying: false }
  const listeners = new Set<() => void>()
  let interval: ReturnType<typeof setInterval> | null = null
  let lastTickAt = 0

  const emit = () => { for (const l of listeners) l() }

  function set(next: Partial<TransportSnapshot>) {
    const merged = { ...snapshot, ...next }
    if (merged.currentTime === snapshot.currentTime && merged.isPlaying === snapshot.isPlaying) return
    snapshot = merged
    emit()
  }

  function stopTicker() {
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
  }

  function startTicker() {
    if (interval !== null) return
    lastTickAt = performance.now()
    interval = setInterval(() => {
      const now = performance.now()
      // SECONDS — not minutes. (The cue-sheet clock ticks in minutes; a
      // playlist's axis is seconds. Conflating them is the 60×-slow bug
      // ADR-0005 was written to kill.)
      const elapsed = (now - lastTickAt) / 1000
      lastTickAt = now
      const next = snapshot.currentTime + elapsed
      if (duration > 0 && next >= duration) {
        if (atEnd === "loop") {
          set({ currentTime: next % duration })
        } else {
          stopTicker()
          set({ currentTime: duration, isPlaying: false })
        }
        return
      }
      set({ currentTime: next })
    }, TICK_MS)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    play() {
      if (snapshot.isPlaying) return
      if (duration > 0 && snapshot.currentTime >= duration) set({ currentTime: 0 })
      set({ isPlaying: true })
      startTicker()
    },
    pause() {
      stopTicker()
      set({ isPlaying: false })
    },
    toggle() {
      if (snapshot.isPlaying) this.pause()
      else this.play()
    },
    seek(time) {
      const clamped = duration > 0 ? Math.max(0, Math.min(duration, time)) : Math.max(0, time)
      set({ currentTime: clamped })
    },
    setDuration(next) {
      duration = Math.max(0, next)
    },
    destroy() {
      stopTicker()
      listeners.clear()
    },
  }
}

// Memoised master clock bound to a duration. Stable across renders; a
// duration edit is pushed in without recreating it (so the playhead and any
// wired live-sync survive). Mirrors @moc/ui's useClockTransport contract.
export function usePlaylistClock(options: PlaylistClockOptions): PlaylistClock {
  const ref = useRef<PlaylistClock | null>(null)
  if (ref.current === null) ref.current = createPlaylistClock(options)
  ref.current.setDuration(options.duration)
  return ref.current
}
