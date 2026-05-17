import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize, X } from 'lucide-react'
import { Label } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { useTransportSnapshot } from '@moc/ui/components/timeline'
import { ProgramCompositor } from '@moc/player'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'
import { useMultitrackPlayer } from '@/features/player/use-multitrack-player'

const IDLE_MS = 3000

function fmt(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds))
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function Player({ playable, onExit }: { playable: PlayablePlaylist; onExit: () => void }) {
    const { playlist } = playable
    const { lanes, total, transport, goPrev, goNext, resolveUrl } = useMultitrackPlayer(playable)
    const { currentTime, isPlaying } = useTransportSnapshot(transport)
    const paused = !isPlaying

    const containerRef = useRef<HTMLDivElement>(null)
    const musicRef = useRef<HTMLAudioElement>(null)

    // Browsers block autoplay WITH sound until a user gesture. Videos play
    // their own audio by default here, so we gate the master clock behind a
    // single tap; until then nothing plays and everything stays muted.
    const [started, setStarted] = useState(false)

    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(true)
    const idleTimer = useRef<number | null>(null)

    const pokeControls = useCallback(() => {
        setControlsVisible(true)
        if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
        idleTimer.current = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
    }, [])

    useEffect(() => {
        idleTimer.current = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
        return () => { if (idleTimer.current !== null) window.clearTimeout(idleTimer.current) }
    }, [])

    const showControls = controlsVisible || paused

    const start = useCallback(() => {
        setStarted(true)
        transport.play()
        pokeControls()
    }, [transport, pokeControls])

    const togglePaused = useCallback(() => transport.toggle(), [transport])

    const toggleFullscreen = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else el.requestFullscreen().catch(() => {})
    }, [])

    useEffect(() => {
        const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    useEffect(() => {
        const music = musicRef.current
        if (!music) return
        if (paused || !started) music.pause()
        else music.play().catch(() => { /* ambient is best-effort */ })
    }, [paused, started])

    const hasAnything = lanes.length > 0 && total > 0
    if (!hasAnything) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <Label.md className="text-white/60">This playlist has nothing to play.</Label.md>
            </div>
        )
    }

    // Frontmost active clip (Lane 01 wins — lanes are order-ascending) → title.
    const frontmost = lanes
        .map((lane) => {
            const local = lane.lengthSec > 0 ? currentTime % lane.lengthSec : currentTime
            return lane.resolved.find((c) => local >= c.startSec && local < c.startSec + c.durationSec) ?? null
        })
        .find((c) => c)

    return (
        <div
            ref={containerRef}
            data-theme="dark"
            onMouseMove={pokeControls}
            onTouchStart={pokeControls}
            className={`relative min-h-dvh w-full bg-black overflow-hidden ${showControls ? '' : 'cursor-none'}`}
        >
            {/* Stage — the shared Program (Lane 01 frontmost, alpha-composited) */}
            <ProgramCompositor
                lanes={lanes}
                transport={transport}
                resolveUrl={resolveUrl}
                mutedFor={(cue) => !started || (cue.muted ?? false)}
                className="absolute inset-0"
            />

            {playlist.backgroundMusicUrl && (
                <audio ref={musicRef} src={playlist.backgroundMusicUrl} loop />
            )}

            {!started && (
                <button
                    type="button"
                    onClick={start}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black text-white/90"
                >
                    <span className="flex size-20 items-center justify-center rounded-full bg-white text-black">
                        <Play className="size-9 translate-x-0.5" />
                    </span>
                    <Label.md className="text-white/70">Tap to start</Label.md>
                </button>
            )}

            {/* Controls overlay */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center justify-between gap-3 bg-linear-to-b from-black/85 via-black/45 to-transparent px-6 pt-4 pb-12">
                    <div className="min-w-0">
                        <Label.lg className="text-white truncate block">{playlist.name}</Label.lg>
                        <Label.sm className="text-white/50">
                            {fmt(currentTime)} / {fmt(total)}
                            {frontmost ? ` · ${frontmost.mediaItemName}` : ''}
                            {lanes.length > 1 ? ` · ${lanes.length} lanes` : ''}
                        </Label.sm>
                    </div>
                    <Button.Icon
                        variant="ghost"
                        onClick={onExit}
                        aria-label="Exit playback"
                        icon={<X />}
                        className="shrink-0 !rounded-full text-white/70 hover:!bg-white/10 hover:text-white [&_svg]:!size-6"
                    />
                </div>

                <div className="flex items-center justify-center gap-6 bg-linear-to-t from-black/90 via-black/55 to-transparent px-6 pt-24 pb-7 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    <ControlButton label="Previous" onClick={goPrev}><SkipBack /></ControlButton>
                    <ControlButton label={paused ? 'Play' : 'Pause'} onClick={togglePaused} primary>
                        {paused ? <Play className="translate-x-0.5" /> : <Pause />}
                    </ControlButton>
                    <ControlButton label="Next" onClick={goNext}><SkipForward /></ControlButton>
                    <ControlButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize /> : <Maximize />}
                    </ControlButton>
                </div>
            </div>
        </div>
    )
}

function ControlButton({ children, label, onClick, primary }: { children: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
    return (
        <Button.Icon
            variant="ghost"
            onClick={onClick}
            aria-label={label}
            icon={children}
            className={primary
                ? '!rounded-full !bg-white text-black size-14 hover:scale-105 hover:!bg-white [&_svg]:!size-7'
                : '!rounded-full text-white/80 size-12 hover:text-white hover:!bg-white/10 [&_svg]:!size-6'}
        />
    )
}
