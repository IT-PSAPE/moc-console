import type { ZoomConnection, ZoomMeeting } from "@/types/broadcast/zoom"
import { supabase } from "@/lib/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"

type ZoomConnectionRow = {
  id: string
  workspace_id: string
  zoom_user_id: string
  email: string
  display_name: string
  connected_by: string
  created_at: string
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
  start_url: string | null
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
    startUrl: row.start_url,
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

const MEETING_COLUMNS =
  "id, workspace_id, zoom_meeting_id, topic, description, meeting_type, start_time, duration, timezone, join_url, start_url, password, recurrence_type, recurrence_interval, recurrence_days, waiting_room, mute_on_entry, continuous_chat, created_by, created_at, updated_at"

export async function fetchZoomConnection(): Promise<ZoomConnection | null> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("zoom_connections")
    .select("id, workspace_id, zoom_user_id, email, display_name, connected_by, created_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapConnectionRow(data as ZoomConnectionRow) : null
}

export async function fetchZoomMeetings(): Promise<ZoomMeeting[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("zoom_meetings")
    .select(MEETING_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ZoomMeetingRow[]).map(mapMeetingRow)
}

export async function fetchZoomMeetingById(id: string): Promise<ZoomMeeting | undefined> {
  const { data, error } = await supabase
    .from("zoom_meetings")
    .select(MEETING_COLUMNS)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapMeetingRow(data as ZoomMeetingRow) : undefined
}
