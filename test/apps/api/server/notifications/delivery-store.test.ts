import assert from "node:assert/strict"
import { describe, it, vi } from "vitest"
import { runWithSqlFixture, setSqlFixture } from "../sql-fixture.js"

const { deliveryRetryAt, processDeliveriesForEvent } = await import("../../../../../apps/api/server/notifications/delivery-store.js")

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

describe("request delivery keyboard", () => {
  it("rechecks old assignment DMs at send time and repairs a change during the send", () => runWithSqlFixture(async () => {
    const requestId = "61000000-0000-4000-8000-000000000001"
    const eventKey = "assignment.request:old-assignment"
    const start = { text: "Start", callback_data: `a:rq:start:${requestId}` }
    let status = "in_progress"
    const calls: Array<{ method: string; body: Record<string, unknown> }> = []
    setSqlFixture({ queryRows: async (sql) => {
      if (sql.includes("SELECT id FROM public.notification_deliveries")) return [{ id: "old-dm" }]
      if (sql.includes("SET status='processing'")) return [{
        id: "old-dm", scope: "dm", event_key: eventKey, event_type: null, entity_type: null, entity_id: null,
        chat_id: "assignee", text: "Your request assignment", payload: { parentId: requestId },
        attempt_count: 0, parent_delivery_id: null, reply_markup: { inline_keyboard: [[start]] },
      }]
      if (sql.startsWith("SELECT status FROM public.requests")) return [{ status }]
      return []
    } })
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "moc_test_bot")
    vi.stubGlobal("fetch", async (url: string, request: RequestInit) => {
      const method = url.split("/").at(-1) ?? ""
      calls.push({ method, body: JSON.parse(String(request.body)) as Record<string, unknown> })
      if (method === "sendRichMessage") status = "completed"
      return Response.json({ ok: true, result: { message_id: 21 } })
    })
    try {
      assert.equal((await processDeliveriesForEvent(eventKey)).sent, 1)
      assert.deepEqual(calls.map(call => call.method), ["sendRichMessage", "editMessageReplyMarkup"])
      const sent = JSON.stringify(calls[0].body.reply_markup)
      assert.ok(sent.includes(":complete:") && !sent.includes(":start:"))
      const edited = JSON.stringify(calls[1].body.reply_markup)
      assert.ok(edited.includes("View") && !edited.includes("callback_data"))
    } finally {
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    }
  }))
})
