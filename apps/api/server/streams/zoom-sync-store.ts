import { announceMeetingCreated } from "../notifications/created-announcement.js"
import { queryRows, withActor } from "@moc/backend/database"
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

type AdoptedMeetingSqlRow = Omit<AdoptedMeetingRow, "zoom_meeting_id"> & { zoom_meeting_id: string | number }
type TrackedMeetingSqlRow = Omit<TrackedMeetingRow, "zoom_meeting_id"> & { zoom_meeting_id: string | number }

function parseZoomMeetingId(value: string | number): number {
  const zoomMeetingId = Number(value)
  if (!Number.isSafeInteger(zoomMeetingId)) throw new Error("Zoom meeting id is outside the supported integer range")
  return zoomMeetingId
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
    if (meetingRowIds.length === 0) return
    await queryRows("DELETE FROM public.zoom_meetings WHERE workspace_id=$1 AND id=ANY($2::uuid[])", [workspaceId, meetingRowIds])
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
    if (zoomMeetingIds.length === 0) return []
    const rows = await queryRows<AdoptedMeetingSqlRow & import("pg").QueryResultRow>(
      "SELECT id,zoom_meeting_id,topic,start_time,join_url,notified_at FROM public.zoom_meetings WHERE workspace_id=$1 AND zoom_meeting_id=ANY($2::bigint[])",
      [workspaceId, zoomMeetingIds],
    )
    return rows.map((row) => ({
      id: row.id,
      zoom_meeting_id: parseZoomMeetingId(row.zoom_meeting_id),
      topic: row.topic,
      start_time: row.start_time,
      join_url: row.join_url,
      notified_at: row.notified_at,
    }))
  },
  readTrackedMeetings: async (workspaceId) => {
    const rows = await queryRows<TrackedMeetingSqlRow & import("pg").QueryResultRow>(
      "SELECT id,zoom_meeting_id,recurrence_type,start_time,created_by FROM public.zoom_meetings WHERE workspace_id=$1", [workspaceId],
    )
    return rows.map((row) => ({
      id: row.id,
      zoom_meeting_id: parseZoomMeetingId(row.zoom_meeting_id),
      recurrence_type: row.recurrence_type,
      start_time: row.start_time,
      created_by: row.created_by,
    }))
  },
  upsertMeetings: async (rows) => {
    if (rows.length === 0) return
    await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
      for (const row of rows) {
        await client.query(
          `INSERT INTO public.zoom_meetings(workspace_id,zoom_connection_id,zoom_meeting_id,topic,description,meeting_type,start_time,
            duration,timezone,join_url,created_by)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT(workspace_id,zoom_meeting_id) DO UPDATE SET zoom_connection_id=EXCLUDED.zoom_connection_id,
            topic=EXCLUDED.topic,description=EXCLUDED.description,meeting_type=EXCLUDED.meeting_type,start_time=EXCLUDED.start_time,
            duration=EXCLUDED.duration,timezone=EXCLUDED.timezone,join_url=EXCLUDED.join_url,updated_at=now()`,
          [row.workspace_id, row.zoom_connection_id, row.zoom_meeting_id, row.topic, row.description, row.meeting_type,
            row.start_time, row.duration, row.timezone, row.join_url, row.created_by],
        )
      }
    })
  },
}
