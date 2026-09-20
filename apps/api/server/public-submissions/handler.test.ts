import assert from "node:assert/strict"
import { before, describe, it } from "node:test"

import type { NotificationEventKey } from "@moc/notifications"
import publicNotificationRoute from "../../api/notify/[kind].js"
import type { ApiRequest, ApiResponse } from "../http.js"
import type { RateLimitDecision, RateLimitPolicy } from "../rate-limit.js"
import { handlePublicSubmission, type PublicSubmissionHandlerDeps } from "./handler.js"
import { parseDeleteBody, parseLookupBody, parseUpdateBody, type PublicSubmission } from "./input.js"
import {
  SubmissionInvalidError,
  SubmissionLockedError,
  SubmissionNotFoundError,
  SubmissionStaleError,
  type PublicSubmissionStore,
} from "./store.js"

const requestId = "99447b5b-3f84-4ad8-a310-c257637a4a97"
const updatedAt = "2026-09-19T10:00:00.000Z"
const requestSubmission: PublicSubmission = {
  id: requestId,
  trackingCode: "REQ-ABC123",
  type: "request",
  title: "Test request",
  status: "not_started",
  createdAt: "2026-09-18T10:00:00.000Z",
  updatedAt,
  priority: "medium",
  category: "event",
  categoryName: "Event",
  requestedBy: "Craig",
  dueDate: "2026-09-24T10:00:00.000Z",
  who: "Team",
  what: "Record",
  whenText: "Sunday",
  whereText: "Auditorium",
  why: "Archive",
  how: "Cameras",
  notes: null,
  flow: null,
}

before(() => {
  process.env.ALLOWED_ORIGINS = "https://request.psape.co.za"
})

function createResponse() {
  const headers = new Map<string, string>()
  let statusCode: number | null = null
  let body: unknown
  const response: ApiResponse = {
    status(code) {
      statusCode = code
      return response
    },
    json(value) {
      body = value
    },
    setHeader(name, value) {
      headers.set(name, value)
    },
  }
  return { response, headers, get status() { return statusCode }, get body() { return body } }
}

function createRequest(method: string, body?: unknown, origin = "https://request.psape.co.za"): ApiRequest {
  return { method, body, headers: { origin, "x-forwarded-for": "192.0.2.1" } }
}

function allowedDecision(policy: RateLimitPolicy): RateLimitDecision {
  return { allowed: true, degraded: false, limit: policy.limit, remaining: policy.limit - 1, retryAfterSeconds: null }
}

function createDeps(overrides: Partial<PublicSubmissionHandlerDeps> & Partial<PublicSubmissionStore> = {}): PublicSubmissionHandlerDeps {
  const store: PublicSubmissionStore = {
    lookup: overrides.lookup ?? (async () => requestSubmission),
    update: overrides.update ?? (async () => ({ entityId: requestId, submission: requestSubmission })),
    delete: overrides.delete ?? (async () => ({ entityId: requestId })),
  }
  return {
    store: overrides.store ?? store,
    limit: overrides.limit ?? (async (_request, policy) => allowedDecision(policy)),
    processOutbox: overrides.processOutbox ?? (async () => ({ attempted: 0 })),
  }
}

function requestUpdateData(): Record<string, unknown> {
  return {
    title: "Updated request",
    requestedBy: "Craig",
    priority: "high",
    dueDate: "2026-09-25T10:00:00.000Z",
    category: "event",
    who: "Team",
    what: "Record and stream",
    whenText: "Sunday",
    whereText: "Auditorium",
    why: "Archive",
    how: "Cameras",
    notes: "Bring batteries",
    flow: "Setup first",
  }
}

function bookingUpdateData(): Record<string, unknown> {
  return {
    title: "Camera booking",
    bookedBy: "Craig",
    checkedOutAt: "2030-09-25T10:00:00.000Z",
    expectedReturnAt: "2030-09-25T12:00:00.000Z",
    notes: "",
    requestedEquipment: ["Camera"],
    otherEquipment: "",
  }
}

function venueUpdateData(): Record<string, unknown> {
  return {
    requestedBy: "Craig",
    venueId: "99447b5b-3f84-4ad8-a310-c257637a4a97",
    eventId: "a0cced0a-13e7-4f38-82ee-c437de61fe35",
    eventOther: null,
    slotStarts: ["2030-09-25T10:00:00.000Z"],
  }
}

