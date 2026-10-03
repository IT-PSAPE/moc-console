import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  editTelegramEphemeralMessage,
  sendTelegramEphemeralMessage,
  setTelegramManagementCommands,
} from "./telegram.js"

async function withTelegramFetch<T>(run: (calls: Array<{ url: string; body: Record<string, unknown> }>) => Promise<T>): Promise<T> {
  const previousToken = process.env.TELEGRAM_BOT_TOKEN
  const previousFetch = globalThis.fetch
  process.env.TELEGRAM_BOT_TOKEN = "test-token"
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return new Response(JSON.stringify({ ok: true, result: { message_id: 8, ephemeral_message_id: 81 } }), { status: 200 })
  }
  try {
    return await run(calls)
  } finally {
    globalThis.fetch = previousFetch
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = previousToken
  }
}

describe("ephemeral Telegram message transport", () => {
  it("sends an ephemeral message to its receiver in the original group and preserves callback context", async () => {
    await withTelegramFetch(async calls => {
      const result = await sendTelegramEphemeralMessage("-100123", "456", "Choose a field", {
        callbackQueryId: "callback-1",
        threadId: 22,
        replyMarkup: { inline_keyboard: [[{ text: "Title", callback_data: "sm:field:title" }]] },
      })

      assert.deepEqual(result, { ok: true, result: { message_id: 8, ephemeral_message_id: 81 } })
      assert.deepEqual(calls, [{
        url: "https://api.telegram.org/bottest-token/sendMessage",
        body: {
          chat_id: "-100123",
          text: "Choose a field",
          message_thread_id: 22,
          reply_markup: { inline_keyboard: [[{ text: "Title", callback_data: "sm:field:title" }]] },
          ephemeral_message_parameters: { receiver_user_id: 456, callback_query_id: "callback-1" },
        },
      }])
    })
  })

  it("does not fall back to a public send when Telegram rejects an ephemeral send", async () => {
    await withTelegramFetch(async calls => {
      globalThis.fetch = async (input, init) => {
        calls.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
        return new Response(JSON.stringify({ ok: false, error_code: 400, description: "ephemeral delivery unavailable" }), { status: 400 })
      }

      const result = await sendTelegramEphemeralMessage("-100123", "456", "Private input")

      assert.deepEqual(result, { ok: false, errorCode: 400, description: "ephemeral delivery unavailable", retryAfterSeconds: null })
      assert.equal(calls.length, 1)
      assert.equal(calls[0]?.url.endsWith("/sendMessage"), true)
      assert.deepEqual(calls[0]?.body.ephemeral_message_parameters, { receiver_user_id: 456 })
    })
  })

  it("edits only the addressed ephemeral message and does not fall back to a regular edit", async () => {
    await withTelegramFetch(async calls => {
      await editTelegramEphemeralMessage("-100123", "456", 81, "Enter the title", {
        inline_keyboard: [[{ text: "Cancel", callback_data: "sm:cancel" }]],
      })

      assert.deepEqual(calls, [{
        url: "https://api.telegram.org/bottest-token/editEphemeralMessageText",
        body: {
          chat_id: "-100123",
          receiver_user_id: 456,
          ephemeral_message_id: 81,
          text: "Enter the title",
          reply_markup: { inline_keyboard: [[{ text: "Cancel", callback_data: "sm:cancel" }]] },
        },
      }])
    })
  })

  it("does not fall back to a public or ordinary edit when Telegram rejects an ephemeral edit", async () => {
    await withTelegramFetch(async calls => {
      globalThis.fetch = async (input, init) => {
        calls.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
        return new Response(JSON.stringify({ ok: false, error_code: 400, description: "ephemeral message expired" }), { status: 400 })
      }

      const result = await editTelegramEphemeralMessage("-100123", "456", 81, "Replacement")

      assert.deepEqual(result, { ok: false, errorCode: 400, description: "ephemeral message expired", retryAfterSeconds: null })
      assert.equal(calls.length, 1)
      assert.equal(calls[0]?.url.endsWith("/editEphemeralMessageText"), true)
    })
  })

  it("keeps ForceReply ephemeral in its group chat instead of moving the input prompt to a DM", async () => {
    await withTelegramFetch(async calls => {
      await sendTelegramEphemeralMessage("-100123", "456", "Enter the replacement value", { forceReply: true })

      assert.equal(calls.length, 1)
      assert.equal(calls[0]?.url.endsWith("/sendMessage"), true)
      assert.equal(calls[0]?.body.chat_id, "-100123")
      assert.deepEqual(calls[0]?.body.ephemeral_message_parameters, { receiver_user_id: 456 })
      assert.deepEqual(calls[0]?.body.reply_markup, {
        force_reply: true,
        input_field_placeholder: "Enter the replacement value",
      })
    })
  })

  it("keeps command registration scoped to one Telegram member and marks the command ephemeral", async () => {
    await withTelegramFetch(async calls => {
      await setTelegramManagementCommands("-100123", "456", true)

      assert.equal(calls.length, 1)
      assert.equal(calls[0]?.url.endsWith("/setMyCommands"), true)
      assert.deepEqual(calls[0]?.body, {
        commands: [{ command: "manage_messages", description: "Manage active MOC messages", is_ephemeral: true }],
        scope: { type: "chat_member", chat_id: "-100123", user_id: 456 },
      })
    })
  })

  it("removes only the specified member's scoped management commands", async () => {
    await withTelegramFetch(async calls => {
      await setTelegramManagementCommands("-100123", "456", false)

      assert.equal(calls.length, 1)
      assert.equal(calls[0]?.url.endsWith("/setMyCommands"), true)
      assert.deepEqual(calls[0]?.body, {
        commands: [],
        scope: { type: "chat_member", chat_id: "-100123", user_id: 456 },
      })
    })
  })
})
