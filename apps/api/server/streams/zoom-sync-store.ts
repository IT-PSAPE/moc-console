import { announceMeetingCreated } from "../notifications/created-announcement.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
import { proxyZoomApiRequest } from "../zoom-api.js"
import type { ZoomMeetingReconciliationRow } from "./meeting-reconciliation.js"
import type { ZoomMeetingSyncRow, ZoomMeetingUpsertRow } from "./meeting-row.js"

export type TrackedMeetingRow = ZoomMeetingReconciliationRow & { created_by: string }

export type AdoptedMeetingRow = {
  id: string
  join_url: string | null
  notified_at: string | null
  start_time: string | null
  topic: string
  zoom_meeting_id: number
}

export type ZoomSyncDependencies = {
  announceMeeting: (workspaceId: string, row: AdoptedMeetingRow) => Promise<void>
  deleteMeetings: (workspaceId: string, meetingRowIds: string[]) => Promise<void>
  fetchUpcomingMeetings: (workspaceId: string) => Promise<ZoomMeetingSyncRow[]>
  lookUpMeeting: (workspaceId: string, zoomMeetingId: number) => Promise<ZoomMeetingSyncRow>
  now: () => Date
  readAdoptedMeetings: (workspaceId: string, zoomMeetingIds: number[]) => Promise<AdoptedMeetingRow[]>
  readTrackedMeetings: (workspaceId: string) => Promise<TrackedMeetingRow[]>
  upsertMeetings: (rows: ZoomMeetingUpsertRow[]) => Promise<void>
}

async function fetchUpcomingMeetings(workspaceId: string): Promise<ZoomMeetingSyncRow[]> {
  const meetings: ZoomMeetingSyncRow[] = []
  let pageToken: string | undefined
  do {
    const pageParam = pageToken ? `&next_page_token=${encodeURIComponent(pageToken)}` : ""
    const response = await proxyZoomApiRequest({
      method: "GET",
      path: `/users/me/meetings?type=upcoming&page_size=300${pageParam}`,
      workspaceId,
    })
    const data = await response.json() as { meetings?: ZoomMeetingSyncRow[]; next_page_token?: string }
    meetings.push(...(data.meetings ?? []))
    pageToken = data.next_page_token
  } while (pageToken)
  return meetings
}

export const zoomSyncStore: ZoomSyncDependencies = {
  announceMeeting: async (workspaceId, row) => {
    await announceMeetingCreated({
      workspaceId,
      meetingId: row.id,
      topic: row.topic,
      startTime: row.start_time,
      joinUrl: row.join_url,
    })
  },
  deleteMeetings: async (workspaceId, meetingRowIds) => {
    const { error } = await getSupabaseAdmin()
      .from("zoom_meetings")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", meetingRowIds)
    if (error) throw new Error(error.message)
  },
  fetchUpcomingMeetings,
  // Throws ProviderUpstreamError("not_found") only when Zoom itself names the
  // meeting as gone, which is the sync's sole authority to delete a local row.
  lookUpMeeting: async (workspaceId, zoomMeetingId) => {
    const response = await proxyZoomApiRequest({ method: "GET", path: `/meetings/${zoomMeetingId}`, workspaceId })
    return await response.json() as ZoomMeetingSyncRow
  },
  now: () => new Date(),
  readAdoptedMeetings: async (workspaceId, zoomMeetingIds) => {
    const { data, error } = await getSupabaseAdmin()
      .from("zoom_meetings")
      .select("id, zoom_meeting_id, topic, start_time, join_url, notified_at")
      .eq("workspace_id", workspaceId)
      .in("zoom_meeting_id", zoomMeetingIds)
    if (error) throw new Error(error.message)
    return (data ?? []) as AdoptedMeetingRow[]
  },
  readTrackedMeetings: async (workspaceId) => {
    const { data, error } = await getSupabaseAdmin()
      .from("zoom_meetings")
      .select("id, zoom_meeting_id, recurrence_type, start_time, created_by")
      .eq("workspace_id", workspaceId)
    if (error) throw new Error(error.message)
    return (data ?? []) as TrackedMeetingRow[]
  },
  upsertMeetings: async (rows) => {
    const { error } = await getSupabaseAdmin()
      .from("zoom_meetings")
      .upsert(rows, { onConflict: "workspace_id,zoom_meeting_id" })
    if (error) throw new Error(error.message)
  },
}
