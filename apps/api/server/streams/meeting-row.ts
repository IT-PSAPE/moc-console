import { type ZoomMeetingType } from "./meeting-reconciliation.js"
import { normalizeZoomStartTime } from "./zoom-start-time.js"

/** Mirrors the response shape used by apps/console/src/data/zoom-meeting-sync.ts. */
export type ZoomMeetingSyncRow = {
  id: number
  topic?: string
  agenda?: string
  type?: number
  start_time?: string | null
  duration?: number
  timezone?: string
  join_url?: string | null
}

export type ZoomMeetingUpsertRow = {
  workspace_id: string
  zoom_connection_id: string
  zoom_meeting_id: number
  topic: string
  description: string
  meeting_type: ZoomMeetingType
  start_time: string | null
  duration: number
  timezone: string
  join_url: string | null
  created_by: string
}

/**
 * Fields are named one by one rather than spread, so Zoom's host-only
 * `start_url` can never reach the database. `password`, `recurrence_*`,
 * `waiting_room`, `mute_on_entry` and `continuous_chat` are also deliberately
 * absent: those are set from the console and must survive a reconcile.
 */
export function toZoomMeetingUpsertRow(
  meeting: ZoomMeetingSyncRow,
  workspaceId: string,
  zoomConnectionId: string,
  createdBy: string,
): ZoomMeetingUpsertRow {
  const timezone = meeting.timezone ?? "UTC"
  return {
    workspace_id: workspaceId,
    zoom_connection_id: zoomConnectionId,
    zoom_meeting_id: meeting.id,
    topic: meeting.topic ?? "Untitled",
    description: meeting.agenda ?? "",
    meeting_type: meeting.type === 8 ? "recurring_fixed" : "scheduled",
    start_time: normalizeZoomStartTime(meeting.start_time ?? null, timezone),
    duration: meeting.duration ?? 60,
    timezone,
    join_url: meeting.join_url ?? null,
    created_by: createdBy,
  }
}
