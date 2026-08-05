import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { zoomApiFetch } from "@/lib/zoom-client"
import { parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"
import { providerRequestError } from "@/lib/provider-request-error"
import { notifyMeetingCreated } from "./notify-event"
import { getAbsentActiveZoomMeetingIds, type ZoomMeetingReconciliationRow } from "./zoom-meeting-reconciliation"
import { queueZoomMeetingOperation } from "./zoom-meeting-operation-queue"
import { fetchZoomConnectionId } from "./fetch-zoom"

type ZoomMeetingSyncRow = {
  id: number
  topic?: string
  agenda?: string
  type?: number
  start_time?: string | null
  duration?: number
  timezone?: string
  join_url?: string | null
}

function normalizeZoomStartTime(startTime: string | null, timezone: string): string | null {
  if (!startTime) return null
  if (/z$/i.test(startTime) || /[+-]\d{2}:\d{2}$/.test(startTime)) return new Date(startTime).toISOString()
  return parseDateTimeInputToUtcIso(startTime.slice(0, 19), timezone)
}

export async function syncZoomMeetings(): Promise<ZoomMeeting[]> {
  const workspaceId = await getCurrentWorkspaceId()
  return queueZoomMeetingOperation(workspaceId, () => syncZoomMeetingsWithinOperation(workspaceId))
}

export async function syncZoomMeetingsWithinOperation(workspaceId: string): Promise<ZoomMeeting[]> {
  const zoomConnectionId = await fetchZoomConnectionId(workspaceId)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const meetings: ZoomMeetingSyncRow[] = []
  let pageToken: string | undefined
  do {
    const pageParam = pageToken ? `&next_page_token=${encodeURIComponent(pageToken)}` : ""
    const response = await zoomApiFetch(`/users/me/meetings?type=upcoming&page_size=300${pageParam}`)
    if (!response.ok) throw await providerRequestError(response, "Failed to fetch Zoom meetings")
    const data = await response.json() as { meetings?: ZoomMeetingSyncRow[]; next_page_token?: string }
    meetings.push(...(data.meetings ?? []))
    pageToken = data.next_page_token
  } while (pageToken)

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("zoom_meetings")
    .select("id, zoom_meeting_id, recurrence_type, start_time, created_by")
    .eq("workspace_id", workspaceId)
  if (existingRowsError) throw new Error(existingRowsError.message)
  const localMeetings = (existingRows ?? []) as Array<ZoomMeetingReconciliationRow & { created_by: string }>
  const existingCreators = new Map(localMeetings.map((row) => [row.zoom_meeting_id, row.created_by]))
  const absentActiveMeetingIds = getAbsentActiveZoomMeetingIds(localMeetings, meetings.map((meeting) => meeting.id))
  const payloads = meetings.map((meeting) => ({
    workspace_id: workspaceId,
    zoom_connection_id: zoomConnectionId,
    zoom_meeting_id: meeting.id,
    topic: meeting.topic ?? "Untitled",
    description: meeting.agenda ?? "",
    meeting_type: meeting.type === 8 ? "recurring_fixed" : "scheduled",
    start_time: normalizeZoomStartTime(meeting.start_time ?? null, meeting.timezone ?? "UTC"),
    duration: meeting.duration ?? 60,
    timezone: meeting.timezone ?? "UTC",
    join_url: meeting.join_url ?? null,
    created_by: existingCreators.get(meeting.id) ?? user.id,
  }))
  if (payloads.length > 0) {
    const { error } = await supabase.from("zoom_meetings").upsert(payloads, { onConflict: "workspace_id,zoom_meeting_id" })
    if (error) throw new Error(error.message)
  }
  if (absentActiveMeetingIds.length > 0) {
    const { error } = await supabase
      .from("zoom_meetings")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", absentActiveMeetingIds)
    if (error) throw new Error(error.message)
  }

  const { data: rows, error } = await supabase
    .from("zoom_meetings")
    .select("id, workspace_id, zoom_meeting_id, topic, description, meeting_type, start_time, duration, timezone, join_url, password, recurrence_type, recurrence_interval, recurrence_days, waiting_room, mute_on_entry, continuous_chat, created_by, created_at, updated_at, notified_at")
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  for (const row of rows ?? []) if (!row.notified_at) void notifyMeetingCreated(row.id)
  return (rows ?? []).map((row) => ({
    id: row.id, workspaceId: row.workspace_id, zoomMeetingId: row.zoom_meeting_id, topic: row.topic, description: row.description,
    meetingType: row.meeting_type, startTime: row.start_time, duration: row.duration, timezone: row.timezone, joinUrl: row.join_url,
    password: row.password, recurrenceType: row.recurrence_type, recurrenceInterval: row.recurrence_interval,
    recurrenceDays: row.recurrence_days, waitingRoom: row.waiting_room, muteOnEntry: row.mute_on_entry, continuousChat: row.continuous_chat,
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  }))
}
