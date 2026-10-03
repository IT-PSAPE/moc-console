import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  deriveVenueBookingPhase,
  dispatchEvent,
  formatVenueBookingDuration,
  resolveDmRouteTarget,
  venueBookingSlotCount,
} from "../../../../../apps/api/server/notifications/dispatch.js"

describe("deriveVenueBookingPhase", () => {
  const startsAt = "2026-09-05T18:00:00.000Z"
  const endsAt = "2026-09-05T20:00:00.000Z"

  it("reports booked before the window opens", () => {
    const now = new Date("2026-09-05T17:00:00.000Z")
    assert.equal(deriveVenueBookingPhase("auto", startsAt, endsAt, now), "booked")
  })

  it("reports in_progress once the clock reaches the start", () => {
    const now = new Date("2026-09-05T19:00:00.000Z")
    assert.equal(deriveVenueBookingPhase("auto", startsAt, endsAt, now), "in_progress")
  })

  it("reports completed once the window has passed, even long after send", () => {
    const now = new Date("2026-09-06T09:00:00.000Z")
    assert.equal(deriveVenueBookingPhase("auto", startsAt, endsAt, now), "completed")
  })

  it("reports cancelled regardless of the clock — cancelled always wins", () => {
    const beforeStart = new Date("2026-09-05T10:00:00.000Z")
    const afterEnd = new Date("2026-09-07T00:00:00.000Z")
    assert.equal(deriveVenueBookingPhase("cancelled", startsAt, endsAt, beforeStart), "cancelled")
    assert.equal(deriveVenueBookingPhase("cancelled", startsAt, endsAt, afterEnd), "cancelled")
  })

  it("reports rejected regardless of the clock, same as cancelled", () => {
    assert.equal(deriveVenueBookingPhase("rejected", startsAt, endsAt, new Date("2026-09-05T19:00:00.000Z")), "rejected")
  })

  it("reports the approval decision before the clock takes over", () => {
    const now = new Date("2026-09-05T17:00:00.000Z")
    assert.equal(deriveVenueBookingPhase("approved", startsAt, endsAt, now), "approved")
  })
})

describe("venueBookingSlotCount / formatVenueBookingDuration", () => {
  it("counts contiguous 30-minute slots and formats a whole-hour span", () => {
    const startsAt = "2026-09-05T18:00:00.000Z"
    const endsAt = "2026-09-05T20:00:00.000Z"
    assert.equal(venueBookingSlotCount(startsAt, endsAt), 4)
    assert.equal(formatVenueBookingDuration(startsAt, endsAt), "2h")
  })

  it("formats a sub-hour span in minutes and a mixed span as h + m", () => {
    assert.equal(formatVenueBookingDuration("2026-09-05T18:00:00.000Z", "2026-09-05T18:30:00.000Z"), "30 min")
    assert.equal(formatVenueBookingDuration("2026-09-05T18:00:00.000Z", "2026-09-05T19:30:00.000Z"), "1h 30m")
  })
})

describe("resolveDmRouteTarget", () => {
  it("targets the user's linked Telegram chat", () => {
    assert.deepEqual(resolveDmRouteTarget("route-1", "user-1", "555000111"), {
      kind: "target",
      target: { kind: "dm", routeId: "route-1", userId: "user-1", chatId: "555000111" },
    })
  })

  it("skips visibly, rather than silently, when the user has never linked Telegram", () => {
    assert.deepEqual(resolveDmRouteTarget("route-1", "user-1", null), {
      kind: "skip_unlinked",
      userId: "user-1",
    })
  })
})

describe("dispatchEvent — announcement vs follow-up split", () => {
  it("routes a follow-up event through the entity path, which no-ops (without touching the DB) when no entityId is supplied", async () => {
    // request.status_changed is a follow-up event (not one of the five
    // *.created announcements) — dispatchEvent must not fall through to
    // group/route dispatch for it, and without an entityId (which the
    // outbox always supplies in production) there is nothing to follow up.
    const result = await dispatchEvent(
      "workspace-1",
      "request.status_changed",
      { title: "Stage lighting", status: "in_progress", linkUrl: "" },
      {},
    )
    assert.deepEqual(result, { attempted: 0, succeeded: 0, failed: 0 })
  })
})
