import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { deliveryRetryAt } from "../../../../../apps/api/server/notifications/delivery-store.js"

describe("deliveryRetryAt", () => {
  const now = new Date("2026-08-05T01:00:00.000Z")

  it("makes ordinary failures eligible for retry after a short backoff", () => {
    assert.equal(deliveryRetryAt(null, now), "2026-08-05T01:02:00.000Z")
    assert.equal(deliveryRetryAt(30, now), "2026-08-05T01:02:00.000Z")
  })

  it("honours a longer provider retry-after", () => {
    assert.equal(deliveryRetryAt(300, now), "2026-08-05T01:05:00.000Z")
  })
})
