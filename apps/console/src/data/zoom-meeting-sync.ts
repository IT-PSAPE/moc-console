import type { ZoomMeeting, ZoomMeetingType } from "@moc/types/streams/zoom"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { zoomApiFetch } from "@/lib/zoom-client"
import { parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"
import { providerRequestError } from "@/lib/provider-request-error"
import { notifyMeetingCreated } from "./notify-event"
import { getZoomMeetingsToVerify, isCurrentOrUpcomingMeeting, type ZoomMeetingReconciliationRow } from "./zoom-meeting-reconciliation"
import { queueZoomMeetingOperation } from "./zoom-meeting-operation-queue"
import { fetchZoomConnectionId, fetchZoomMeetings } from "./fetch-zoom"

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

type ZoomMeetingLookup =
  | { status: "present"; meeting: ZoomMeetingSyncRow }
  | { status: "absent" }
  | { status: "unknown" }

/**
 * Asks Zoom about one meeting directly, so a meeting missing from the upcoming
 * list can be told apart from a meeting that no longer exists.
 *
 * Only the proxy's `provider_not_found` counts as gone — the code it returns
 * when Zoom itself says the meeting does not exist. Everything else is
 * `unknown`, and an unknown answer changes nothing locally: an outage, an
 * expired token or a bad deployment must never be read as a cancellation, or a
 * sync would delete the workspace's meetings.
 */
async function lookUpZoomMeeting(zoomMeetingId: number): Promise<ZoomMeetingLookup> {
  const response = await zoomApiFetch(`/meetings/${zoomMeetingId}`)
  if (response.ok) {
    return { status: "present", meeting: await response.json() as ZoomMeetingSyncRow }
  }

  const error = await providerRequestError(response, "Failed to read the Zoom meeting")
  return error.isMissingUpstream ? { status: "absent" } : { status: "unknown" }
}

function toUpsertRow(meeting: ZoomMeetingSyncRow, workspaceId: string, zoomConnectionId: string, createdBy: string) {
  return {
    workspace_id: workspaceId,
    zoom_connection_id: zoomConnectionId,
    zoom_meeting_id: meeting.id,
    topic: meeting.topic ?? "Untitled",
    description: meeting.agenda ?? "",
    meeting_type: (meeting.type === 8 ? "recurring_fixed" : "scheduled") as ZoomMeetingType,
    start_time: normalizeZoomStartTime(meeting.start_time ?? null, meeting.timezone ?? "UTC"),
    duration: meeting.duration ?? 60,
    timezone: meeting.timezone ?? "UTC",
    join_url: meeting.join_url ?? null,
    created_by: createdBy,
  }
}

type ZoomMeetingUpsertRow = ReturnType<typeof toUpsertRow>

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

  const existingMeetings = await fetchZoomMeetings(workspaceId)
  const localMeetings: Array<ZoomMeetingReconciliationRow & { created_by: string }> = existingMeetings.map((meeting) => ({
    created_by: meeting.createdBy,
    id: meeting.id,
    recurrence_type: meeting.recurrenceType,
    start_time: meeting.startTime,
    zoom_meeting_id: meeting.zoomMeetingId,
  }))
  const existingCreators = new Map(localMeetings.map((row) => [row.zoom_meeting_id, row.created_by]))

  // Each meeting that fell out of the upcoming list is confirmed by id: only a
  // meeting Zoom says is gone is deleted locally, and one that still exists is
  // reconciled from its own record instead.
  const cancelledMeetingIds: string[] = []
  const verifiedMeetings: ZoomMeetingSyncRow[] = []
  for (const target of getZoomMeetingsToVerify(localMeetings, meetings.map((meeting) => meeting.id))) {
    const lookup = await lookUpZoomMeeting(target.zoomMeetingId)
    if (lookup.status === "absent") cancelledMeetingIds.push(target.id)
    else if (lookup.status === "present") verifiedMeetings.push(lookup.meeting)
  }

  const now = new Date()
  // Keyed by Zoom meeting id: one upsert may not touch the same row twice.
  const payloads = new Map<number, ZoomMeetingUpsertRow>()
  const adoptedMeetingIds = new Set<number>()
  for (const meeting of [...meetings, ...verifiedMeetings]) {
    const row = toUpsertRow(meeting, workspaceId, zoomConnectionId, existingCreators.get(meeting.id) ?? user.id)
    // A meeting we already track is always reconciled. One we do not track is
    // only taken on while its slot is still ahead of us.
    if (existingCreators.has(meeting.id)) {
      payloads.set(meeting.id, row)
    } else if (isCurrentOrUpcomingMeeting(row, now)) {
      payloads.set(meeting.id, row)
      adoptedMeetingIds.add(meeting.id)
    }
  }
  if (payloads.size > 0) {
    const { error } = await supabase.from("zoom_meetings").upsert([...payloads.values()], { onConflict: "workspace_id,zoom_meeting_id" })
    if (error) throw new Error(error.message)
  }
  if (cancelledMeetingIds.length > 0) {
    const { error } = await supabase
      .from("zoom_meetings")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", cancelledMeetingIds)
    if (error) throw new Error(error.message)
  }

  const syncedMeetings = await fetchZoomMeetings(workspaceId)
  // Only meetings first adopted by this sync are announced. Existing meetings
  // never enter adoptedMeetingIds, so a later sync cannot resend the backlog.
  for (const meeting of syncedMeetings) {
    if (adoptedMeetingIds.has(meeting.zoomMeetingId)) void notifyMeetingCreated(meeting.id)
  }
  return syncedMeetings
}
