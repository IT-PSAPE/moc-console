import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildPayload, claimPendingOutboxRow, outboxRetryAt, type OutboxRow } from "../../../../../apps/api/server/notifications/outbox.js"
import type { VenueBookingCreatedPayload } from "../../../../../apps/api/server/notifications/dispatch.js"

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

describe("buildPayload — stream.updated / meeting.updated", () => {
  it("builds a stream.updated follow-up payload keyed off the stream id", () => {
    withConsoleBaseUrl("https://console.example.com", () => {
      const row: OutboxRow = {
        id: "outbox-2",
        workspace_id: "workspace-1",
        event_type: "stream.updated",
        entity_type: "stream",
        entity_id: "33333333-3333-3333-3333-333333333333",
        event_key: "stream.updated:33333333-3333-3333-3333-333333333333:abc",
        attempt_count: 0,
        payload: { title: "Sunday Service", changeSummary: "Start time changed" },
      }
      assert.deepEqual(buildPayload(row), {
        title: "Sunday Service",
        streamId: "33333333-3333-3333-3333-333333333333",
        changeSummary: "Start time changed",
      })
    })
  })

  it("builds a meeting.updated follow-up payload keyed off the meeting id", () => {
    withConsoleBaseUrl("https://console.example.com", () => {
      const row: OutboxRow = {
        id: "outbox-3",
        workspace_id: "workspace-1",
        event_type: "meeting.updated",
        entity_type: "meeting",
        entity_id: "44444444-4444-4444-4444-444444444444",
        event_key: "meeting.updated:44444444-4444-4444-4444-444444444444:abc",
        attempt_count: 0,
        payload: { topic: "Leadership sync", changeSummary: "Join link changed" },
      }
      assert.deepEqual(buildPayload(row), {
        topic: "Leadership sync",
        meetingId: "44444444-4444-4444-4444-444444444444",
        changeSummary: "Join link changed",
      })
    })
  })
})

describe("buildPayload — requester deletion", () => {
  it("builds a deleted request entirely from its snapshot without requiring a dead deep link", () => {
    withConsoleBaseUrl(undefined, () => {
      const row: OutboxRow = {
        id: "outbox-delete-1",
        workspace_id: "workspace-1",
        event_type: "request.requester_deleted",
        entity_type: "request",
        entity_id: "22222222-2222-2222-2222-222222222222",
        event_key: "request.requester_deleted:22222222-2222-2222-2222-222222222222:1",
        attempt_count: 0,
        payload: {
          title: "Easter service recap",
          requesterName: "Tendai M.",
          trackingCode: "REQ-123456789ABC",
          changeSummary: "Request deleted",
        },
      }

      assert.deepEqual(buildPayload(row), {
        title: "Easter service recap",
        status: null,
        requesterName: "Tendai M.",
        trackingCode: "REQ-123456789ABC",
        changeSummary: "Request deleted",
        requestId: "22222222-2222-2222-2222-222222222222",
        linkUrl: "",
      })
    })
  })
})

describe("outboxRetryAt", () => {
  it("uses the existing exponential retry schedule and exponent bound", () => {
    const now = Date.UTC(2026, 7, 5, 12, 0, 0)
    assert.equal(outboxRetryAt(1, now), "2026-08-05T12:00:02.000Z")
    assert.equal(outboxRetryAt(4, now), "2026-08-05T12:00:16.000Z")
    assert.equal(outboxRetryAt(10, now), "2026-08-05T12:17:04.000Z")
    assert.equal(outboxRetryAt(11, now), "2026-08-05T12:17:04.000Z")
    assert.equal(outboxRetryAt(12, now), "2026-08-05T12:17:04.000Z")
  })
})

describe("claimPendingOutboxRow", () => {
  it("claims a pending event with one guarded update and returns no row when another worker won", async () => {
    const statements: Array<{ sql: string; values?: readonly unknown[] }> = []
    const pendingRow: OutboxRow = {
      id: "outbox-1",
      workspace_id: "workspace-1",
      event_type: "stream.created",
      entity_type: "stream",
      entity_id: "stream-1",
      event_key: "stream.created:stream-1",
      payload: { title: "Sunday Service" },
      attempt_count: 0,
    }
    const runQuery = async (sql: string, values?: readonly unknown[]) => {
      statements.push({ sql, values })
      return statements.length === 1 ? [pendingRow] : []
    }

    assert.deepEqual(await claimPendingOutboxRow("outbox-1", runQuery), pendingRow)
    assert.equal(await claimPendingOutboxRow("outbox-1", runQuery), null)
    assert.match(statements[0]?.sql ?? "", /UPDATE public\.notification_outbox/)
    assert.match(statements[0]?.sql ?? "", /WHERE id = \$1 AND status = 'pending'/)
    assert.match(statements[0]?.sql ?? "", /RETURNING id, workspace_id, event_type/)
    assert.deepEqual(statements[0]?.values, ["outbox-1"])
  })
})
