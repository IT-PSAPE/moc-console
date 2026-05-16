import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize, X } from 'lucide-react'
import { Label } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import type { ResolvedCue } from '@moc/types/broadcast'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'
import { useMultitrackPlayer, type LaneTrack } from '@/features/player/use-multitrack-player'

const IDLE_MS = 3000

function fmt(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds))
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function Player({ playable, onExit }: { playable: PlayablePlaylist; onExit: () => void }) {
    const { playlist, mediaById } = playable
    const { lanes, activeByLane, t, total, paused, goPrev, goNext, togglePaused } = useMultitrackPlayer(playable)

    const containerRef = useRef<HTMLDivElement>(null)
    const musicRef = useRef<HTMLAudioElement>(null)

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
        if (paused) music.pause()
        else music.play().catch(() => { /* ambient is best-effort */ })
    }, [paused])

    const hasAnything = lanes.length > 0 && total > 0
    if (!hasAnything) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <Label.md className="text-white/60">This playlist has nothing to play.</Label.md>
            </div>
        )
    }

    // Topmost visual lane's cue → the title line.
    const topVisual = [...activeByLane].reverse().find(({ lane, cue }) => lane.type !== 'audio' && cue)

    return (
        <div
            ref={containerRef}
            data-theme="dark"
            onMouseMove={pokeControls}
            onTouchStart={pokeControls}
            className={`relative min-h-dvh w-full bg-black overflow-hidden ${showControls ? '' : 'cursor-none'}`}
        >
            {/* Stage — lanes composited bottom→top (DOM order = z-order, ADR-0004) */}
            <div className="absolute inset-0">
                {activeByLane.map(({ lane, cue }) =>
                    cue ? (
                        <LaneLayer
                            key={lane.id}
                            lane={lane}
                            cue={cue}
                            paused={paused}
                            muted={playlist.videoSettings.muted}
                            url={mediaById[cue.mediaItemId]?.url}
                        />
                    ) : null,
                )}
            </div>

            {playlist.backgroundMusicUrl && (
                <audio ref={musicRef} src={playlist.backgroundMusicUrl} loop autoPlay />
            )}

            {/* Controls overlay */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center justify-between gap-3 bg-linear-to-b from-black/85 via-black/45 to-transparent px-6 pt-4 pb-12">
                    <div className="min-w-0">
                        <Label.lg className="text-white truncate block">{playlist.name}</Label.lg>
                        <Label.sm className="text-white/50">
                            {fmt(t)} / {fmt(total)}
                            {topVisual?.cue ? ` · ${topVisual.cue.mediaItemName}` : ''}
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

// One composited lane layer. Audio lanes mix (no visual stack); visual
// lanes fill; overlay lanes sit contained on top. See ADR-0004.
function LaneLayer({ lane, cue, paused, muted, url }: { lane: LaneTrack; cue: ResolvedCue; paused: boolean; muted: boolean; url: string | undefined }) {
    const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)

    useEffect(() => {
        const el = mediaRef.current
        if (!el) return
        if (paused) el.pause()
        else el.play().catch(() => {})
    }, [paused, cue.id])

    if (!url) return null

    if (lane.type === 'audio' || cue.mediaItemType === 'audio') {
        return <audio key={cue.id} ref={mediaRef} src={url} autoPlay loop />
    }

    const isOverlay = lane.type === 'overlay'
    const wrap = isOverlay
        ? 'absolute inset-0 flex items-center justify-center p-10 pointer-events-none'
        : 'absolute inset-0 flex items-center justify-center'

    if (cue.mediaItemType === 'video') {
        return (
            <div className={wrap}>
                <video key={cue.id} ref={mediaRef} src={url} className="size-full object-contain" autoPlay playsInline loop muted={muted} />
            </div>
        )
    }
    return (
        <div className={wrap}>
            <img src={url} alt="" className="size-full object-contain" />
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
