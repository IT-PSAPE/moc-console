import { describe, expect, test } from "bun:test"
import { canCreateZoomMeetings, canReconcileZoomMeetings, getAbsentActiveZoomMeetingIds, type ZoomMeetingReconciliationRow } from "./zoom-meeting-reconciliation"

const now = new Date("2026-08-05T12:00:00.000Z")

function meeting(overrides: Partial<ZoomMeetingReconciliationRow>): ZoomMeetingReconciliationRow {
  return {
    id: "meeting-id",
    zoom_meeting_id: 1,
    recurrence_type: "none",
    start_time: "2026-08-05T13:00:00.000Z",
    ...overrides,
  }
}

describe("getAbsentActiveZoomMeetingIds", () => {
  test("deletes missing future and recurring meetings", () => {
    const localMeetings = [
      meeting({ id: "future", zoom_meeting_id: 1 }),
      meeting({ id: "recurring", zoom_meeting_id: 2, recurrence_type: "weekly" }),
      meeting({ id: "remote", zoom_meeting_id: 3 }),
    ]

    expect(getAbsentActiveZoomMeetingIds(localMeetings, [3], now)).toEqual(["future", "recurring"])
  })

  test("retains missing past one-time meeting history", () => {
    const localMeetings = [
      meeting({ id: "past", zoom_meeting_id: 1, start_time: "2026-08-05T11:00:00.000Z" }),
      meeting({ id: "undated", zoom_meeting_id: 2, start_time: null }),
    ]

    expect(getAbsentActiveZoomMeetingIds(localMeetings, [], now)).toEqual(["undated"])
  })
})

describe("canReconcileZoomMeetings", () => {
  test("requires every permission used by a reconciliation sync", () => {
    expect(canReconcileZoomMeetings({ can_create: true, can_read: true, can_update: true, can_delete: true })).toBe(true)
    expect(canReconcileZoomMeetings({ can_create: true, can_read: true, can_update: true, can_delete: false })).toBe(false)
  })
})

describe("canCreateZoomMeetings", () => {
  test("requires connection-read and meeting-create permission", () => {
    expect(canCreateZoomMeetings({ can_create: true, can_read: true })).toBe(true)
    expect(canCreateZoomMeetings({ can_create: true, can_read: false })).toBe(false)
  })
})
