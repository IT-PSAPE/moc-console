import { useRef, useSyncExternalStore } from 'react'
import type { TimelineTransport, TransportSnapshot } from './types'

const TICK_MS = 50

export type ClockTransportOptions = {
    /** Upper bound of the time axis, in time-units. */
    duration: number
    /** When the playhead reaches duration: stop (default) or loop to 0. */
    atEnd?: 'stop' | 'loop'
    /**
     * When true the local ticker never advances — position changes only via
     * external seek()/setPlaying() calls. Used by followers in live sync.
     */
    suppressTicker?: boolean
}

/**
 * A pure, dependency-free clock Transport: a wall-clock ticker that advances
 * the playhead while playing. No Supabase, no DOM — domains layer sync on top
 * via seek()/setPlaying() and by reading getSnapshot(). See ADR-0003.
 */
export interface ClockTransport extends TimelineTransport {
    /** Imperatively set play state (used by live-sync followers). */
    setPlaying(isPlaying: boolean): void
    /** Update the duration without recreating the transport. */
    setDuration(duration: number): void
    destroy(): void
}

export function createClockTransport(options: ClockTransportOptions): ClockTransport {
    let duration = options.duration
    const atEnd = options.atEnd ?? 'stop'
    let suppressTicker = options.suppressTicker ?? false

    let snapshot: TransportSnapshot = { currentTime: 0, isPlaying: false }
    const listeners = new Set<() => void>()
    let interval: ReturnType<typeof setInterval> | null = null
    let lastTickAt = 0

    function emit() {
        for (const l of listeners) l()
    }

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
        if (interval !== null || suppressTicker) return
        lastTickAt = performance.now()
        interval = setInterval(() => {
            const now = performance.now()
            const elapsed = (now - lastTickAt) / 60000
            lastTickAt = now
            const next = snapshot.currentTime + elapsed
            if (next >= duration) {
                if (atEnd === 'loop') {
                    set({ currentTime: 0 })
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
            return () => listeners.delete(listener)
        },
        play() {
            if (snapshot.isPlaying) return
            if (snapshot.currentTime >= duration) set({ currentTime: 0 })
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
            set({ currentTime: Math.max(0, Math.min(duration, time)) })
        },
        setPlaying(isPlaying) {
            if (isPlaying === snapshot.isPlaying) return
            if (isPlaying) {
                set({ isPlaying: true })
                startTicker()
            } else {
                stopTicker()
                set({ isPlaying: false })
            }
        },
        setDuration(next) {
            duration = next
        },
        destroy() {
            stopTicker()
            listeners.clear()
        },
    }
}

/**
 * Memoised clock Transport bound to a duration. The instance is stable across
 * renders; duration changes are pushed in without recreating it (so the
 * playhead and any wired live-sync survive a duration edit).
 */
export function useClockTransport(options: ClockTransportOptions): ClockTransport {
    const ref = useRef<ClockTransport | null>(null)
    if (ref.current === null) ref.current = createClockTransport(options)
    ref.current.setDuration(options.duration)
    return ref.current
}

/** Subscribe a component to a Transport's snapshot. */
export function useTransportSnapshot(transport: TimelineTransport): TransportSnapshot {
    return useSyncExternalStore(transport.subscribe, transport.getSnapshot, transport.getSnapshot)
}

// ─── Media transport (the playing media IS the clock — ADR-0003) ───

export interface MediaTransport extends TimelineTransport {
    /**
     * Bind the element currently playing the block under the playhead.
     * Its timeupdate/ended drives currentTime; seek() seeks the element.
     * Pass null when nothing is playing (e.g. an image — fall back to a
     * timer the host advances via tick()).
     */
    attachMedia(el: HTMLMediaElement | null): void
    /** Manually advance currentTime (for image blocks with no media clock). */
    tick(currentTime: number): void
}

/**
 * Transport whose time source is real media playback. Unlike the clock
 * transport it does not run its own ticker — a bound <video>/<audio>
 * element (or host tick() for images) is authoritative, so the visual
 * playhead never drifts from what is actually on screen.
 */
export function createMediaTransport(duration: number): MediaTransport {
    let snapshot: TransportSnapshot = { currentTime: 0, isPlaying: false }
    const listeners = new Set<() => void>()
    let media: HTMLMediaElement | null = null

    function emit() { for (const l of listeners) l() }
    function set(next: Partial<TransportSnapshot>) {
        const merged = { ...snapshot, ...next }
        if (merged.currentTime === snapshot.currentTime && merged.isPlaying === snapshot.isPlaying) return
        snapshot = merged
        emit()
    }

    const onTimeUpdate = () => { if (media) set({ currentTime: Math.min(duration, media.currentTime) }) }
    const onPlay = () => set({ isPlaying: true })
    const onPause = () => set({ isPlaying: false })

    function detach() {
        if (!media) return
        media.removeEventListener('timeupdate', onTimeUpdate)
        media.removeEventListener('play', onPlay)
        media.removeEventListener('pause', onPause)
        media = null
    }

    return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        play() { media ? void media.play().catch(() => {}) : set({ isPlaying: true }) },
        pause() { media ? media.pause() : set({ isPlaying: false }) },
        toggle() { snapshot.isPlaying ? this.pause() : this.play() },
        seek(time) {
            const t = Math.max(0, Math.min(duration, time))
            if (media) media.currentTime = t
            set({ currentTime: t })
        },
        attachMedia(el) {
            if (el === media) return
            detach()
            media = el
            if (media) {
                media.addEventListener('timeupdate', onTimeUpdate)
                media.addEventListener('play', onPlay)
                media.addEventListener('pause', onPause)
            }
        },
        tick(currentTime) { set({ currentTime: Math.max(0, Math.min(duration, currentTime)) }) },
    }
}
