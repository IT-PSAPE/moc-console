import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { getTelegramUpdateId } from "./telegram-webhook-inbox.js"

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
