import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/broadcast/zoom"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { zoomApiFetch, revokeZoomToken } from "@/lib/zoom-client"
import { fetchZoomMeetingById } from "./fetch-zoom"
import { formatUtcIsoForZoomApi, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"
import { randomId } from "@moc/utils/random-id"
import { notifyMeetingCreated } from "./notify-event"

export type CreateMeetingParams = {
  topic: string
  description: string
  startTime: string
  duration: number
  timezone: string
  recurrenceType: ZoomRecurrenceType
  recurrenceInterval: number | null
  recurrenceDays: string | null
  waitingRoom: boolean
  muteOnEntry: boolean
  continuousChat: boolean
}

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

type LocalZoomMeetingInsertPayload = {
  id?: string
  workspace_id: string
  zoom_meeting_id: number
  topic: string
  description: string
  meeting_type: ZoomMeeting["meetingType"]
  start_time: string | null
  duration: number
  timezone: string
  join_url: string | null
  start_url?: string | null
  password?: string | null
  recurrence_type: ZoomRecurrenceType
  recurrence_interval: number | null
  recurrence_days: string | null
  waiting_room: boolean
  mute_on_entry: boolean
  continuous_chat: boolean
  created_by: string
}

async function insertLocalZoomMeeting(payload: LocalZoomMeetingInsertPayload): Promise<void> {
  const { error } = await supabase.from("zoom_meetings").insert(payload)

  if (error) {
    throw new Error(error.message)
  }
}

function mapRecurrenceToZoomApi(params: CreateMeetingParams) {
  if (params.recurrenceType === "none") return undefined

  const typeMap = { daily: 1, weekly: 2, monthly: 3 } as const
  const recurrence: Record<string, unknown> = {
    type: typeMap[params.recurrenceType as keyof typeof typeMap],
    repeat_interval: params.recurrenceInterval ?? 1,
  }

  if (params.recurrenceType === "weekly" && params.recurrenceDays) {
    recurrence.weekly_days = params.recurrenceDays
  }

  if (params.recurrenceType === "monthly" && params.recurrenceDays) {
    recurrence.monthly_day = parseInt(params.recurrenceDays, 10)
  }

  return recurrence
}

function getMeetingType(recurrenceType: ZoomRecurrenceType): number {
  if (recurrenceType === "none") return 2 // scheduled
  return 8 // recurring with fixed time
}

function normalizeZoomStartTime(startTime: string | null, timezone: string): string | null {
  if (!startTime) return null

  if (/z$/i.test(startTime) || /[+-]\d{2}:\d{2}$/.test(startTime)) {
    return new Date(startTime).toISOString()
  }

  return parseDateTimeInputToUtcIso(startTime.slice(0, 19), timezone)
}

export async function createZoomMeeting(params: CreateMeetingParams): Promise<ZoomMeeting> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const meetingType = getMeetingType(params.recurrenceType)
  const recurrence = mapRecurrenceToZoomApi(params)

  const body: Record<string, unknown> = {
    topic: params.topic,
    type: meetingType,
    start_time: formatUtcIsoForZoomApi(params.startTime, params.timezone),
    duration: params.duration,
    timezone: params.timezone,
    agenda: params.description,
    settings: {
      waiting_room: params.waitingRoom,
      mute_upon_entry: params.muteOnEntry,
      continuous_meeting_chat: { enable: params.continuousChat },
      join_before_host: false,
    },
  }

  if (recurrence) {
    body.recurrence = recurrence
  }

  const response = await zoomApiFetch("/users/me/meetings", {
    method: "POST",
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to create Zoom meeting: ${err}`)
  }

  const meeting = await response.json()

  // Store in local database
  const payload: LocalZoomMeetingInsertPayload = {
    id: randomId(),
    workspace_id: workspaceId,
    zoom_meeting_id: meeting.id,
    topic: params.topic,
    description: params.description,
    meeting_type: params.recurrenceType === "none" ? "scheduled" : "recurring_fixed",
    start_time: params.startTime,
    duration: params.duration,
    timezone: params.timezone,
    join_url: meeting.join_url ?? null,
    start_url: meeting.start_url ?? null,
    password: meeting.password ?? null,
    recurrence_type: params.recurrenceType,
    recurrence_interval: params.recurrenceInterval,
    recurrence_days: params.recurrenceDays,
    waiting_room: params.waitingRoom,
    mute_on_entry: params.muteOnEntry,
    continuous_chat: params.continuousChat,
    created_by: user.id,
  }
  const localMeetingId = payload.id

  try {
    await insertLocalZoomMeeting(payload)
  } catch (error) {
    const rollbackResponse = await zoomApiFetch(`/meetings/${meeting.id}`, {
      method: "DELETE",
    })

    if (!rollbackResponse.ok && rollbackResponse.status !== 204) {
      throw new Error(`Local meeting save failed after Zoom creation, and rollback also failed: ${await rollbackResponse.text()}`)
    }

    throw error
  }

  if (!localMeetingId) {
    throw new Error("Created meeting payload is missing a local id")
  }

  const saved = await fetchZoomMeetingById(localMeetingId)

  if (!saved) {
    throw new Error("Created meeting could not be reloaded")
  }

  notifyMeetingCreated(saved.id)

  return saved
}

export async function updateZoomMeeting(meeting: ZoomMeeting): Promise<ZoomMeeting> {
  const recurrence = mapRecurrenceToZoomApi({
    topic: meeting.topic,
    description: meeting.description,
    startTime: meeting.startTime ?? new Date().toISOString(),
    duration: meeting.duration,
    timezone: meeting.timezone,
    recurrenceType: meeting.recurrenceType,
    recurrenceInterval: meeting.recurrenceInterval,
    recurrenceDays: meeting.recurrenceDays,
    waitingRoom: meeting.waitingRoom,
    muteOnEntry: meeting.muteOnEntry,
    continuousChat: meeting.continuousChat,
  })

  const body: Record<string, unknown> = {
    topic: meeting.topic,
    start_time: meeting.startTime ? formatUtcIsoForZoomApi(meeting.startTime, meeting.timezone) : null,
    duration: meeting.duration,
    timezone: meeting.timezone,
    agenda: meeting.description,
    settings: {
      waiting_room: meeting.waitingRoom,
      mute_upon_entry: meeting.muteOnEntry,
      continuous_meeting_chat: { enable: meeting.continuousChat },
    },
  }

  if (recurrence) {
    body.recurrence = recurrence
  }

  const response = await zoomApiFetch(`/meetings/${meeting.zoomMeetingId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to update Zoom meeting: ${err}`)
  }

  const { error } = await supabase
    .from("zoom_meetings")
    .update({
      topic: meeting.topic,
      description: meeting.description,
      start_time: meeting.startTime,
      duration: meeting.duration,
      timezone: meeting.timezone,
      recurrence_type: meeting.recurrenceType,
      recurrence_interval: meeting.recurrenceInterval,
      recurrence_days: meeting.recurrenceDays,
      waiting_room: meeting.waitingRoom,
      mute_on_entry: meeting.muteOnEntry,
      continuous_chat: meeting.continuousChat,
    })
    .eq("id", meeting.id)

  if (error) {
    throw new Error(error.message)
  }

  const saved = await fetchZoomMeetingById(meeting.id)

  if (!saved) {
    throw new Error("Updated meeting could not be reloaded")
  }

  return saved
}

export async function deleteZoomMeeting(meeting: ZoomMeeting): Promise<void> {
  // Delete remote first: a failure here just throws, leaving the local row
  // intact. If we deleted locally first and the remote call failed, a rollback
  // could itself fail and leave the two systems permanently out of sync.
  const response = await zoomApiFetch(`/meetings/${meeting.zoomMeetingId}`, {
    method: "DELETE",
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete Zoom meeting: ${await response.text()}`)
  }

  const { error } = await supabase
    .from("zoom_meetings")
    .delete()
    .eq("id", meeting.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncZoomMeetings(): Promise<ZoomMeeting[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const [upcomingRes, previousRes] = await Promise.all([
    zoomApiFetch("/users/me/meetings?type=upcoming&page_size=300"),
    zoomApiFetch("/users/me/meetings?type=previous_meetings&page_size=300"),
  ])

  if (!upcomingRes.ok) {
    throw new Error(`Failed to fetch Zoom meetings: ${await upcomingRes.text()}`)
  }
  if (!previousRes.ok) {
    throw new Error(`Failed to fetch Zoom meetings: ${await previousRes.text()}`)
  }

  const upcomingData = await upcomingRes.json() as { meetings?: ZoomMeetingSyncRow[] }
  const previousData = await previousRes.json() as { meetings?: ZoomMeetingSyncRow[] }
  const byId = new Map<number, ZoomMeetingSyncRow>()
  for (const m of upcomingData.meetings ?? []) byId.set(m.id, m)
  for (const m of previousData.meetings ?? []) if (!byId.has(m.id)) byId.set(m.id, m)
  const meetings = Array.from(byId.values())

  for (const m of meetings) {
    const payload = {
      workspace_id: workspaceId,
      zoom_meeting_id: m.id,
      topic: m.topic ?? "Untitled",
      description: m.agenda ?? "",
      meeting_type: m.type === 8 ? "recurring_fixed" : "scheduled",
      start_time: normalizeZoomStartTime(m.start_time ?? null, m.timezone ?? "UTC"),
      duration: m.duration ?? 60,
      timezone: m.timezone ?? "UTC",
      join_url: m.join_url ?? null,
      created_by: user.id,
    }

    const { error } = await supabase
      .from("zoom_meetings")
      .upsert(payload, { onConflict: "workspace_id,zoom_meeting_id" })

    if (error) {
      throw new Error(error.message)
    }
  }

  const remoteIds = Array.from(byId.keys())
  let deleteQuery = supabase
    .from("zoom_meetings")
    .delete()
    .eq("workspace_id", workspaceId)
  if (remoteIds.length > 0) {
    deleteQuery = deleteQuery.not("zoom_meeting_id", "in", `(${remoteIds.join(",")})`)
  }
  const { error: deleteError } = await deleteQuery
  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const { data: rows, error } = await supabase
    .from("zoom_meetings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(error.message)
  }

  // Fire-and-forget notify for any rows that have never been notified.
  // The server atomically claims notified_at, so concurrent syncs are safe.
  for (const row of rows ?? []) {
    if (!row.notified_at) notifyMeetingCreated(row.id)
  }

  return (rows ?? []).map((row) => ({
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
  }))
}

export async function disconnectZoom(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()

  const { data: connection } = await supabase
    .from("zoom_connections")
    .select("id, access_token")
    .eq("workspace_id", workspaceId)
    .single()

  if (connection) {
    await revokeZoomToken(connection.access_token)

    await supabase
      .from("zoom_connections")
      .delete()
      .eq("id", connection.id)
  }
}
