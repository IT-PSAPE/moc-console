import type { ZoomMeeting, ZoomRecurrenceType } from "@moc/types/streams/zoom"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { zoomApiFetch, revokeZoomToken } from "@/lib/zoom-client"
import { fetchZoomMeetingById } from "./fetch-zoom"
import { formatUtcIsoForZoomApi } from "@moc/utils/zoned-date-time"
import { randomId } from "@moc/utils/random-id"
import { notifyMeetingCreated } from "./notify-event"
import type { NotifyDestination } from "@moc/types/streams"
import { providerRequestError } from "@/lib/provider-request-error"
import { syncZoomMeetings as syncMeetings } from "./zoom-meeting-sync"

export { syncZoomMeetings } from "./zoom-meeting-sync"

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
  // Optional per-meeting override of the Telegram notification destination.
  notifyDestinations?: NotifyDestination[]
}

export type ZoomMeetingMutationResult = {
  meeting: ZoomMeeting
  reconciliationWarning: string | null
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

function mapLocalZoomMeetingPayload(payload: LocalZoomMeetingInsertPayload): ZoomMeeting {
  const timestamp = new Date().toISOString()

  return {
    id: payload.id ?? randomId(),
    workspaceId: payload.workspace_id,
    zoomMeetingId: payload.zoom_meeting_id,
    topic: payload.topic,
    description: payload.description,
    meetingType: payload.meeting_type,
    startTime: payload.start_time,
    duration: payload.duration,
    timezone: payload.timezone,
    joinUrl: payload.join_url,
    password: payload.password ?? null,
    recurrenceType: payload.recurrence_type,
    recurrenceInterval: payload.recurrence_interval,
    recurrenceDays: payload.recurrence_days,
    waitingRoom: payload.waiting_room,
    muteOnEntry: payload.mute_on_entry,
    continuousChat: payload.continuous_chat,
    createdBy: payload.created_by,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function getLocalZoomMeetingUpdate(meeting: ZoomMeeting) {
  return {
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
  }
}

async function persistLocalZoomMeetingUpdate(meetingId: string, values: ReturnType<typeof getLocalZoomMeetingUpdate>): Promise<void> {
  const { error } = await supabase.from("zoom_meetings").update(values).eq("id", meetingId)

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
    throw await providerRequestError(response, "Failed to create Zoom meeting")
  }

  const meeting = await response.json()

  // Store in local database
  const localMeetingId = randomId()
  const payload: LocalZoomMeetingInsertPayload = {
    id: localMeetingId,
    workspace_id: workspaceId,
    zoom_meeting_id: meeting.id,
    topic: params.topic,
    description: params.description,
    meeting_type: params.recurrenceType === "none" ? "scheduled" : "recurring_fixed",
    start_time: params.startTime,
    duration: params.duration,
    timezone: params.timezone,
    join_url: meeting.join_url ?? null,
    password: meeting.password ?? null,
    recurrence_type: params.recurrenceType,
    recurrence_interval: params.recurrenceInterval,
    recurrence_days: params.recurrenceDays,
    waiting_room: params.waitingRoom,
    mute_on_entry: params.muteOnEntry,
    continuous_chat: params.continuousChat,
    created_by: user.id,
  }
  try {
    await insertLocalZoomMeeting(payload)
  } catch (error) {
    // The browser can lose the response after Supabase has committed the row.
    // Treat an already-persisted client-generated ID as success rather than
    // deleting the provider meeting and encouraging a duplicate retry.
    const persisted = await fetchZoomMeetingById(localMeetingId).catch(() => undefined)
    if (persisted) {
      await notifyMeetingCreated(persisted.id, params.notifyDestinations).catch(() => undefined)
      return persisted
    }

    const rollbackResponse = await zoomApiFetch(`/meetings/${meeting.id}`, {
      method: "DELETE",
    })

    if (!rollbackResponse.ok && rollbackResponse.status !== 204 && rollbackResponse.status !== 404) {
      const rollbackError = await providerRequestError(rollbackResponse, "Zoom meeting was created, but the local record could not be saved and cleanup failed")
      throw rollbackError
    }

    throw error
  }

  // A successful insert is the durable create boundary. Do not turn a
  // follow-up read problem into a failed-create message that causes retries.
  const saved = await fetchZoomMeetingById(localMeetingId).catch(() => undefined) ?? mapLocalZoomMeetingPayload(payload)

  await notifyMeetingCreated(saved.id, params.notifyDestinations).catch(() => undefined)

  return saved
}

export async function updateZoomMeeting(meeting: ZoomMeeting): Promise<ZoomMeetingMutationResult> {
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
    throw await providerRequestError(response, "Failed to update Zoom meeting")
  }

  const localValues = getLocalZoomMeetingUpdate(meeting)

  try {
    await persistLocalZoomMeetingUpdate(meeting.id, localValues)
  } catch {
    // Zoom has already accepted the update. Re-sync its canonical meeting and
    // retry local persistence once before asking the user to reconcile later.
    try {
      await syncMeetings()
      await persistLocalZoomMeetingUpdate(meeting.id, localValues)
    } catch {
      return {
        meeting,
        reconciliationWarning: "Zoom was updated, but the local record could not be saved. Refresh meetings later to reconcile the change.",
      }
    }
  }

  const saved = await fetchZoomMeetingById(meeting.id).catch(() => undefined) ?? meeting

  return { meeting: saved, reconciliationWarning: null }
}

export async function deleteZoomMeeting(meeting: ZoomMeeting): Promise<void> {
  // Delete remote first: a failure here just throws, leaving the local row
  // intact. If we deleted locally first and the remote call failed, a rollback
  // could itself fail and leave the two systems permanently out of sync.
  const response = await zoomApiFetch(`/meetings/${meeting.zoomMeetingId}`, {
    method: "DELETE",
  })

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    throw await providerRequestError(response, "Failed to delete Zoom meeting")
  }

  const { error } = await supabase
    .from("zoom_meetings")
    .delete()
    .eq("id", meeting.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteLocalZoomMeetingRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("zoom_meetings")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function disconnectZoom(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  await revokeZoomToken(workspaceId)
}
