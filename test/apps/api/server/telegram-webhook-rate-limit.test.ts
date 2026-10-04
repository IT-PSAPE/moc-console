import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { telegramWebhookRateLimitSubject } from "../../../../apps/api/server/telegram-webhook.js"

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

  it("uses the callback_query sender as the stable subject when there is no chat", () => {
    const first = telegramWebhookRateLimitSubject({
      body: { callback_query: { from: { id: 9001 } } },
      headers: { "x-forwarded-for": "192.0.2.1" },
    })
    const second = telegramWebhookRateLimitSubject({
      body: { callback_query: { from: { id: 9001 } } },
      headers: { "x-forwarded-for": "192.0.2.2" },
    })

    assert.equal(first, second)
  })

  it("falls back to the request client hash for chatless updates", () => {
    const first = telegramWebhookRateLimitSubject({ headers: { "x-forwarded-for": "192.0.2.1" } })
    const second = telegramWebhookRateLimitSubject({ headers: { "x-forwarded-for": "192.0.2.2" } })

    assert.notEqual(first, second)
  })
})
