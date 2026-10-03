import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { syncManagementCommands } from "./commands.js"

describe("syncManagementCommands", () => {
  it("registers ephemeral management commands only for linked updaters, scoped to their group membership", async () => {
    const previousFetch = globalThis.fetch
    const previousUrl = process.env.VITE_SUPABASE_URL
    const previousKey = process.env.SUPABASE_SECRET_KEY
    const previousTelegramToken = process.env.TELEGRAM_BOT_TOKEN
    process.env.VITE_SUPABASE_URL = "https://supabase.test"
    process.env.SUPABASE_SECRET_KEY = "test-service-key"
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token"
    const calls: Array<{ url: string; body: Record<string, unknown> | null }> = []

    globalThis.fetch = async (input, init) => {
      const url = String(input)
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null
      calls.push({ url, body })
      if (url.startsWith("https://api.telegram.org/")) {
        return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
      }
      const path = new URL(url).pathname
      if (path.endsWith("/telegram_groups")) {
        return new Response(JSON.stringify([{ chat_id: "-100123", workspace_id: "workspace-1" }]), { status: 200 })
      }
      if (path.endsWith("/workspace_users")) {
        return new Response(JSON.stringify([
          { users: { telegram_chat_id: "456" }, roles: { can_update: true } },
          { users: { telegram_chat_id: "789" }, roles: { can_update: false } },
          { users: { telegram_chat_id: null }, roles: { can_update: true } },
        ]), { status: 200 })
      }
      return new Response(JSON.stringify({ message: `Unexpected request ${url}` }), { status: 500 })
    }

    try {
      assert.deepEqual(await syncManagementCommands(), { failed: 0 })

      const telegramCalls = calls.filter(call => call.url.startsWith("https://api.telegram.org/"))
      assert.deepEqual(telegramCalls.map(call => call.url.split("/").pop()), ["setMyCommands", "setMyCommands"])
      assert.deepEqual(telegramCalls.map(call => call.body), [
        {
          scope: { type: "chat_member", chat_id: "-100123", user_id: 456 },
          commands: [{ command: "manage_messages", description: "Manage active MOC messages", is_ephemeral: true }],
        },
        {
          scope: { type: "chat_member", chat_id: "-100123", user_id: 789 },
          commands: [],
        },
      ])
    } finally {
      globalThis.fetch = previousFetch
      if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
      else process.env.VITE_SUPABASE_URL = previousUrl
      if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY
      else process.env.SUPABASE_SECRET_KEY = previousKey
      if (previousTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = previousTelegramToken
    }
  })
})