describe("public submission input", () => {
  it("accepts legacy and stronger tracking codes with their separator", () => {
    assert.deepEqual(parseLookupBody({ trackingCode: "REQ-ABC123" }), { trackingCode: "REQ-ABC123" })
    assert.deepEqual(parseLookupBody({ trackingCode: "BKG-0123456789AB" }), { trackingCode: "BKG-0123456789AB" })
  })

  it("rejects malformed and extra lookup fields", () => {
    assert.equal(typeof parseLookupBody({ trackingCode: "REQABC123" }), "string")
    assert.equal(typeof parseLookupBody({ trackingCode: "REQ-ABC1234" }), "string")
    assert.equal(typeof parseLookupBody({ trackingCode: "REQ-ABC123", extra: true }), "string")
  })

  it("validates the complete type-specific update payload", () => {
    const parsed = parseUpdateBody({ trackingCode: "REQ-ABC123", type: "request", updatedAt, data: requestUpdateData() })
    assert.notEqual(typeof parsed, "string")
    const booking = parseUpdateBody({ trackingCode: "BKG-ABC123", type: "booking", updatedAt, data: bookingUpdateData() })
    assert.notEqual(typeof booking, "string")
    const venue = parseUpdateBody({ trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt, data: venueUpdateData() })
    assert.notEqual(typeof venue, "string")
    const customVenue = parseUpdateBody({
      trackingCode: "VEN-ABC123",
      type: "venue_booking",
      updatedAt,
      data: { ...venueUpdateData(), eventId: null, eventOther: "Youth night" },
    })
    assert.notEqual(typeof customVenue, "string")
  })

  it("rejects mismatched prefixes, partial data, unknown fields, and oversized text", () => {
    assert.equal(typeof parseUpdateBody({ trackingCode: "BKG-ABC123", type: "request", updatedAt, data: requestUpdateData() }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "REQ-ABC123", type: "request", updatedAt, data: { title: "Only title" } }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "REQ-ABC123", type: "request", updatedAt, data: { ...requestUpdateData(), injected: true } }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "REQ-ABC123", type: "request", updatedAt, data: { ...requestUpdateData(), title: "x".repeat(121) } }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "BKG-ABC123", type: "booking", updatedAt, data: { ...bookingUpdateData(), checkedOutAt: "2020-01-01T10:00:00.000Z" } }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt, data: { ...venueUpdateData(), eventId: null, eventOther: null } }), "string")
    assert.equal(typeof parseUpdateBody({ trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt, data: { ...venueUpdateData(), eventOther: "Also custom" } }), "string")
  })

  it("requires exact delete fields", () => {
    assert.deepEqual(parseDeleteBody({ trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt }), { trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt })
    assert.equal(typeof parseDeleteBody({ trackingCode: "VEN-ABC123", type: "venue_booking", updatedAt, extra: true }), "string")
  })
})

