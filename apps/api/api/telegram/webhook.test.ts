import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { telegramWebhookRateLimitSubject } from "./webhook.js"

describe("telegramWebhookRateLimitSubject", () => {
  it("uses the Telegram chat as the stable subject when present", () => {
    const fromFirstRelay = telegramWebhookRateLimitSubject({
      body: { message: { chat: { id: -100_123 } } },
      headers: { "x-forwarded-for": "192.0.2.1" },
    })
    const fromSecondRelay = telegramWebhookRateLimitSubject({
      body: { edited_message: { chat: { id: -100_123 } } },
      headers: { "x-forwarded-for": "192.0.2.2" },
    })

    assert.equal(fromFirstRelay, fromSecondRelay)
  })

  it("falls back to the request client hash for chatless updates", () => {
    const first = telegramWebhookRateLimitSubject({ headers: { "x-forwarded-for": "192.0.2.1" } })
    const second = telegramWebhookRateLimitSubject({ headers: { "x-forwarded-for": "192.0.2.2" } })

    assert.notEqual(first, second)
  })
})
