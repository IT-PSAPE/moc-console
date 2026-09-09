import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  ENTITY_TABLES,
  handlePublicNotificationWake,
  parsePublicNotificationWake,
  publicWakeRateLimitSubject,
  type PublicWakeDependencies,
  type PublicNotificationWakeOptions,
} from "./public-wake.js"
import publicNotificationWake from "../../api/notify/[kind].js"
import type { ApiResponse } from "../http.js"

const requestOptions: PublicNotificationWakeOptions = {
  entityIdField: "request_id",
  entityType: "request",
  eventType: "request.created",
  notFoundMessage: "Request not found",
}

const venueBookingOptions: PublicNotificationWakeOptions = {
  entityIdField: "venue_booking_id",
  entityType: "venue_booking",
  eventType: "venue_booking.created",
  notFoundMessage: "Venue booking not found",
}

const requestId = "f3cc40f7-e4a9-4d9a-b9fc-fac06eb8be7d"
const trackingCode = "REQ-ABC123"
const venueBookingId = "2d6f9d0a-9f3f-4a4a-8a3a-6a9f7b1e2c3d"
const venueBookingTrackingCode = "VEN-3B81D0"

type TestResponse = {
  statusCode: number | null
  body: unknown
  headers: Map<string, string>
  response: ApiResponse
}

function createResponse(): TestResponse {
  const result: TestResponse = {
    statusCode: null,
    body: null,
    headers: new Map(),
    response: undefined as unknown as ApiResponse,
  }
  result.response = {
    status(code) {
      result.statusCode = code
      return result.response
    },
    json(body) {
      result.body = body
    },
    setHeader(name, value) {
      result.headers.set(name, value)
    },
  }
  return result
}

function dependencies(overrides: Partial<PublicWakeDependencies> = {}): PublicWakeDependencies {
  return {
    lookup: async () => requestId,
    dispatch: async () => ({ attempted: 1, dispatched: 1, failed: 0, pendingRetry: 0 }),
    limit: async () => ({ allowed: true, limit: 12, remaining: 11, retryAfterSeconds: null, degraded: false }),
    logError: () => undefined,
    ...overrides,
  }
}

describe("parsePublicNotificationWake", () => {
  it("accepts only the canonical, bounded identifiers issued by submissions", () => {
    assert.deepEqual(
      parsePublicNotificationWake({ request_id: requestId, tracking_code: trackingCode }, requestOptions),
      { entityId: requestId, trackingCode },
    )
  })

  it("rejects extra keys, oversized values, malformed UUIDs, and mismatched tracking codes", () => {
    assert.equal(
      parsePublicNotificationWake({ request_id: requestId, tracking_code: trackingCode, extra: "no" }, requestOptions),
      null,
    )
    assert.equal(
      parsePublicNotificationWake({ request_id: "x".repeat(10_000), tracking_code: trackingCode }, requestOptions),
      null,
    )
    assert.equal(
      parsePublicNotificationWake({ request_id: "not-a-uuid", tracking_code: trackingCode }, requestOptions),
      null,
    )
    assert.equal(
      parsePublicNotificationWake({ request_id: requestId, tracking_code: "BKG-ABC123" }, requestOptions),
      null,
    )
  })
})

describe("handlePublicNotificationWake", () => {
  it("keeps valid authorization checks and durable dispatch, while withholding delivery details", async () => {
    const result = createResponse()
    let lookupArgs: unknown[] = []
    let dispatchArgs: unknown[] = []
    await handlePublicNotificationWake(
      { method: "POST", body: { request_id: requestId, tracking_code: trackingCode } },
      result.response,
      requestOptions,
      dependencies({
        lookup: async (...args) => {
          lookupArgs = args
          return requestId
        },
        dispatch: async (...args) => {
          dispatchArgs = args
          return { attempted: 2, dispatched: 1, failed: 1, pendingRetry: 1 }
        },
      }),
    )

    assert.deepEqual(lookupArgs, ["request", requestId, trackingCode])
    assert.deepEqual(dispatchArgs, ["request", requestId, "request.created"])
    assert.equal(result.statusCode, 200)
    assert.deepEqual(result.body, { ok: true })
  })

  it("uses stable public errors and logs internal failures without exposing details", async () => {
    const result = createResponse()
    const logged: unknown[] = []
    await handlePublicNotificationWake(
      { method: "POST", body: { request_id: requestId, tracking_code: trackingCode } },
      result.response,
      requestOptions,
      dependencies({
        lookup: async () => {
          throw new Error("database connection secret detail")
        },
        logError: (...args) => logged.push(args),
      }),
    )

    assert.equal(result.statusCode, 500)
    assert.deepEqual(result.body, { error: "Unable to process notification wake" })
    assert.equal(logged.length, 1)
    assert.match(String(logged[0]), /database connection secret detail/)
  })

  it("uses the same not-found response for an unknown id or tracking-code mismatch", async () => {
    const result = createResponse()
    await handlePublicNotificationWake(
      { method: "POST", body: { request_id: requestId, tracking_code: trackingCode } },
      result.response,
      requestOptions,
      dependencies({ lookup: async () => null }),
    )

    assert.equal(result.statusCode, 404)
    assert.deepEqual(result.body, { error: "Request not found" })
  })

  it("rate-limits only after accepting a valid canonical wake request", async () => {
    const result = createResponse()
    let lookupCalled = false
    let limitedEntityType: string | null = null
    await handlePublicNotificationWake(
      { method: "POST", body: { request_id: requestId, tracking_code: trackingCode } },
      result.response,
      requestOptions,
      dependencies({
        limit: async (_request, entityType) => {
          limitedEntityType = entityType
          return { allowed: false, limit: 12, remaining: 0, retryAfterSeconds: 24, degraded: false }
        },
        lookup: async () => {
          lookupCalled = true
          return requestId
        },
      }),
    )

    assert.equal(lookupCalled, false)
    assert.equal(limitedEntityType, "request")
    assert.equal(result.statusCode, 429)
    assert.equal(result.headers.get("Retry-After"), "24")
    assert.deepEqual(result.body, {
      code: "rate_limited",
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: 24,
    })
  })

  it("uses one client window per endpoint, regardless of the submitted entity id", () => {
    const request = { headers: { "x-forwarded-for": "203.0.113.42" } }
    assert.equal(publicWakeRateLimitSubject(request, "request"), publicWakeRateLimitSubject(request, "request"))
    assert.notEqual(publicWakeRateLimitSubject(request, "request"), publicWakeRateLimitSubject(request, "booking"))
  })

  it("rejects an oversized declared body before consuming the rate limit", async () => {
    const result = createResponse()
    let limitCalled = false
    await handlePublicNotificationWake(
      {
        method: "POST",
        headers: { "content-length": "513" },
        body: { request_id: requestId, tracking_code: trackingCode },
      },
      result.response,
      requestOptions,
      dependencies({
        limit: async () => {
          limitCalled = true
          return { allowed: true, limit: 12, remaining: 11, retryAfterSeconds: null, degraded: false }
        },
      }),
    )

    assert.equal(limitCalled, false)
    assert.equal(result.statusCode, 400)
    assert.deepEqual(result.body, { error: "Invalid notification wake request" })
  })
})

