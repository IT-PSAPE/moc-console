import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  ANNOUNCEMENT_EVENT_KEYS,
  eventEntityType,
  isAnnouncementEvent,
  isLoudFollowUp,
  type FollowUpEventKey,
} from "../../../../packages/notifications/src/event-routing.js"
import { isNotificationEventKey } from "../../../../packages/notifications/src/events.js"

describe("ANNOUNCEMENT_EVENT_KEYS", () => {
  it("is exactly the five *.created events", () => {
    assert.deepEqual(
      [...ANNOUNCEMENT_EVENT_KEYS].sort(),
      ["booking.created", "meeting.created", "request.created", "stream.created", "venue_booking.created"].sort(),
    )
  })

  it("every announcement key is a registered event", () => {
    for (const key of ANNOUNCEMENT_EVENT_KEYS) assert.equal(isNotificationEventKey(key), true)
  })
})

describe("isAnnouncementEvent", () => {
  it("is true only for the five created events", () => {
    assert.equal(isAnnouncementEvent("request.created"), true)
    assert.equal(isAnnouncementEvent("request.status_changed"), false)
    assert.equal(isAnnouncementEvent("stream.updated"), false)
    assert.equal(isAnnouncementEvent("not.a.real.event"), false)
  })
})

describe("eventEntityType", () => {
  it("maps every event family to its entity type", () => {
    assert.equal(eventEntityType("request.created"), "request")
    assert.equal(eventEntityType("request.status_changed"), "request")
    assert.equal(eventEntityType("booking.status_changed"), "booking")
    assert.equal(eventEntityType("venue_booking.cancelled"), "venue_booking")
    assert.equal(eventEntityType("stream.updated"), "stream")
    assert.equal(eventEntityType("meeting.updated"), "meeting")
  })
})

describe("isLoudFollowUp", () => {
  it("is loud for requester updates and stream/meeting updates", () => {
    const loud: FollowUpEventKey[] = [
      "request.requester_updated",
      "booking.requester_updated",
      "venue_booking.requester_updated",
      "stream.updated",
      "meeting.updated",
    ]
    for (const key of loud) assert.equal(isLoudFollowUp(key), true)
  })

  it("is quiet for status changes, archiving and cancellation", () => {
    const quiet: FollowUpEventKey[] = [
      "request.status_changed",
      "request.archived",
      "booking.status_changed",
      "venue_booking.cancelled",
      "request.requester_deleted",
      "booking.requester_deleted",
      "venue_booking.requester_deleted",
    ]
    for (const key of quiet) assert.equal(isLoudFollowUp(key), false)
  })
})


describe("retired stale alerts", () => {
  it("rejects stale event keys while retaining other request and booking events", () => {
    assert.equal(isNotificationEventKey("request.stale"), false)
    assert.equal(isNotificationEventKey("booking.stale"), false)
    assert.equal(isNotificationEventKey("request.status_changed"), true)
    assert.equal(isNotificationEventKey("booking.status_changed"), true)
  })
})
