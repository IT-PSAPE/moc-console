import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { processPendingDeliveries } from "../notifications/delivery-store.js"

type RecordedRequest = { url: string; method: string; body: Record<string, unknown> | null }

function occurrence(id: string, messageId: number | null) {
  return {
    id,
    workspace_id: "workspace-1",
    schedule_id: "schedule-1",
    occurrence_on: "2026-10-03",
    send_on: "2026-10-03T08:00:00.000Z",
    expires_at: "2026-10-03T12:00:00.000Z",
    fields: { title: `Title ${id}`, instructions: "Please join" },
    body: "<b>{{title}}</b>\n{{instructions}}",
    message_type: "announcement",
    require_arrival: false,
    state: messageId === null ? "sending" : "sent",
    revision: 3,
    synced_revision: 2,
    telegram_message_id: messageId,
    last_sync_error: null,
  }
}

describe("scheduled delivery through the shared notification queue", () => {
  it("sends new occurrences and edits sent occurrences in place", async () => {
    const previousFetch = globalThis.fetch
    const previousUrl = process.env.VITE_SUPABASE_URL
    const previousKey = process.env.SUPABASE_SECRET_KEY
    const previousTelegramToken = process.env.TELEGRAM_BOT_TOKEN
    process.env.VITE_SUPABASE_URL = "https://supabase.test"
    process.env.SUPABASE_SECRET_KEY = "test-service-key"
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token"
    const requests: RecordedRequest[] = []
    const claimedRows = new Map([
      ["delivery-send", {
        id: "delivery-send", workspace_id: "workspace-1", event_key: "scheduled:send", event_type: null,
        scope: "group", route_id: null, recipient_user_id: null, destination_key: "group:-1001:55",
        chat_id: "-1001", thread_id: 55, text: "ignored snapshot text", payload: {}, attempt_count: 0,
        entity_type: null, entity_id: null, reply_markup: null, parent_delivery_id: null, scheduled_operation: "send",
      }],
      ["delivery-edit", {
        id: "delivery-edit", workspace_id: "workspace-1", event_key: "scheduled:edit", event_type: null,
        scope: "group", route_id: null, recipient_user_id: null, destination_key: "group:-1002:77",
        chat_id: "-1002", thread_id: 77, text: "ignored snapshot text", payload: {}, attempt_count: 0,
        entity_type: null, entity_id: null, reply_markup: null, parent_delivery_id: null, scheduled_operation: "edit",
      }],
    ])

    globalThis.fetch = async (input, init) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null
      requests.push({ url, method, body })

      if (url.startsWith("https://api.telegram.org/")) {
        const telegramMethod = url.split("/").pop()
        if (telegramMethod === "sendRichMessage") {
          return new Response(JSON.stringify({ ok: true, result: { message_id: 901 } }), { status: 200 })
        }
        if (telegramMethod === "editMessageText") {
          return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
        }
        return new Response(JSON.stringify({ ok: false, error_code: 500, description: `Unexpected Telegram method ${telegramMethod}` }), { status: 500 })
      }

      const path = new URL(url).pathname
      if (path.endsWith("/rpc/recover_scheduled_deliveries")) return new Response("null", { status: 200 })
      if (path.endsWith("/rpc/begin_scheduled_delivery")) {
        const deliveryId = body?.p_delivery
        const editing = deliveryId === "delivery-edit"
        return new Response(JSON.stringify({
          occurrence: occurrence(editing ? "occurrence-edit" : "occurrence-send", editing ? 902 : null),
          responses: [],
          expired: false,
        }), { status: 200 })
      }
      if (path.endsWith("/rpc/finish_scheduled_delivery")) return new Response("null", { status: 200 })
      if (path.endsWith("/notification_deliveries") && method === "GET") {
        return new Response(JSON.stringify([{ id: "delivery-send" }, { id: "delivery-edit" }]), { status: 200 })
      }
      if (path.endsWith("/notification_deliveries") && method === "PATCH" && url.includes("select=")) {
        const selectedId = new URL(url).searchParams.get("id")?.replace("eq.", "")
        const row = selectedId ? claimedRows.get(selectedId) : null
        return new Response(JSON.stringify(row ? [row] : []), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      if (path.endsWith("/notification_deliveries") && method === "PATCH") return new Response(null, { status: 204 })
      return new Response(JSON.stringify({ message: `Unexpected request ${method} ${url}` }), { status: 500 })
    }

    try {
      const result = await processPendingDeliveries(10)

      assert.deepEqual(result, { attempted: 2, sent: 2, failed: 0, pendingRetry: 0 })
      const telegramRequests = requests.filter(request => request.url.startsWith("https://api.telegram.org/"))
      assert.deepEqual(telegramRequests.map(request => request.url.split("/").pop()), ["sendRichMessage", "editMessageText"])
      assert.deepEqual(telegramRequests[0]?.body, {
        chat_id: "-1001",
        rich_message: { html: "<p><b>Title occurrence-send</b><br>Please join</p>" },
        message_thread_id: 55,
      })
      assert.equal(telegramRequests[1]?.body?.chat_id, "-1002")
      assert.equal(telegramRequests[1]?.body?.message_id, 902)
      assert.deepEqual(
        requests.filter(request => request.url.endsWith("/rpc/finish_scheduled_delivery")).map(request => request.body?.p_message),
        [901, null],
      )
      assert.deepEqual(
        requests.filter(request => new URL(request.url).pathname.endsWith("/notification_deliveries") && request.method === "PATCH" && request.body?.status === "sent").map(request => request.body?.telegram_message_id),
        [901, 902],
      )
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
