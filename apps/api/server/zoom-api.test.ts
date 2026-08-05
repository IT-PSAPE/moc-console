import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ProviderUpstreamError } from "./provider-failure.js"
import { sanitizeZoomProxyResponseBody } from "./zoom-api.js"

function sanitizedJson(value: unknown): unknown {
  return JSON.parse(sanitizeZoomProxyResponseBody(Buffer.from(JSON.stringify(value))).toString("utf8"))
}

describe("sanitizeZoomProxyResponseBody", () => {
  it("removes host start URLs from meeting responses without changing normal fields", () => {
    const response = sanitizedJson({
      id: 123,
      join_url: "https://zoom.us/j/123",
      start_url: "https://zoom.us/s/host-secret",
      occurrences: [{ occurrence_id: "one", start_url: "https://zoom.us/s/occurrence-secret" }],
      meetings: [{ id: 456, topic: "Planning", start_url: "https://zoom.us/s/list-secret" }],
    })

    assert.deepEqual(response, {
      id: 123,
      join_url: "https://zoom.us/j/123",
      occurrences: [{ occurrence_id: "one" }],
      meetings: [{ id: 456, topic: "Planning" }],
    })
  })

  it("preserves an empty response and fails closed for malformed provider JSON", () => {
    assert.deepEqual(sanitizeZoomProxyResponseBody(Buffer.alloc(0)), Buffer.alloc(0))
    assert.throws(() => sanitizeZoomProxyResponseBody(Buffer.from("not-json")), ProviderUpstreamError)
  })
})
