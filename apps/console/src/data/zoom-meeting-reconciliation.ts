import type { ZoomMeetingType, ZoomRecurrenceType } from "@moc/types/streams/zoom"
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

/** A tracked meeting to look up by id, and the local row it belongs to. */
export type ZoomMeetingVerificationTarget = {
  id: string
  zoomMeetingId: number
}

/**
 * Tracked meetings that have dropped out of the upcoming list, other than past
 * one-time meetings, which are kept as history.
 *
 * Absence is not proof of cancellation — a paging hiccup, a token refresh or a
 * Zoom outage looks exactly the same from here — so these are candidates to
 * confirm by id, not rows to delete. Deleting on absence alone is what could
 * quietly clear live meetings out of the console.
 */
export function getZoomMeetingsToVerify(
  localMeetings: ZoomMeetingReconciliationRow[],
  remoteMeetingIds: Iterable<number>,
  now = new Date(),
): ZoomMeetingVerificationTarget[] {
  const remoteIds = new Set(remoteMeetingIds)

  return localMeetings
    .filter((meeting) => !remoteIds.has(meeting.zoom_meeting_id) && !isPastOneTimeMeeting(meeting, now))
    .map((meeting) => ({ id: meeting.id, zoomMeetingId: meeting.zoom_meeting_id }))
}

/** The fields that decide whether an untracked meeting is worth adopting. */
export type ZoomMeetingAdoptionRow = {
  meeting_type: ZoomMeetingType
  start_time: string | null
  duration: number
}

/**
 * Zoom's upcoming list should never hand back a meeting that is already over,
 * so this mirrors the YouTube guard rather than fixing a known leak: a meeting
 * whose slot has passed is not adopted, and therefore cannot be announced late.
 *
 * A recurring series has no single end, and a meeting with no start time is a
 * recurring meeting with no fixed time, so both stay adoptable regardless of age.
 */
export function isCurrentOrUpcomingMeeting(meeting: ZoomMeetingAdoptionRow, now = new Date()): boolean {
  if (meeting.meeting_type !== "scheduled" && meeting.meeting_type !== "instant") return true
  if (!meeting.start_time) return true

  const startTime = Date.parse(meeting.start_time)
  if (!Number.isFinite(startTime)) return true
  return startTime + meeting.duration * 60_000 > now.getTime()
}
