import { useCallback } from "react"
import { Timeline, useActiveBlocks, useTimeline, type TimelineLaneData, type TimelineTransport } from "@moc/ui/components/timeline"
import { ProgramCompositor, type ResolvedLane } from "@moc/player"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import type { Cue, PlaylistLane, ResolvedCue } from "@moc/types/broadcast"
import { cn } from "@moc/utils/cn"
import { Image as ImageIcon, Music, Pause, Play, Plus, Video, X, ZoomIn, ZoomOut } from "lucide-react"

// ─── Time axis is SECONDS ──────────────────────────────────────────

function tc(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds))
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

const TYPE_ICON = {
    image: <ImageIcon className="size-3.5" />,
    video: <Video className="size-3.5" />,
    audio: <Music className="size-3.5" />,
} as const

function defaultLaneName(type: string) {
    return type === "audio" ? "Audio bed" : type === "overlay" ? "Overlay" : "Program"
}

type PlaylistTimelineProps = {
    lanes: PlaylistLane[]
    primitiveLanes: TimelineLaneData[]
    thumbById: Map<string, string | null>
    urlById: Map<string, string>
    programLanes: ResolvedLane[]
    transport: TimelineTransport
}

// Presentational timeline body. Assumes a <Timeline> provider ancestor —
// the provider is lifted to the screen so the command bar shares the same
// transport/zoom state (see ADR-0003 and use-playlist-timeline).
export function PlaylistTimeline({ lanes, primitiveLanes, thumbById, urlById, programLanes, transport }: PlaylistTimelineProps) {
    const { isPlaying, toggle, currentTime, total } = useTimeline()

    return (
        <>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-secondary_alt px-6 py-5">
                <ProgramMonitor programLanes={programLanes} transport={transport} urlById={urlById} />
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1.5 border-y border-secondary bg-secondary_alt px-3 py-1.5">
                <div className="mx-auto flex items-center gap-2.5">
                    <Button.Icon
                        variant={isPlaying ? "primary" : "secondary"}
                        icon={isPlaying ? <Pause /> : <Play />}
                        onClick={toggle}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    />
                    <Label.sm className="font-mono tabular-nums text-secondary">
                        {tc(currentTime)} <span className="text-quaternary">/</span> {tc(total)}
                    </Label.sm>
                </div>

                <TimelineZoomControls />
            </div>

            <Timeline.Viewport className="shrink-0 flex-none">
                <Timeline.Sidebar>
                    <Timeline.SidebarHeader>
                        <Label.xs className="text-tertiary">Channels</Label.xs>
                    </Timeline.SidebarHeader>
                    <Timeline.LaneList>
                        {lanes.map((lane, i) => (
                            <Timeline.LaneHeader key={lane.id} id={lane.id} className="group">
                                <Timeline.LaneHeader.DragHandle className="font-mono text-xs font-medium text-brand_secondary">
                                    {String(i + 1).padStart(2, "0")}
                                </Timeline.LaneHeader.DragHandle>
                                <Label.xs className="min-w-0 flex-1 truncate text-primary">
                                    {lane.name ?? defaultLaneName(lane.type)}
                                </Label.xs>
                                <Timeline.LaneHeader.Remove className="flex size-5 items-center justify-center rounded text-quaternary opacity-0 transition-colors hover:text-error group-hover:opacity-100">
                                    <X className="size-3.5" />
                                </Timeline.LaneHeader.Remove>
                            </Timeline.LaneHeader>
                        ))}
                        <Timeline.AddLane
                            defaults={{ type: "visual", data: { name: null, type: "visual" } }}
                            className="!text-tertiary hover:!text-brand_secondary"
                        >
                            <Plus className="size-3.5" /> <span>Add channel</span>
                        </Timeline.AddLane>
                    </Timeline.LaneList>
                </Timeline.Sidebar>

                <Timeline.Canvas>
                    <Timeline.Ruler format={tc} />
                    {primitiveLanes.map((lane) => (
                        <Timeline.Lane key={lane.id} id={lane.id}>
                            {lane.blocks.map((b) => {
                                const cue = b.data as ResolvedCue
                                const thumb = cue.mediaItemId ? thumbById.get(cue.mediaItemId) : null
                                const estimated = cue.durationSource === "fallback"
                                return (
                                    <Timeline.Block
                                        key={b.id}
                                        id={b.id}
                                        start={b.start}
                                        duration={b.duration}
                                        className="rounded-md border border-secondary bg-secondary"
                                    >
                                        <Timeline.Block.Move />
                                        <Timeline.Block.ResizeStart />
                                        <Timeline.Block.ResizeEnd />
                                        <div className="pointer-events-none relative flex h-full items-stretch gap-1.5 p-1">
                                            <span className="relative size-7 shrink-0 overflow-hidden rounded bg-tertiary">
                                                {thumb
                                                    ? <img src={thumb} alt="" className="size-full object-cover" />
                                                    : <span className="flex size-full items-center justify-center text-tertiary">{TYPE_ICON[cue.mediaItemType]}</span>}
                                            </span>
                                            <span className="flex min-w-0 flex-1 flex-col justify-center">
                                                <Label.xs className="truncate text-primary">{cue.mediaItemName}</Label.xs>
                                                <span title={estimated ? "Estimated — original length not measured yet" : undefined}>
                                                    <Paragraph.xs className={cn("font-mono", estimated ? "text-warning" : "text-tertiary")}>
                                                        {estimated ? "~" : ""}{tc(b.duration)}
                                                    </Paragraph.xs>
                                                </span>
                                            </span>
                                            <Timeline.Block.Remove className="pointer-events-auto absolute right-1 top-1 flex size-4 items-center justify-center rounded text-quaternary opacity-0 transition-colors hover:text-error group-hover:opacity-100">
                                                <X className="size-3" />
                                            </Timeline.Block.Remove>
                                        </div>
                                    </Timeline.Block>
                                )
                            })}
                        </Timeline.Lane>
                    ))}
                    <Timeline.Playhead />
                </Timeline.Canvas>
            </Timeline.Viewport>
        </>
    )
}


