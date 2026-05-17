import { useEffect, useMemo, useRef } from "react"
import type { Cue, PlaylistLane, ResolvedCue } from "@moc/types/broadcast"
import { resolveLaneTimeline, laneDurationSec } from "@moc/types/broadcast"
import type { TimelineTransport } from "@moc/ui/components/timeline"
import { useTransportSnapshot } from "@moc/ui/components/timeline"
import { cn } from "@moc/utils/cn"

export type ResolvedLane = {
  id: string
  type: string
  order: number
  name: string | null
  resolved: ResolvedCue[]
  lengthSec: number
}

// Resolve a playlist's lanes once and report the playlist length (the
// longest lane). The consumer feeds `total` into usePlaylistClock and the
// `lanes` into <ProgramCompositor>, so the clock and the picture agree.
export function usePlaylistProgram(args: {
  lanes: PlaylistLane[]
  defaultImageDuration: number
  durationOf: (cue: Cue) => number | null
}): { lanes: ResolvedLane[]; total: number } {
  const { lanes, defaultImageDuration, durationOf } = args
  return useMemo(() => {
    const resolvedLanes: ResolvedLane[] = [...lanes]
      .sort((a, b) => a.order - b.order)
      .map((lane) => {
        const resolved = resolveLaneTimeline(lane, defaultImageDuration, durationOf)
        return {
          id: lane.id,
          type: lane.type,
          order: lane.order,
          name: lane.name,
          resolved,
          lengthSec: laneDurationSec(resolved),
        }
      })
      .filter((l) => l.resolved.length > 0)
    const total = Math.max(0, ...resolvedLanes.map((l) => l.lengthSec))
    return { lanes: resolvedLanes, total }
  }, [lanes, defaultImageDuration, durationOf])
}

const DEAD_BAND = 0.25 // s — play naturally inside this
const DRIFT_CEILING = 2 // s — beyond this, give up rubber-banding and hard-seek
const RATE_FAST = 1.1
const RATE_SLOW = 0.9

// One media subscriber. It owns NO time of its own — every frame it derives
// its desired position from the master clock and reconciles (ADR-0005):
// dead-band → play naturally; moderate drift → playbackRate rubber-band;
// catastrophic drift / (re)activation / external seek → hard seek.
function SubscriberMedia({
  cue, url, localTime, isPlaying, muted, className,
}: {
  cue: ResolvedCue
  url: string
  localTime: number
  isPlaying: boolean
  muted: boolean
  className?: string
}) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const isImage = cue.mediaItemType === "image"
  const desired = Math.min(
    Math.max(cue.inPointSec + (localTime - cue.startSec), cue.inPointSec),
    cue.outPointSec,
  )

  // Activation: this element only mounts while its cue is active (parent
  // keys it by cue.id), so initialise straight to the in-point.
  useEffect(() => {
    if (isImage) return
    const el = ref.current
    if (!el) return
    const init = () => { try { el.currentTime = desired } catch { /* not seekable yet */ } }
    if (el.readyState >= 1) init()
    else el.addEventListener("loadedmetadata", init, { once: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue.id, isImage])

  useEffect(() => {
    if (isImage) return
    const el = ref.current
    if (!el) return
    if (!isPlaying) {
      el.pause()
      el.playbackRate = 1
      if (Number.isFinite(desired)) { try { el.currentTime = desired } catch { /* ignore */ } }
      return
    }
    el.play().catch(() => {})
    const drift = el.currentTime - desired // >0 = ahead of clock
    const mag = Math.abs(drift)
    if (mag > DRIFT_CEILING) {
      try { el.currentTime = desired } catch { /* ignore */ }
      el.playbackRate = 1
    } else if (mag > DEAD_BAND) {
      el.playbackRate = drift < 0 ? RATE_FAST : RATE_SLOW // behind → speed up
    } else {
      el.playbackRate = 1
    }
  }, [isImage, isPlaying, desired])

  if (isImage) return <img src={url} alt="" className={className} />
  if (cue.mediaItemType === "audio") return <audio ref={ref} src={url} muted={muted} />
  return <video ref={ref} src={url} muted={muted} playsInline className={className} />
}

// The Program (CONTEXT.md): every lane's active block alpha-composited
// front-to-back, **Lane 01 frontmost**. Opaque pixels occlude lanes
// behind; transparent pixels and gaps reveal them; black if none. Audio
// lanes mix only — never part of the picture.
export function ProgramCompositor({
  lanes, transport, resolveUrl, muted = false, mutedFor, className,
}: {
  lanes: ResolvedLane[]
  transport: TimelineTransport
  resolveUrl: (mediaItemId: string) => string | undefined
  /** Mute every clip (Console preview muts all). */
  muted?: boolean
  /** Per-clip mute policy (MOC Broadcast: start-gesture + cue.muted).
   *  Overrides `muted` when provided. Audio policy is per-app chrome. */
  mutedFor?: (cue: ResolvedCue) => boolean
  className?: string
}) {
  const { currentTime, isPlaying } = useTransportSnapshot(transport)
  const mutedOf = (cue: ResolvedCue) => (mutedFor ? mutedFor(cue) : muted)

  const layers = lanes.map((lane) => {
    // Each lane loops within its own length (ADR-0004); the master clock
    // spans the longest lane.
    const local = lane.lengthSec > 0 ? currentTime % lane.lengthSec : currentTime
    const cue = lane.resolved.find((c) => local >= c.startSec && local < c.startSec + c.durationSec) ?? null
    return { lane, local, cue }
  })

  const maxOrder = lanes.reduce((m, l) => Math.max(m, l.order), 0)

  return (
    <div className={cn("relative size-full overflow-hidden bg-black", className)}>
      {layers.map(({ lane, local, cue }) => {
        if (!cue) return null
        const url = cue.mediaItemId ? resolveUrl(cue.mediaItemId) : undefined
        if (!url) return null
        const audioLane = lane.type === "audio" || cue.mediaItemType === "audio"
        if (audioLane) {
          return (
            <SubscriberMedia
              key={lane.id + cue.id}
              cue={cue}
              url={url}
              localTime={local}
              isPlaying={isPlaying}
              muted={mutedOf(cue)}
            />
          )
        }
        return (
          // Lower lane order ⇒ higher z-index ⇒ frontmost (Lane 01 wins).
          <div
            key={lane.id + cue.id}
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: maxOrder - lane.order + 1 }}
          >
            <SubscriberMedia
              cue={cue}
              url={url}
              localTime={local}
              isPlaying={isPlaying}
              muted={mutedOf(cue)}
              className="size-full object-contain"
            />
          </div>
        )
      })}
    </div>
  )
}
