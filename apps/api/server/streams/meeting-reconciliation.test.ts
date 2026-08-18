import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  getZoomMeetingsToVerify,
  isCurrentOrUpcomingMeeting,
  type ZoomMeetingReconciliationRow,
} from "./meeting-reconciliation.js"

const now = new Date("2026-08-05T12:00:00.000Z")

function meeting(overrides: Partial<ZoomMeetingReconciliationRow>): ZoomMeetingReconciliationRow {
  return { id: "meeting-id", zoom_meeting_id: 1, recurrence_type: "none", start_time: "2026-08-05T13:00:00.000Z", ...overrides }
}

describe("getZoomMeetingsToVerify", () => {
  it("verifies missing future and recurring meetings by id", () => {
    const localMeetings = [
      meeting({ id: "future", zoom_meeting_id: 1 }),
      meeting({ id: "recurring", zoom_meeting_id: 2, recurrence_type: "weekly" }),
      meeting({ id: "remote", zoom_meeting_id: 3 }),
    ]

    assert.deepEqual(getZoomMeetingsToVerify(localMeetings, [3], now), [
      { id: "future", zoomMeetingId: 1 },
      { id: "recurring", zoomMeetingId: 2 },
    ])
  })

  it("retains missing past one-time meeting history without a lookup", () => {
    const localMeetings = [
      meeting({ id: "past", zoom_meeting_id: 1, start_time: "2026-08-05T11:00:00.000Z" }),
      meeting({ id: "undated", zoom_meeting_id: 2, start_time: null }),
    ]

    assert.deepEqual(getZoomMeetingsToVerify(localMeetings, [], now), [{ id: "undated", zoomMeetingId: 2 }])
  })
})

describe("isCurrentOrUpcomingMeeting", () => {
  it("adopts a meeting whose slot has not finished", () => {
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T13:00:00.000Z", duration: 60 }, now), true)
    // Started an hour ago, booked for 90 minutes: still running.
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T11:00:00.000Z", duration: 90 }, now), true)
  })

  it("refuses a meeting that is already over", () => {
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: "2026-08-05T10:00:00.000Z", duration: 60 }, now), false)
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "instant", start_time: "2026-03-05T10:00:00.000Z", duration: 60 }, now), false)
  })

  it("adopts a recurring series and an undated meeting whatever their age", () => {
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "recurring_fixed", start_time: "2026-03-05T10:00:00.000Z", duration: 60 }, now), true)
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "recurring_no_fixed", start_time: null, duration: 60 }, now), true)
    assert.equal(isCurrentOrUpcomingMeeting({ meeting_type: "scheduled", start_time: null, duration: 60 }, now), true)
  })
})
