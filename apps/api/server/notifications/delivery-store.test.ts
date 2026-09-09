import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { deliveryRetryAt } from "./delivery-store.js"

describe("deliveryRetryAt", () => {
  const now = new Date("2026-08-05T01:00:00.000Z")

  it("defers ordinary failed deliveries to the next guaranteed daily worker", () => {
    assert.equal(deliveryRetryAt(null, now), "2026-08-06T01:00:00.000Z")
    assert.equal(deliveryRetryAt(30, now), "2026-08-06T01:00:00.000Z")
  })

  it("honours a provider retry-after that exceeds the daily retry interval", () => {
    assert.equal(deliveryRetryAt(172_800, now), "2026-08-07T01:00:00.000Z")
  })
})