describe("venue-booking wake", () => {
  it("looks up the venue booking wake entity against venue_bookings", () => {
    assert.equal(ENTITY_TABLES.venue_booking, "venue_bookings")
    assert.equal(ENTITY_TABLES.request, "requests")
    assert.equal(ENTITY_TABLES.booking, "bookings")
  })

  it("accepts the venue_booking_id + tracking_code shape and its VEN- tracking codes", () => {
    assert.deepEqual(
      parsePublicNotificationWake(
        { venue_booking_id: venueBookingId, tracking_code: venueBookingTrackingCode },
        venueBookingOptions,
      ),
      { entityId: venueBookingId, trackingCode: venueBookingTrackingCode },
    )
  })

  it("rejects a request-shaped body (wrong id field, wrong tracking-code prefix)", () => {
    assert.equal(
      parsePublicNotificationWake({ request_id: venueBookingId, tracking_code: venueBookingTrackingCode }, venueBookingOptions),
      null,
    )
    assert.equal(
      parsePublicNotificationWake({ venue_booking_id: venueBookingId, tracking_code: trackingCode }, venueBookingOptions),
      null,
    )
  })

  it("looks up the venue_booking table and dispatches venue_booking.created", async () => {
    const result = createResponse()
    let lookupArgs: unknown[] = []
    let dispatchArgs: unknown[] = []
    await handlePublicNotificationWake(
      { method: "POST", body: { venue_booking_id: venueBookingId, tracking_code: venueBookingTrackingCode } },
      result.response,
      venueBookingOptions,
      dependencies({
        lookup: async (...args) => {
          lookupArgs = args
          return venueBookingId
        },
        dispatch: async (...args) => {
          dispatchArgs = args
          return { attempted: 1, dispatched: 1, failed: 0, pendingRetry: 0 }
        },
      }),
    )

    assert.deepEqual(lookupArgs, ["venue_booking", venueBookingId, venueBookingTrackingCode])
    assert.deepEqual(dispatchArgs, ["venue_booking", venueBookingId, "venue_booking.created"])
    assert.equal(result.statusCode, 200)
    assert.deepEqual(result.body, { ok: true })
  })

  it("reports the venue-booking not-found message on a tracking-code mismatch", async () => {
    const result = createResponse()
    await handlePublicNotificationWake(
      { method: "POST", body: { venue_booking_id: venueBookingId, tracking_code: venueBookingTrackingCode } },
      result.response,
      venueBookingOptions,
      dependencies({ lookup: async () => null }),
    )

    assert.equal(result.statusCode, 404)
    assert.deepEqual(result.body, { error: "Venue booking not found" })
  })

  // Exercises the real /api/notify/[kind] router (not the injected
  // dependencies above) to prove "venue-booking" is actually wired to the
  // venue_booking_id-shaped options, not just that a same-shaped options
  // object works in isolation. A wrong-field body 400s before touching the
  // database, so this needs no Supabase credentials.
  it("wires the 'venue-booking' route kind to venue_booking_id, not request_id", async () => {
    const result = createResponse()
    await publicNotificationWake(
      {
        method: "POST",
        query: { kind: "venue-booking" },
        body: { request_id: venueBookingId, tracking_code: venueBookingTrackingCode },
      },
      result.response,
    )

    assert.equal(result.statusCode, 400)
    assert.deepEqual(result.body, { error: "Invalid notification wake request" })
  })
})
