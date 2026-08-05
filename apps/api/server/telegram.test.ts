import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { sendTelegramMessageDetailed } from "./telegram.js"

describe("sendTelegramMessageDetailed", () => {
  it("uses a cancellable request and returns the Telegram result", async () => {
    const previousToken = process.env.TELEGRAM_BOT_TOKEN
    const previousFetch = globalThis.fetch
    process.env.TELEGRAM_BOT_TOKEN = "test-token"

    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /bottest-token\/sendMessage$/)
      assert.ok(init?.signal instanceof AbortSignal)
      assert.deepEqual(JSON.parse(String(init?.body)), {
        chat_id: 42,
        text: "Hello",
        message_thread_id: 9,
      })
      return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 })
    }

    try {
      assert.deepEqual(await sendTelegramMessageDetailed(42, "Hello", { threadId: 9 }), {
        ok: true,
        result: { message_id: 7 },
      })
    } finally {
      globalThis.fetch = previousFetch
      if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = previousToken
    }
  })

  it("returns a retryable failure when the request aborts", async () => {
    const previousToken = process.env.TELEGRAM_BOT_TOKEN
    const previousFetch = globalThis.fetch
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    globalThis.fetch = async () => {
      throw new DOMException("The operation was aborted", "AbortError")
    }

    try {
      const result = await sendTelegramMessageDetailed(42, "Hello")
      assert.equal(result.ok, false)
      assert.equal(result.errorCode, null)
    } finally {
      globalThis.fetch = previousFetch
      if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = previousToken
    }
  })
})