describe("public submission handler", () => {
  it("wires the public URL rewrite destination through the notify router", async () => {
    const result = createResponse()
    await publicNotificationRoute({
      method: "POST",
      query: { kind: "public-submissions" },
      body: { trackingCode: "invalid" },
      headers: { origin: "https://request.psape.co.za" },
    }, result.response)
    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: "Invalid tracking lookup" })
  })

  it("answers allowed preflight with the configured origin", async () => {
    const result = createResponse()
    await handlePublicSubmission(createRequest("OPTIONS"), result.response, createDeps())
    assert.equal(result.status, 204)
    assert.equal(result.headers.get("Access-Control-Allow-Origin"), "https://request.psape.co.za")
  })

  it("rejects browser calls from unconfigured origins", async () => {
    const result = createResponse()
    await handlePublicSubmission(createRequest("POST", { trackingCode: "REQ-ABC123" }, "https://evil.example"), result.response, createDeps())
    assert.equal(result.status, 403)
  })

  it("returns a tracking submission without caching it", async () => {
    const result = createResponse()
    await handlePublicSubmission(createRequest("POST", { trackingCode: "REQ-ABC123" }), result.response, createDeps())
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { submission: requestSubmission })
    assert.equal(result.headers.get("Cache-Control"), "no-store")
  })

  it("returns 404 without disclosing submission details", async () => {
    const result = createResponse()
    await handlePublicSubmission(createRequest("POST", { trackingCode: "REQ-ABC123" }), result.response, createDeps({ lookup: async () => null }))
    assert.equal(result.status, 404)
    assert.deepEqual(result.body, { error: "Submission not found" })
  })

  it("enforces fail-closed lookup rate limiting", async () => {
    const result = createResponse()
    const deps = createDeps({
      limit: async (_request, policy) => ({ allowed: false, degraded: false, limit: policy.limit, remaining: 0, retryAfterSeconds: 17 }),
    })
    await handlePublicSubmission(createRequest("POST", { trackingCode: "REQ-ABC123" }), result.response, deps)
    assert.equal(result.status, 429)
    assert.equal(result.headers.get("Retry-After"), "17")
  })

  it("returns 503 when rate-limit storage is unavailable", async () => {
    const result = createResponse()
    const deps = createDeps({ limit: async () => { throw new Error("unavailable") } })
    await handlePublicSubmission(createRequest("POST", { trackingCode: "REQ-ABC123" }), result.response, deps)
    assert.equal(result.status, 503)
  })

  it("returns the fresh submission and wakes its requester-updated outbox row", async () => {
    const calls: Array<{ entityType: string; entityId: string; eventType: NotificationEventKey }> = []
    const updated = { ...requestSubmission, title: "Updated request", updatedAt: "2026-09-20T10:00:00.000Z" }
    const result = createResponse()
    const deps = createDeps({
      update: async () => ({ entityId: requestId, submission: updated }),
      processOutbox: async (entityType, entityId, eventType) => {
        calls.push({ entityType, entityId, eventType })
        return { attempted: 1 }
      },
    })
    await handlePublicSubmission(createRequest("PATCH", { trackingCode: "REQ-ABC123", type: "request", updatedAt, data: requestUpdateData() }), result.response, deps)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { submission: updated })
    assert.deepEqual(calls, [{ entityType: "request", entityId: requestId, eventType: "request.requester_updated" }])
  })

  it("keeps a successful mutation successful when immediate notification delivery fails", async () => {
    const result = createResponse()
    const deps = createDeps({ processOutbox: async () => { throw new Error("telegram unavailable") } })
    await handlePublicSubmission(createRequest("PATCH", { trackingCode: "REQ-ABC123", type: "request", updatedAt, data: requestUpdateData() }), result.response, deps)
    assert.equal(result.status, 200)
  })

  it("maps stale, locked, invalid, and missing mutations", async () => {
    for (const [error, status] of [
      [new SubmissionStaleError(), 409],
      [new SubmissionLockedError(), 409],
      [new SubmissionInvalidError(), 400],
      [new SubmissionNotFoundError(), 404],
    ] as const) {
      const result = createResponse()
      const deps = createDeps({ update: async () => { throw error } })
      await handlePublicSubmission(createRequest("PATCH", { trackingCode: "REQ-ABC123", type: "request", updatedAt, data: requestUpdateData() }), result.response, deps)
      assert.equal(result.status, status)
    }
  })

  it("deletes and wakes the durable requester-deleted outbox row by entity id", async () => {
    const calls: Array<{ entityType: string; entityId: string; eventType: NotificationEventKey }> = []
    const result = createResponse()
    const deps = createDeps({
      delete: async () => ({ entityId: requestId }),
      processOutbox: async (entityType, entityId, eventType) => {
        calls.push({ entityType, entityId, eventType })
        return { attempted: 1 }
      },
    })
    await handlePublicSubmission(createRequest("DELETE", { trackingCode: "REQ-ABC123", type: "request", updatedAt }), result.response, deps)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { ok: true })
    assert.deepEqual(calls, [{ entityType: "request", entityId: requestId, eventType: "request.requester_deleted" }])
  })

  it("sets Allow for unsupported methods", async () => {
    const result = createResponse()
    await handlePublicSubmission(createRequest("PUT", {}), result.response, createDeps())
    assert.equal(result.status, 405)
    assert.equal(result.headers.get("Allow"), "POST, PATCH, DELETE, OPTIONS")
  })
})
