import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Maximize, Minimize, X, Music } from 'lucide-react'
import { Title, Label } from '@moc/ui/components/display/text'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'
import { useCuePlayer } from '@/features/player/use-cue-player'

const IDLE_MS = 3000

// Background-music gain depending on what's on screen, so an ambient
// track sits under stills but doesn't fight a video's own audio.
function musicVolumeForCueType(type: string, videoMuted: boolean): number {
  if (type === 'image') return 0.8
  if (type === 'video') return videoMuted ? 0.8 : 0.25
  return 0.15 // audio cue — keep the ambient bed well back
}

export function Player({ playable, onExit }: { playable: PlayablePlaylist; onExit: () => void }) {
  const { playlist } = playable
  const { cue, cueMedia, index, total, paused, advance, goPrev, goNext, togglePaused } =
    useCuePlayer(playable)

  const containerRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const musicRef = useRef<HTMLAudioElement>(null)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [needsGesture, setNeedsGesture] = useState(false)
  const idleTimer = useRef<number | null>(null)

  // ─── Controls auto-hide ───────────────────────────────
  const pokeControls = useCallback(() => {
    setControlsVisible(true)
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setControlsVisible(false), IDLE_MS)
  }, [])

  useEffect(() => {
    pokeControls()
    return () => { if (idleTimer.current !== null) window.clearTimeout(idleTimer.current) }
  }, [pokeControls])

  // Keep controls pinned while paused.
  const showControls = controlsVisible || paused

  // ─── Fullscreen ───────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ─── Media element play/pause sync ────────────────────
  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    if (paused) {
      el.pause()
      return
    }
    const result = el.play()
    if (result && typeof result.catch === 'function') {
      result.catch(() => setNeedsGesture(true))
    }
  }, [paused, cue])

  // ─── Background music ─────────────────────────────────
  useEffect(() => {
    const music = musicRef.current
    if (!music || !cue) return
    music.volume = musicVolumeForCueType(cue.mediaItemType, playlist.videoSettings.muted)
  }, [cue, playlist.videoSettings.muted])

  useEffect(() => {
    const music = musicRef.current
    if (!music) return
    if (paused) {
      music.pause()
    } else {
      music.play().catch(() => { /* ambient is best-effort */ })
    }
  }, [paused])

  const startWithGesture = useCallback(() => {
    setNeedsGesture(false)
    mediaRef.current?.play().catch(() => setNeedsGesture(true))
    musicRef.current?.play().catch(() => {})
  }, [])

  if (!cue) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <Label.md className="text-white/60">This playlist has nothing to play.</Label.md>
      </div>
    )
  }

  const mediaUrl = cueMedia?.url

  return (
    <div
      ref={containerRef}
      data-theme="dark"
      onMouseMove={pokeControls}
      onTouchStart={pokeControls}
      className={`relative min-h-dvh w-full bg-black overflow-hidden ${showControls ? '' : 'cursor-none'}`}
    >
      {/* Stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        {cue.mediaItemType === 'image' && mediaUrl && (
          <img src={mediaUrl} alt="" className="size-full object-contain" />
        )}

        {cue.mediaItemType === 'video' && mediaUrl && (
          <video
            key={cue.id}
            ref={mediaRef}
            src={mediaUrl}
            className="size-full object-contain"
            autoPlay
            playsInline
            muted={playlist.videoSettings.muted}
            onEnded={advance}
          />
        )}

        {cue.mediaItemType === 'audio' && mediaUrl && (
          <>
            <div className="flex flex-col items-center gap-6 px-6 text-center">
              <span className="size-24 rounded-full bg-white/5 flex items-center justify-center">
                <Music className="size-10 text-white/50" />
              </span>
              <div className="flex flex-col gap-1.5">
                <Title.h3 className="text-white">{cue.mediaItemName}</Title.h3>
                <Label.md className="text-white/40">{playlist.name}</Label.md>
              </div>
            </div>
            <audio key={cue.id} ref={mediaRef} src={mediaUrl} autoPlay onEnded={advance} />
          </>
        )}
      </div>

      {/* Background music (independent, looping) */}
      {playlist.backgroundMusicUrl && (
        <audio ref={musicRef} src={playlist.backgroundMusicUrl} loop autoPlay />
      )}

      {/* Autoplay-blocked fallback */}
      {needsGesture && (
        <button
          onClick={startWithGesture}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 cursor-pointer"
        >
          <span className="size-20 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="size-8 text-black translate-x-0.5" />
          </span>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 bg-linear-to-b from-black/85 via-black/45 to-transparent px-6 pt-4 pb-12">
          <div className="min-w-0">
            <Label.lg className="text-white truncate block">{playlist.name}</Label.lg>
            <Label.sm className="text-white/50">{index + 1} / {total} · {cue.mediaItemName}</Label.sm>
          </div>
          <button
            onClick={onExit}
            aria-label="Exit playback"
            className="shrink-0 rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Bottom bar — strong scrim so controls stay legible over bright media */}
        <div className="flex items-center justify-center gap-6 bg-linear-to-t from-black/90 via-black/55 to-transparent px-6 pt-24 pb-7 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          <ControlButton label="Previous" onClick={goPrev}><SkipBack className="size-6" /></ControlButton>
          <ControlButton label={paused ? 'Play' : 'Pause'} onClick={togglePaused} primary>
            {paused ? <Play className="size-7 translate-x-0.5" /> : <Pause className="size-7" />}
          </ControlButton>
          <ControlButton label="Next" onClick={goNext}><SkipForward className="size-6" /></ControlButton>
          <ControlButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="size-6" /> : <Maximize className="size-6" />}
          </ControlButton>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  children,
  label,
  onClick,
  primary,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        primary
          ? 'rounded-full bg-white text-black size-14 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer'
          : 'rounded-full text-white/80 size-12 flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors cursor-pointer'
      }
    >
      {children}
    </button>
  )
}
