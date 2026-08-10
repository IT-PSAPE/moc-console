import { describe, expect, test } from "bun:test"
import { canCreateZoomMeetings, canReconcileZoomMeetings, getZoomMeetingsToVerify, isCurrentOrUpcomingMeeting, type ZoomMeetingReconciliationRow } from "./zoom-meeting-reconciliation"

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

describe("getZoomMeetingsToVerify", () => {
  test("verifies missing future and recurring meetings by id", () => {
    const localMeetings = [
      meeting({ id: "future", zoom_meeting_id: 1 }),
      meeting({ id: "recurring", zoom_meeting_id: 2, recurrence_type: "weekly" }),
      meeting({ id: "remote", zoom_meeting_id: 3 }),
    ]

    expect(getZoomMeetingsToVerify(localMeetings, [3], now)).toEqual([
      { id: "future", zoomMeetingId: 1 },
      { id: "recurring", zoomMeetingId: 2 },
    ])
  })

  test("retains missing past one-time meeting history without a lookup", () => {
    const localMeetings = [
      meeting({ id: "past", zoom_meeting_id: 1, start_time: "2026-08-05T11:00:00.000Z" }),
      meeting({ id: "undated", zoom_meeting_id: 2, start_time: null }),
    ]

    expect(getZoomMeetingsToVerify(localMeetings, [], now)).toEqual([{ id: "undated", zoomMeetingId: 2 }])
  })
})

describe("isCurrentOrUpcomingMeeting", () => {
  test("adopts a meeting whose slot has not finished", () => {
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T13:00:00.000Z", duration: 60 }, now)).toBe(true)
    // Started an hour ago, booked for 90 minutes: still running.
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T11:00:00.000Z", duration: 90 }, now)).toBe(true)
  })

  test("refuses a meeting that is already over", () => {
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T10:00:00.000Z", duration: 60 }, now)).toBe(false)
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "instant", start_time: "2026-03-05T10:00:00.000Z", duration: 60 }, now)).toBe(false)
  })

  test("adopts a recurring series and an undated meeting whatever their age", () => {
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "recurring_fixed", start_time: "2026-03-05T10:00:00.000Z", duration: 60 }, now)).toBe(true)
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "recurring_no_fixed", start_time: null, duration: 60 }, now)).toBe(true)
    expect(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: null, duration: 60 }, now)).toBe(true)
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
