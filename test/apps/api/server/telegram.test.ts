import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  answerTelegramCallbackQuery,
  deleteTelegramMessage,
  editTelegramRichMessage,
  getTelegramBotUsername,
  sendTelegramMessageDetailed,
  sendTelegramRichMessage,
} from "../../../../apps/api/server/telegram.js"

function withToken<T>(run: () => Promise<T>): Promise<T> {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN
  const previousFetch = globalThis.fetch
  process.env.TELEGRAM_BOT_TOKEN = "test-token"
  return run().finally(() => {
    globalThis.fetch = previousFetch
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = previousToken
  })
}

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

describe("sendTelegramRichMessage", () => {
  it("sends rich_message with a keyboard and reply parameters", () => withToken(async () => {
    let calledMethod: string | null = null
    globalThis.fetch = async (input, init) => {
      calledMethod = String(input).split("/").pop() ?? null
      assert.deepEqual(JSON.parse(String(init?.body)), {
        chat_id: 42,
        rich_message: { html: "<p>Hello</p>" },
        message_thread_id: 9,
        reply_markup: { inline_keyboard: [[{ text: "Start", callback_data: "a:rq:start:1" }]] },
        reply_parameters: { message_id: 5, allow_sending_without_reply: true },
      })
      return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 })
    }

    const result = await sendTelegramRichMessage(42, "<p>Hello</p>", {
      threadId: 9,
      replyToMessageId: 5,
      replyMarkup: { inline_keyboard: [[{ text: "Start", callback_data: "a:rq:start:1" }]] },
    })

    assert.equal(calledMethod, "sendRichMessage")
    assert.deepEqual(result, { ok: true, result: { message_id: 7 } })
  }))

  it("falls back to sendMessage with legacy HTML on HTTP 400", () => withToken(async () => {
    const calledMethods: string[] = []
    globalThis.fetch = async (input, init) => {
      const method = String(input).split("/").pop() ?? ""
      calledMethods.push(method)
      if (method === "sendRichMessage") {
        return new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: unsupported tag" }), { status: 400 })
      }
      const body = JSON.parse(String(init?.body))
      assert.equal(body.parse_mode, "HTML")
      assert.equal(typeof body.text, "string")
      return new Response(JSON.stringify({ ok: true, result: { message_id: 11 } }), { status: 200 })
    }

    const result = await sendTelegramRichMessage(42, "<mark>Hi</mark>")

    assert.deepEqual(calledMethods, ["sendRichMessage", "sendMessage"])
    assert.deepEqual(result, { ok: true, result: { message_id: 11 } })
  }))
})

describe("editTelegramRichMessage", () => {
  it("edits the message with rich_message", () => withToken(async () => {
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body))
      assert.equal(body.message_id, 3)
      assert.deepEqual(body.rich_message, { html: "<p>Updated</p>" })
      return new Response(JSON.stringify({ ok: true, result: null }), { status: 200 })
    }

    const result = await editTelegramRichMessage(42, 3, "<p>Updated</p>", null)
    assert.deepEqual(result, { ok: true, result: null })
  }))

  it("treats 'message is not modified' as ok", () => withToken(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: message is not modified" }), { status: 400 })

    const result = await editTelegramRichMessage(42, 3, "<p>Same</p>", null)
    assert.deepEqual(result, { ok: true, result: null })
  }))

  it("falls back to a legacy text edit on HTTP 400", () => withToken(async () => {
    const calls: Array<Record<string, unknown>> = []
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body))
      calls.push(body)
      if (calls.length === 1) {
        return new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: unsupported tag" }), { status: 400 })
      }
      assert.equal(body.parse_mode, "HTML")
      return new Response(JSON.stringify({ ok: true, result: null }), { status: 200 })
    }

    const result = await editTelegramRichMessage(42, 3, "<mark>Hi</mark>", null)
    assert.equal(calls.length, 2)
    assert.deepEqual(result, { ok: true, result: null })
  }))
})

describe("deleteTelegramMessage", () => {
  it("reports success", () => withToken(async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    assert.deepEqual(await deleteTelegramMessage(42, 3), { ok: true })
  }))

  it("reports the failure description when Telegram refuses", () => withToken(async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request: message can't be deleted" }), { status: 400 })
    assert.deepEqual(await deleteTelegramMessage(42, 3), { ok: false, description: "Bad Request: message can't be deleted" })
  }))
})

describe("answerTelegramCallbackQuery", () => {
  it("posts a short toast without show_alert", () => withToken(async () => {
    globalThis.fetch = async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), { callback_query_id: "cb1", text: "Started ✓" })
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    }
    await answerTelegramCallbackQuery("cb1", { text: "Started ✓" })
  }))

  it("posts show_alert when requested", () => withToken(async () => {
    globalThis.fetch = async (_input, init) => {
      assert.deepEqual(JSON.parse(String(init?.body)), { callback_query_id: "cb2", text: "Nope", show_alert: true })
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    }
    await answerTelegramCallbackQuery("cb2", { text: "Nope", showAlert: true })
  }))

  it("swallows transport failures", () => withToken(async () => {
    globalThis.fetch = async () => {
      throw new Error("network down")
    }
    await answerTelegramCallbackQuery("cb3")
  }))
})

describe("getTelegramBotUsername", () => {
  it("strips a leading @ and trims whitespace", () => {
    const previous = process.env.TELEGRAM_BOT_USERNAME
    process.env.TELEGRAM_BOT_USERNAME = " @moc_console_bot "
    try {
      assert.equal(getTelegramBotUsername(), "moc_console_bot")
    } finally {
      if (previous === undefined) delete process.env.TELEGRAM_BOT_USERNAME
      else process.env.TELEGRAM_BOT_USERNAME = previous
    }
  })

  it("returns null when unset", () => {
    const previous = process.env.TELEGRAM_BOT_USERNAME
    delete process.env.TELEGRAM_BOT_USERNAME
    try {
      assert.equal(getTelegramBotUsername(), null)
    } finally {
      if (previous !== undefined) process.env.TELEGRAM_BOT_USERNAME = previous
    }
  })
})
