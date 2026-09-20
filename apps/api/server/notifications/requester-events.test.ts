import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { DEFAULT_TEMPLATES, TEMPLATE_TOKENS, isNotificationEventKey } from "@moc/notifications"

const requesterEvents = [
  "request.requester_updated",
  "request.requester_deleted",
  "booking.requester_updated",
  "booking.requester_deleted",
  "venue_booking.requester_updated",
  "venue_booking.requester_deleted",
] as const

describe("requester-originated notification events", () => {
  it("registers every update and deletion event", () => {
    for (const event of requesterEvents) {
      assert.equal(isNotificationEventKey(event), true, `${event} is not registered`)
    }
  })

  it("provides editable templates and change-summary tokens", () => {
    const templates = DEFAULT_TEMPLATES as Record<string, string>
    const tokens = TEMPLATE_TOKENS as Record<string, readonly { name: string }[]>

    for (const event of requesterEvents) {
      assert.ok(templates[event], `${event} has no default template`)
      assert.ok(tokens[event]?.some((token) => token.name === "changeSummary"), `${event} cannot report what changed`)
      assert.equal(templates[event].includes("{{trackingCode}}"), false, `${event} exposes its bearer code by default`)
    }
  })
})
