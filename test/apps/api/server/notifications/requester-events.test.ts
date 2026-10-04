import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  isAnnouncementEvent,
  isNotificationEventKey,
  renderFollowUpNote,
  type FollowUpEventKey,
} from "@moc/notifications"

const requesterEvents = [
  "request.requester_updated",
  "request.requester_deleted",
  "booking.requester_updated",
  "booking.requester_deleted",
  "venue_booking.requester_updated",
  "venue_booking.requester_deleted",
] as const

describe("requester-originated notification events", () => {
  it("registers every update and deletion event, as a follow-up rather than an announcement", () => {
    for (const event of requesterEvents) {
      assert.equal(isNotificationEventKey(event), true, `${event} is not registered`)
      assert.equal(isAnnouncementEvent(event), false, `${event} is templatable — only *.created events should be`)
    }
  })

  it("renders a change summary when the requester's own edit reported one, and a plain note otherwise", () => {
    for (const event of requesterEvents.filter((e) => e.endsWith("_updated"))) {
      const withSummary = renderFollowUpNote(event as FollowUpEventKey, { changeSummary: "venue, booking time" })
      assert.ok(withSummary.includes("venue, booking time"), `${event} does not report what changed`)
      const withoutSummary = renderFollowUpNote(event as FollowUpEventKey, {})
      assert.ok(withoutSummary.length > 0, `${event} has no fallback note`)
    }
  })

  it("never leaks the tracking code (the bearer code) into a deletion's note", () => {
    for (const event of requesterEvents.filter((e) => e.endsWith("_deleted"))) {
      const note = renderFollowUpNote(event as FollowUpEventKey, { trackingCode: "REQ-SECRET1" })
      assert.equal(note.includes("REQ-SECRET1"), false, `${event} exposes its bearer code`)
    }
  })
})
