import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"

export type StreamListEntry =
  | { id: string; provider: "youtube"; scheduledAt: string | null; stream: Stream }
  | { id: string; provider: "zoom"; scheduledAt: string | null; meeting: ZoomMeeting }

export function createStreamListEntries(streams: Stream[], meetings: ZoomMeeting[]): StreamListEntry[] {
  const entries: StreamListEntry[] = [
    ...streams.map((stream) => ({ id: `youtube-${stream.id}`, provider: "youtube" as const, scheduledAt: stream.scheduledStartTime, stream })),
    ...meetings.map((meeting) => ({ id: `zoom-${meeting.id}`, provider: "zoom" as const, scheduledAt: meeting.startTime, meeting })),
  ]

  return entries.sort((a, b) => {
    const parsedA = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.NaN
    const parsedB = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.NaN
    const aTime = Number.isNaN(parsedA) ? Number.POSITIVE_INFINITY : parsedA
    const bTime = Number.isNaN(parsedB) ? Number.POSITIVE_INFINITY : parsedB
    return aTime - bTime
  })
}
