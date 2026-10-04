import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { getTelegramUpdateId, mapTelegramWebhookClaim } from "../../../../apps/api/server/telegram-webhook-inbox.js"

describe("getTelegramUpdateId", () => {
  it("accepts Telegram's integer update identifiers", () => {
    assert.equal(getTelegramUpdateId({ update_id: 0 }), 0)
    assert.equal(getTelegramUpdateId({ update_id: 123_456 }), 123_456)
  })

  it("rejects malformed or unsafe identifiers", () => {
    assert.equal(getTelegramUpdateId(null), null)
    assert.equal(getTelegramUpdateId({}), null)
    assert.equal(getTelegramUpdateId({ update_id: "123" }), null)
    assert.equal(getTelegramUpdateId({ update_id: -1 }), null)
    assert.equal(getTelegramUpdateId({ update_id: Number.MAX_SAFE_INTEGER + 1 }), null)
  })
})

describe("mapTelegramWebhookClaim", () => {
  it("reads an in-flight duplicate as in_progress, whichever spelling the database returns", () => {
    assert.equal(mapTelegramWebhookClaim("in_progress"), "in_progress")
    assert.equal(mapTelegramWebhookClaim("processing"), "in_progress")
  })

  it("passes claimed and processed through and rejects anything else", () => {
    assert.equal(mapTelegramWebhookClaim("claimed"), "claimed")
    assert.equal(mapTelegramWebhookClaim("processed"), "processed")
    assert.equal(mapTelegramWebhookClaim("failed"), null)
    assert.equal(mapTelegramWebhookClaim(null), null)
  })
})
