import type { ZoomConnection, ZoomConnectionStatus, ZoomMeeting } from "@moc/types/streams/zoom"
import { supabase } from "@moc/data/supabase"
import { fetchProviderRecords } from "@/lib/provider-records-api"
import { getCurrentWorkspaceId } from "./current-workspace"

type ZoomConnectionRow = {
  id: string
  workspace_id: string
  zoom_user_id: string
  email: string
  display_name: string
  connected_by: string
  created_at: string
  status: ZoomConnectionStatus
}

type ZoomMeetingRow = {
  id: string
  workspace_id: string
  zoom_meeting_id: number
  topic: string
  description: string
  meeting_type: ZoomMeeting["meetingType"]
  start_time: string | null
  duration: number
  timezone: string
  join_url: string | null
  password: string | null
  recurrence_type: ZoomMeeting["recurrenceType"]
  recurrence_interval: number | null
  recurrence_days: string | null
  waiting_room: boolean
  mute_on_entry: boolean
  continuous_chat: boolean
  created_by: string
  created_at: string
  updated_at: string
}

function mapConnectionRow(row: ZoomConnectionRow): ZoomConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    zoomUserId: row.zoom_user_id,
    email: row.email,
    displayName: row.display_name,
    connectedBy: row.connected_by,
    createdAt: row.created_at,
    status: row.status,
  }
}

function mapMeetingRow(row: ZoomMeetingRow): ZoomMeeting {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    zoomMeetingId: row.zoom_meeting_id,
    topic: row.topic,
    description: row.description,
    meetingType: row.meeting_type,
    startTime: row.start_time,
    duration: row.duration,
    timezone: row.timezone,
    joinUrl: row.join_url,
    password: row.password,
    recurrenceType: row.recurrence_type,
    recurrenceInterval: row.recurrence_interval,
    recurrenceDays: row.recurrence_days,
    waitingRoom: row.waiting_room,
    muteOnEntry: row.mute_on_entry,
    continuousChat: row.continuous_chat,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchZoomConnection(workspaceId?: string): Promise<ZoomConnection | null> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("zoom_connections")
    .select("id, workspace_id, zoom_user_id, email, display_name, connected_by, created_at, status")
    .eq("workspace_id", resolvedWorkspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapConnectionRow(data as ZoomConnectionRow) : null
}

export async function fetchZoomConnectionId(workspaceId?: string): Promise<string> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("zoom_connections")
    .select("id")
    .eq("workspace_id", resolvedWorkspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error("Zoom is not connected for this workspace")
  }

  return (data as { id: string }).id
}

export async function fetchZoomMeetings(workspaceId?: string): Promise<ZoomMeeting[]> {
  const rows = await fetchProviderRecords<ZoomMeetingRow>("zoom-meetings", { workspaceId })
  return rows.map(mapMeetingRow)
}

export async function fetchZoomMeetingById(id: string, workspaceId?: string): Promise<ZoomMeeting | undefined> {
  const [row] = await fetchProviderRecords<ZoomMeetingRow>("zoom-meetings", { id, workspaceId })
  return row ? mapMeetingRow(row) : undefined
}
