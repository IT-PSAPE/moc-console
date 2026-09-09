import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"

import { headerValue } from "../http.js"
import {
  canonicalJson,
  parseSignedIngestBody,
  verifyNotificationIngestSignature,
} from "./signed-ingest.js"
import { parseSignedIngestMetadata, signedIngestRateLimitSubject } from "./signed-ingest-replay.js"

const REQUEST_EVENTS = ["request.created", "request.status_changed", "request.archived"] as const
const REQUEST_ID = "99447b5b-3f84-4ad8-a310-c257637a4a97"
const NONCE = "9e0a9dd6-cb87-48e0-91fa-90a0bb2e6f39"

function signature(body: unknown, timestamp: string, nonce: string): string {
  const payload = canonicalJson(body)
  assert.ok(payload)
  return createHmac("sha256", "test-secret").update(`${timestamp}.${nonce}.${payload}`).digest("hex")
}

describe("signed notification ingest", () => {
  it("signs a stable canonical representation rather than caller key order", () => {
    const first = { event_type: "request.status_changed", request_id: REQUEST_ID, status: "approved" }
    const second = { status: "approved", request_id: REQUEST_ID, event_type: "request.status_changed" }
    const timestamp = `${Math.floor(Date.now() / 1_000)}`

    assert.equal(canonicalJson(first), canonicalJson(second))
    assert.equal(
      verifyNotificationIngestSignature(second, signature(first, timestamp, NONCE), timestamp, NONCE, "test-secret"),
      true,
    )
  })

  it("requires a current timestamp and a UUID nonce before a replay claim", () => {
    const now = Date.UTC(2026, 7, 5, 12, 0, 0)
    assert.deepEqual(parseSignedIngestMetadata("1785931200", NONCE, now), {
      timestamp: "1785931200",
      nonce: NONCE,
      expiresAt: "2026-08-05T12:10:00.000Z",
    })
    assert.equal(parseSignedIngestMetadata("1785930800", NONCE, now), null)
    assert.equal(parseSignedIngestMetadata("1785931200", "not-a-nonce", now), null)
  })

  it("accepts only known bounded event payloads", () => {
    assert.deepEqual(
      parseSignedIngestBody(
        { event_type: "request.status_changed", request_id: REQUEST_ID, status: "approved" },
        REQUEST_EVENTS,
        "request_id",
      ),
      { eventType: "request.status_changed", entityId: REQUEST_ID, status: "approved" },
    )
    assert.equal(
      parseSignedIngestBody({ event_type: "request.status_changed", request_id: REQUEST_ID }, REQUEST_EVENTS, "request_id"),
      null,
    )
    assert.equal(
      parseSignedIngestBody(
        { event_type: "request.created", request_id: REQUEST_ID, destination: "injected" },
        REQUEST_EVENTS,
        "request_id",
      ),
      null,
    )
    assert.equal(
      parseSignedIngestBody(
        { event_type: "request.deleted", request_id: REQUEST_ID },
        REQUEST_EVENTS,
        "request_id",
      ),
      null,
    )
  })

  it("keeps replay identifiers stable for the database claim", () => {
    const now = Date.UTC(2026, 7, 5, 12, 0, 0)
    const first = parseSignedIngestMetadata("1785931200", NONCE, now)
    const retry = parseSignedIngestMetadata("1785931200", NONCE, now)
    assert.ok(first)
    assert.deepEqual(retry, first)
  })

  it("finds signature headers regardless of the runtime header casing", () => {
    assert.equal(headerValue({ "X-Notification-Nonce": NONCE }, "x-notification-nonce"), NONCE)
  })

  it("uses a fixed endpoint rate-limit bucket independent of caller entity IDs", () => {
    const firstRequest = { body: { request_id: REQUEST_ID }, headers: { "x-forwarded-for": "192.0.2.1" } }
    const secondRequest = {
      body: { request_id: "3a42ddbd-4878-47a0-b7fd-c671319a24ac" },
      headers: { "x-forwarded-for": "192.0.2.1" },
    }
    assert.equal(
      signedIngestRateLimitSubject(firstRequest, "request"),
      signedIngestRateLimitSubject(secondRequest, "request"),
    )
    assert.notEqual(
      signedIngestRateLimitSubject(firstRequest, "request"),
      signedIngestRateLimitSubject(firstRequest, "booking"),
    )
  })
})
