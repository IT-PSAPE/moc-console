import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { processPendingDeliveries } from "../../../../../apps/api/server/notifications/delivery-store.js"

type Scenario = "removed-destination-and-valid-row" | "ambiguous-send" | "network-throw" | "missing-token" | "expire-edit" | "resend" | "ambiguous-resend"
type Call = { url: string; method: string; body: Record<string, unknown> | null }

function makeOccurrence(id: string, messageId: number | null) {
  return {
    id,
    workspace_id: "workspace-1",
    schedule_id: "schedule-1",
    occurrence_on: "2026-10-03",
    send_on: "2026-10-03T08:00:00.000Z",
    expires_at: "2026-10-03T12:00:00.000Z",
    fields: { title: "Service briefing", instructions: "Meet at the entrance" },
    body: "<b>{{title}}</b>\n{{instructions}}",
    message_type: "pre_attendance",
    require_arrival: false,
    state: messageId === null ? "scheduled" : "sent",
    revision: 4,
    synced_revision: 3,
    telegram_message_id: messageId,
    last_sync_error: null,
  }
}

async function runQueueScenario(scenario: Scenario) {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env.VITE_SUPABASE_URL
  const previousKey = process.env.SUPABASE_SECRET_KEY
  const previousTelegramToken = process.env.TELEGRAM_BOT_TOKEN
  process.env.VITE_SUPABASE_URL = "https://supabase.test"
  process.env.SUPABASE_SECRET_KEY = "test-service-key"
  if (scenario === "missing-token") delete process.env.TELEGRAM_BOT_TOKEN
  else process.env.TELEGRAM_BOT_TOKEN = "test-bot-token"
  const calls: Call[] = []
  const ids = scenario === "removed-destination-and-valid-row"
    ? ["removed-delivery", "valid-delivery"]
    : [scenario === "expire-edit" ? "expiry-delivery" : "ambiguous-delivery"]
  const rows = new Map(ids.map((id, index) => [id, {
    id,
    workspace_id: "workspace-1",
    event_key: `scheduled:${id}`,
    event_type: null,
    scope: "group",
    route_id: null,
    recipient_user_id: null,
    destination_key: "group:-100123:22",
    chat_id: "-100123",
    thread_id: 22,
    text: "Snapshot body is rebuilt from the occurrence",
    payload: {},
    attempt_count: 0,
    entity_type: null,
    entity_id: null,
    reply_markup: null,
    parent_delivery_id: null,
    scheduled_operation: scenario.includes("resend") ? "resend" : scenario === "expire-edit" ? "expire" : "send",
    scheduled_occurrence_id: id.replace("delivery", "occurrence"),
    index,
  }]))

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null
    calls.push({ url, method, body })

    if (url.startsWith("https://api.telegram.org/")) {
      const telegramMethod = url.split("/").pop()
      if (telegramMethod === "sendRichMessage") {
        if (scenario === "network-throw") throw new Error("connection reset after request started")
        return new Response(JSON.stringify((scenario === "ambiguous-send" || scenario === "ambiguous-resend")
          ? { ok: true, result: { message_id: undefined } }
          : { ok: true, result: { message_id: 920 } }), { status: 200 })
      }
      if (telegramMethod === "editMessageText") return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
      return new Response(JSON.stringify({ ok: false, error_code: 500, description: `Unexpected Telegram method ${telegramMethod}` }), { status: 500 })
    }

    const requestUrl = new URL(url)
    const path = requestUrl.pathname
    if (path.endsWith("/rpc/recover_scheduled_deliveries")) return new Response("null", { status: 200 })
    if (path.endsWith("/rpc/begin_scheduled_delivery")) {
      const id = String(body?.p_delivery)
      if (scenario === "removed-destination-and-valid-row" && id === "removed-delivery") {
        return new Response(JSON.stringify({ message: "Destination unavailable: group was removed" }), { status: 400 })
      }
      const isExpiry = scenario === "expire-edit"
      return new Response(JSON.stringify({
        occurrence: { ...makeOccurrence(isExpiry ? "occurrence-expiry" : `occurrence-${id}`, isExpiry || scenario.includes("resend") ? 905 : null), attendance_groups: scenario.includes("resend") ? [{ id: "00000000-0000-4000-8000-000000000011", label: "Noon" }, { id: "00000000-0000-4000-8000-000000000012", label: "Evening" }] : [] },
        responses: [{ name: "Alex Member", status: scenario.includes("resend") ? "attending" : "awaiting", arrival_time: scenario.includes("resend") ? "07:30" : null, group_id: scenario.includes("resend") ? "00000000-0000-4000-8000-000000000011" : null }],
        expired: isExpiry,
      }), { status: 200 })
    }
    if (path.endsWith("/rpc/finish_scheduled_delivery")) return new Response("null", { status: 200 })
    if (path.endsWith("/notification_deliveries") && method === "GET") {
      if (requestUrl.searchParams.has("id") && requestUrl.searchParams.get("select") === "scheduled_occurrence_id") {
        const id = requestUrl.searchParams.get("id")?.replace("eq.", "") ?? ""
        return new Response(JSON.stringify({ scheduled_occurrence_id: id === "removed-delivery" ? "occurrence-removed" : null }), { status: 200 })
      }
      return new Response(JSON.stringify(ids.map(id => ({ id }))), { status: 200 })
    }
    if (path.endsWith("/notification_deliveries") && method === "PATCH" && requestUrl.searchParams.has("select")) {
      const id = requestUrl.searchParams.get("id")?.replace("eq.", "")
      const row = id ? rows.get(id) : null
      return new Response(JSON.stringify(row ? [row] : []), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    if (path.endsWith("/notification_deliveries") && method === "PATCH") return new Response(null, { status: 204 })
    if (path.endsWith("/scheduled_message_occurrences") && method === "PATCH") return new Response(null, { status: 204 })
    return new Response(JSON.stringify({ message: `Unexpected request ${method} ${url}` }), { status: 500 })
  }

  try {
    const result = await processPendingDeliveries(10)
    return { result, calls }
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY
    else process.env.SUPABASE_SECRET_KEY = previousKey
    if (previousTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = previousTelegramToken
  }
}

describe("scheduled delivery failure and expiry edges", () => {
  it("resends the current content and saved attendance to a new Telegram message", async () => {
    const { result, calls } = await runQueueScenario("resend")
    assert.deepEqual(result, { attempted: 1, sent: 1, failed: 0, pendingRetry: 0 })
    const telegram = calls.filter(call => call.url.startsWith("https://api.telegram.org/"))
    assert.deepEqual(telegram.map(call => call.url.split("/").pop()), ["sendRichMessage"])
    assert.equal(telegram[0]?.body?.message_thread_id, 22)
    assert.match(JSON.stringify(telegram[0]?.body), /Service briefing/)
    assert.match(JSON.stringify(telegram[0]?.body), /Noon/)
    assert.match(JSON.stringify(telegram[0]?.body), /✅ Alex Member — 07:30/)
    const finish = calls.find(call => call.url.endsWith("/rpc/finish_scheduled_delivery"))
    assert.equal(finish?.body?.p_message, 920)
    assert.equal(finish?.body?.p_ambiguous, false)
  })

  it("does not automatically retry a resend without a returned message ID", async () => {
    const { result, calls } = await runQueueScenario("ambiguous-resend")
    assert.deepEqual(result, { attempted: 1, sent: 0, failed: 1, pendingRetry: 0 })
    const finish = calls.find(call => call.url.endsWith("/rpc/finish_scheduled_delivery"))
    assert.equal(finish?.body?.p_ambiguous, true)
    assert.match(String(finish?.body?.p_error), /without a message ID/)
  })

  it("records a removed destination as failed and continues processing the next queued row", async () => {
    const { result, calls } = await runQueueScenario("removed-destination-and-valid-row")

    assert.deepEqual(result, { attempted: 2, sent: 1, failed: 1, pendingRetry: 0 })
    const sends = calls.filter(call => call.url.startsWith("https://api.telegram.org/") && call.url.endsWith("/sendRichMessage"))
    assert.equal(sends.length, 1)
    assert.equal(sends[0]?.body?.chat_id, "-100123")
    const removedUpdate = calls.find(call => new URL(call.url).pathname.endsWith("/notification_deliveries") && call.method === "PATCH" && call.body?.status === "failed")
    assert.equal(removedUpdate?.body?.last_error, "Destination unavailable: group was removed")
  })

  it("edits an expired occurrence to closed with an empty keyboard instead of sending a replacement", async () => {
    const { result, calls } = await runQueueScenario("expire-edit")

    assert.deepEqual(result, { attempted: 1, sent: 1, failed: 0, pendingRetry: 0 })
    const telegram = calls.filter(call => call.url.startsWith("https://api.telegram.org/"))
    assert.deepEqual(telegram.map(call => call.url.split("/").pop()), ["editMessageText"])
    assert.equal(telegram[0]?.body?.message_id, 905)
    assert.match(JSON.stringify(telegram[0]?.body), /Closed/)
    assert.deepEqual(telegram[0]?.body?.reply_markup, { inline_keyboard: [] })
  })

  it("marks a send with no returned Telegram message ID ambiguous and terminal, without queuing a retry", async () => {
    const { result, calls } = await runQueueScenario("ambiguous-send")

    assert.deepEqual(result, { attempted: 1, sent: 0, failed: 1, pendingRetry: 0 })
    const finish = calls.find(call => call.url.endsWith("/rpc/finish_scheduled_delivery"))
    assert.equal(finish?.body?.p_ambiguous, true)
    assert.match(String(finish?.body?.p_error), /without a message ID/)
    const rowUpdate = calls.find(call => new URL(call.url).pathname.endsWith("/notification_deliveries") && call.method === "PATCH" && call.body?.status === "failed")
    assert.equal(rowUpdate?.body?.attempt_count, 1)
    assert.equal(calls.filter(call => call.url.startsWith("https://api.telegram.org/") && call.url.endsWith("/sendRichMessage")).length, 1)
  })

  it("does not call Telegram or mark the send ambiguous when the bot token is missing", async () => {
    const { result, calls } = await runQueueScenario("missing-token")

    assert.deepEqual(result, { attempted: 1, sent: 0, failed: 1, pendingRetry: 1 })
    assert.equal(calls.some(call => call.url.startsWith("https://api.telegram.org/")), false)
    const finish = calls.find(call => call.url.endsWith("/rpc/finish_scheduled_delivery"))
    assert.equal(finish?.body?.p_ambiguous, false)
    assert.equal(finish?.body?.p_error, "TELEGRAM_BOT_TOKEN not configured")
    const rowUpdate = calls.find(call => new URL(call.url).pathname.endsWith("/notification_deliveries") && call.method === "PATCH" && call.body?.last_error === "TELEGRAM_BOT_TOKEN not configured")
    assert.equal(rowUpdate?.body?.attempt_count, 1)
    assert.match(String(rowUpdate?.body?.last_error), /TELEGRAM_BOT_TOKEN not configured/)
  })

  it("keeps a real transport exception ambiguous and terminal because Telegram may have accepted the send", async () => {
    const { result, calls } = await runQueueScenario("network-throw")

    assert.deepEqual(result, { attempted: 1, sent: 0, failed: 1, pendingRetry: 0 })
    const finish = calls.find(call => call.url.endsWith("/rpc/finish_scheduled_delivery"))
    assert.equal(finish?.body?.p_ambiguous, true)
    assert.equal(finish?.body?.p_error, "connection reset after request started")
    assert.equal(calls.filter(call => call.url.startsWith("https://api.telegram.org/") && call.url.endsWith("/sendRichMessage")).length, 1)
    const rowUpdate = calls.find(call => new URL(call.url).pathname.endsWith("/notification_deliveries") && call.method === "PATCH" && call.body?.status === "failed")
    assert.equal(rowUpdate?.body?.attempt_count, 1)
  })
})
