import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildPayload, type OutboxRow } from "./outbox.js"
import type { VenueBookingCreatedPayload } from "./dispatch.js"

function venueBookingRow(overrides: Partial<OutboxRow["payload"]> = {}): OutboxRow {
  return {
    id: "outbox-1",
    workspace_id: "workspace-1",
    event_type: "venue_booking.created",
    entity_type: "venue_booking",
    entity_id: "11111111-1111-1111-1111-111111111111",
    event_key: "venue_booking.created:11111111-1111-1111-1111-111111111111:abc",
    attempt_count: 0,
    payload: {
      title: "Youth rehearsal",
      requesterName: "Tapiwa N.",
      trackingCode: "VEN-3B81D0",
      venueName: "Main Auditorium",
      startsAt: "2026-09-05T18:00:00+00:00",
      endsAt: "2026-09-05T20:00:00+00:00",
      ...overrides,
    },
  }
}

function withConsoleBaseUrl<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.CONSOLE_BASE_URL
  if (value === undefined) delete process.env.CONSOLE_BASE_URL
  else process.env.CONSOLE_BASE_URL = value
  try {
    return run()
  } finally {
    if (previous === undefined) delete process.env.CONSOLE_BASE_URL
    else process.env.CONSOLE_BASE_URL = previous
  }
}

describe("buildPayload — venue_booking.*", () => {
  it("builds the venue booking payload with a /venues/:id console deep link", () => {
    withConsoleBaseUrl("https://console.example.com", () => {
      const payload = buildPayload(venueBookingRow()) as VenueBookingCreatedPayload
      assert.deepEqual(payload, {
        title: "Youth rehearsal",
        requesterName: "Tapiwa N.",
        trackingCode: "VEN-3B81D0",
        venueName: "Main Auditorium",
        startsAt: "2026-09-05T18:00:00+00:00",
        endsAt: "2026-09-05T20:00:00+00:00",
        venueBookingId: "11111111-1111-1111-1111-111111111111",
        linkUrl: "https://console.example.com/venues/11111111-1111-1111-1111-111111111111",
      })
    })
  })

  it("also builds the cancelled event through the same prefix branch", () => {
    withConsoleBaseUrl("https://console.example.com", () => {
      const row = venueBookingRow()
      row.event_type = "venue_booking.cancelled"
      const payload = buildPayload(row) as VenueBookingCreatedPayload
      assert.equal(payload.linkUrl, "https://console.example.com/venues/11111111-1111-1111-1111-111111111111")
    })
  })

  it("skips the link-bearing notification when no console base URL is configured", () => {
    withConsoleBaseUrl(undefined, () => {
      assert.throws(() => buildPayload(venueBookingRow()), /CONSOLE_BASE_URL not configured/)
    })
  })

  it("throws rather than silently dropping a required field", () => {
    withConsoleBaseUrl("https://console.example.com", () => {
      const row = venueBookingRow()
      row.payload.venueName = undefined
      assert.throws(() => buildPayload(row), /Venue booking notification is missing required details/)
    })
  })
})
