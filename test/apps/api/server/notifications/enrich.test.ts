import assert from "node:assert/strict"
import { describe, it, vi } from "vitest"

const queryRows = vi.hoisted(() => vi.fn())
vi.mock("@moc/backend/database", () => ({ queryRows }))

import { deriveVenueBookingSeriesStatus, enrichBooking, enrichRequest, enrichVenueBooking } from "../../../../../apps/api/server/notifications/enrich.js"

describe("enrichRequest", () => {
  it("enriches notifications after request notes and content columns have been removed", async () => {
    queryRows.mockImplementationOnce(async (sql: string) => {
      if (/request\.(notes|content)\b/.test(sql)) throw new Error("Column no longer exists")
      return [{
        title: "Sunday recording", status: "not_started", category: "video", category_name: "Video",
        requested_by: "Craig", due_date: "2026-10-27T10:00:00.000Z", created_at: "2026-10-26T10:00:00.000Z",
        updated_at: "2026-10-26T10:00:00.000Z", tracking_code: "REQ-ABC123", who: "Team", what: "Record the service",
        when_text: "Sunday", where_text: "Hall", why: "Archive", how: "Camera", flow: "Worship first",
      }]
    })

    const tokens = await enrichRequest("request-1", { throwOnError: true })

    assert.equal(tokens.what, "Record the service")
    assert.equal(tokens.flow, "Worship first")
    assert.equal(tokens.category, "Video")
    assert.equal("notes" in tokens, false)
    assert.equal("content" in tokens, false)
  })
})

describe("booking enrichment", () => {
  it("retains equipment facts after booking notes have been removed", async () => {
    queryRows.mockImplementationOnce(async (sql: string) => {
      if (/booking\.notes\b/.test(sql)) throw new Error("Column no longer exists")
      return [{ booked_by: "Craig", status: "booked", checked_out_at: "2026-10-27T10:00:00.000Z", expected_return_at: "2026-10-27T12:00:00.000Z", returned_at: null, tracking_code: "BKG-ABC123", equipment_name: "Camera", equipment_category: "camera", equipment_location: "Store", equipment_serial_number: "SN1", equipment_names: ["Camera"] }]
    })

    const tokens = await enrichBooking("BKG-ABC123", "workspace-1")

    assert.equal(tokens.equipmentNames, "Camera")
    assert.equal(tokens.bookedBy, "Craig")
    assert.equal("notes" in tokens, false)
  })

  it("retains venue facts and cancellation rationale after venue booking notes have been removed", async () => {
    queryRows.mockImplementationOnce(async (sql: string) => {
      if (/booking\.notes\b/.test(sql)) throw new Error("Column no longer exists")
      return [{ title: "Youth night", requested_by: "Craig", tracking_code: "VEN-ABC123", event_other: "Youth night", status: "cancelled", starts_at: "2026-10-27T10:00:00.000Z", ends_at: "2026-10-27T12:00:00.000Z", recurrence: null, cancel_reason: "Event postponed", cancelled_at: "2026-10-26T10:00:00.000Z", venue_name: "Hall", venue_description: "Ground floor", event_name: null, venue_booking_slots: [] }]
    })

    const tokens = await enrichVenueBooking("venue-booking-1", { throwOnError: true })

    assert.equal(tokens.venueName, "Hall")
    assert.equal(tokens.cancelReason, "Event postponed")
    assert.equal("notes" in tokens, false)
  })
})

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
