import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { deriveVenueBookingSeriesStatus } from "../../../../../apps/api/server/notifications/enrich.js"

describe("deriveVenueBookingSeriesStatus", () => {
  const startsAt = "2026-09-05T18:00:00.000Z"
  const endsAt = "2026-09-05T19:00:00.000Z"

  it("lets the stored cancellation state win over occurrence time", () => {
    assert.equal(deriveVenueBookingSeriesStatus("cancelled", [], startsAt, endsAt, new Date("2026-09-05T17:00:00.000Z")), "cancelled")
  })

  it("falls back to the parent window when embedded slots are unavailable", () => {
    assert.equal(deriveVenueBookingSeriesStatus("auto", [], startsAt, endsAt, new Date("2026-09-05T17:00:00.000Z")), "booked")
    assert.equal(deriveVenueBookingSeriesStatus("auto", [], startsAt, endsAt, new Date("2026-09-05T18:30:00.000Z")), "in_progress")
    assert.equal(deriveVenueBookingSeriesStatus("auto", [], startsAt, endsAt, new Date("2026-09-05T20:00:00.000Z")), "completed")
  })

  it("stays booked between recurring occurrences", () => {
    const slots = [
      { occurrence_index: 0, slot_start: "2026-09-05T18:00:00.000Z", slot_end: "2026-09-05T18:30:00.000Z" },
      { occurrence_index: 1, slot_start: "2026-09-12T18:00:00.000Z", slot_end: "2026-09-12T18:30:00.000Z" },
    ]
    assert.equal(deriveVenueBookingSeriesStatus("auto", slots, startsAt, endsAt, new Date("2026-09-08T18:00:00.000Z")), "booked")
  })

  it("lets a rejection win over the clock, like cancellation", () => {
    assert.equal(deriveVenueBookingSeriesStatus("rejected", [], startsAt, endsAt, new Date("2026-09-05T18:30:00.000Z")), "rejected")
  })

  it("reports the approval decision before the clock takes over", () => {
    assert.equal(deriveVenueBookingSeriesStatus("approved", [], startsAt, endsAt, new Date("2026-09-05T17:00:00.000Z")), "approved")
    assert.equal(deriveVenueBookingSeriesStatus("approved", [], startsAt, endsAt, new Date("2026-09-05T18:30:00.000Z")), "in_progress")
  })
})