// Zoom controls live with the timeline (not the command bar) since they
// only act on the canvas. Reads the transport/zoom port from context.
function TimelineZoomControls() {
    const { updateZoomAnchoredToPlayhead } = useTimeline()

    const zoomOut = useCallback(() => updateZoomAnchoredToPlayhead("out"), [updateZoomAnchoredToPlayhead])
    const zoomIn = useCallback(() => updateZoomAnchoredToPlayhead("in"), [updateZoomAnchoredToPlayhead])

    return (
        <>
            <Button.Icon variant="ghost" icon={<ZoomOut />} onClick={zoomOut} aria-label="Zoom out" />
            <Button.Icon variant="ghost" icon={<ZoomIn />} onClick={zoomIn} aria-label="Zoom in" />
        </>
    )
}


// Program monitor — the **Program** (CONTEXT.md): the shared @moc/player
// compositor renders the picture (Lane 01 frontmost, alpha-composited);
// this only owns the editor chrome — the framed black "hardware" box, the
// No-signal state, and the audio-lane badges. Preview is muted (ADR-0005:
// audio policy is per-app chrome). The screen is black in any theme so
// on-screen text is light.
function ProgramMonitor({
    programLanes, transport, urlById,
}: {
    programLanes: ResolvedLane[]
    transport: TimelineTransport
    urlById: Map<string, string>
}) {
    const active = useActiveBlocks()
    const audioCues = active.filter(({ lane, block }) => lane.type === "audio" && block)
    const hasSignal = active.some(({ block }) => block)

    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 m-auto aspect-video max-h-full max-w-full overflow-hidden rounded-md bg-black">
                <ProgramCompositor
                    lanes={programLanes}
                    transport={transport}
                    resolveUrl={(id) => urlById.get(id)}
                    muted
                    className="absolute inset-0"
                />

                <div className="pointer-events-none absolute inset-0 z-[100]">
                    {!hasSignal && (
                        <div className="absolute inset-0 grid place-items-center">
                            <span className="text-xs text-white/35">No signal</span>
                        </div>
                    )}

                    {audioCues.length > 0 && (
                        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5">
                            {audioCues.map(({ lane, block }) => (
                                <Badge
                                    key={lane.id}
                                    icon={<Music className="size-3 text-white/70" />}
                                    label={(block!.data as Cue).mediaItemName}
                                    className="rounded-full bg-black/60 px-2.5 py-1 ring-1 ring-white/15 *:!text-white/75"
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
