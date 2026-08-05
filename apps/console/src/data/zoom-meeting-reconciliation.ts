import type { ZoomRecurrenceType } from "@moc/types/streams/zoom"
import type { Role } from "@moc/types/requests/assignee"

export type ZoomMeetingReconciliationRow = {
  id: string
  zoom_meeting_id: number
  recurrence_type: ZoomRecurrenceType
  start_time: string | null
}

type ZoomMeetingReconciliationPermissions = Pick<Role, "can_create" | "can_read" | "can_update" | "can_delete">

type ZoomMeetingCreatePermissions = Pick<Role, "can_create" | "can_read">

export function canCreateZoomMeetings(role: ZoomMeetingCreatePermissions | null): boolean {
  return role?.can_create === true && role.can_read === true
}

export function canReconcileZoomMeetings(role: ZoomMeetingReconciliationPermissions | null): boolean {
  return role?.can_create === true
    && role.can_read === true
    && role.can_update === true
    && role.can_delete === true
}

function isPastOneTimeMeeting(meeting: ZoomMeetingReconciliationRow, now: Date): boolean {
  if (meeting.recurrence_type !== "none" || !meeting.start_time) return false

  const startTime = Date.parse(meeting.start_time)
  return Number.isFinite(startTime) && startTime < now.getTime()
}

export function getAbsentActiveZoomMeetingIds(
  localMeetings: ZoomMeetingReconciliationRow[],
  remoteMeetingIds: Iterable<number>,
  now = new Date(),
): string[] {
  const remoteIds = new Set(remoteMeetingIds)

  return localMeetings
    .filter((meeting) => !remoteIds.has(meeting.zoom_meeting_id) && !isPastOneTimeMeeting(meeting, now))
    .map((meeting) => meeting.id)
}
