import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { handleScheduledCallback, handleScheduledMessage } from "../../../../../apps/api/server/scheduled-messages/telegram-flow.js"

type RecordedCall = { url: string; method: string; body: Record<string, unknown> | null }
type FixtureOptions = { frequency?: string; state?: string; expiresAt?: string; messageType?: string; requireArrival?: boolean; withEditDelivery?: boolean }

function createFixture(options: FixtureOptions = {}) {
  const previousFetch = globalThis.fetch
  const previousUrl = process.env.VITE_SUPABASE_URL
  const previousKey = process.env.SUPABASE_SECRET_KEY
  const previousTelegramToken = process.env.TELEGRAM_BOT_TOKEN
  process.env.VITE_SUPABASE_URL = "https://supabase.test"
  process.env.SUPABASE_SECRET_KEY = "test-service-key"
  process.env.TELEGRAM_BOT_TOKEN = "test-bot-token"

  const calls: RecordedCall[] = []
  const sessions = new Map<string, Record<string, unknown>>()
  const responses: Array<{ user_id: string; name: string; status: string; arrival_time: string | null }> = [
    { user_id: "user-1", name: "Alex Member", status: "attending", arrival_time: "07:15" },
  ]
  const occurrence: Record<string, unknown> = {
    id: "occurrence-1",
    workspace_id: "workspace-1",
    schedule_id: "schedule-1",
    occurrence_on: "2026-10-03",
    send_on: "2026-10-03T08:00:00.000Z",
    expires_at: options.expiresAt ?? new Date(Date.now() + 60 * 60_000).toISOString(),
    fields: { title: "Original title", instructions: "Please arrive" },
    body: "<b>{{title}}</b>\n{{instructions}}",
    message_type: options.messageType ?? "announcement",
    require_arrival: options.requireArrival ?? false,
    state: options.state ?? "scheduled",
    revision: 3,
    synced_revision: 3,
    telegram_message_id: 700,
    last_sync_error: null,
  }
  const schedule: Record<string, unknown> = {
    id: "schedule-1",
    workspace_id: "workspace-1",
    template_id: "template-1",
    group_chat_id: "-100123",
    thread_id: 22,
    starts_on: "2026-10-03",
    frequency: options.frequency ?? "once",
    timezone: "Africa/Harare",
    expiry_hours: 4,
    auto_send: false,
    enabled: true,
  }
  const rpcCalls: Array<{ name: string; body: Record<string, unknown> }> = []
  let nextEphemeralId = 500
  let nextRegularMessageId = 800
  let activeDeliveryMode = options.withEditDelivery === true

  const noRows = () => new Response(JSON.stringify({ code: "PGRST116", message: "No rows" }), { status: 406 })
  const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } })

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null
    calls.push({ url, method, body })

    if (url.startsWith("https://api.telegram.org/")) {
      const telegramMethod = url.split("/").pop()
      if (telegramMethod === "sendMessage") {
        return json({ ok: true, result: { message_id: nextRegularMessageId++, ephemeral_message_id: nextEphemeralId++ } })
      }
      if (telegramMethod === "editEphemeralMessageText" || telegramMethod === "answerCallbackQuery" || telegramMethod === "editMessageText") {
        return json({ ok: true, result: true })
      }
      if (telegramMethod === "sendRichMessage") return json({ ok: true, result: { message_id: 701 } })
      return json({ ok: false, error_code: 500, description: `Unexpected Telegram method ${telegramMethod}` }, 500)
    }

    const requestUrl = new URL(url)
    const path = requestUrl.pathname
    if (path.includes("/rpc/")) {
      const name = path.split("/").pop() ?? ""
      rpcCalls.push({ name, body: body ?? {} })
      if (name === "begin_scheduled_delivery") {
        return json({
          occurrence: { ...occurrence },
          responses: responses.map(response => ({ ...response })),
          expired: Date.parse(String(occurrence.expires_at)) <= Date.now(),
        })
      }
      if (name === "respond_scheduled_attendance") {
        const selected = responses.find(response => response.user_id === body?.p_actor)
        if (selected) {
          selected.status = String(body?.p_status)
          selected.arrival_time = typeof body?.p_arrival === "string" ? body.p_arrival : null
        }
      }
      if (name === "change_scheduled_occurrence") {
        const fields = occurrence.fields as Record<string, string>
        fields[String(body?.p_field)] = String(body?.p_value)
        occurrence.revision = Number(occurrence.revision) + 1
      }
      if (name === "materialize_scheduled_messages" || name === "recover_scheduled_deliveries") return new Response("null", { status: 200 })
      return new Response("null", { status: 200 })
    }

    if (path.endsWith("/scheduled_message_sessions")) {
      if (method === "POST") {
        const input = body ?? {}
        for (const [id, existing] of sessions) {
          if (existing.telegram_user_id === input.telegram_user_id && existing.chat_id === input.chat_id) sessions.delete(id)
        }
        const session: Record<string, unknown> = {
          ...input,
          ephemeral_message_id: null,
        }
        sessions.set(String(session.id), session)
        return json(session)
      }
      if (method === "DELETE") {
        for (const [id, session] of sessions) {
          if (session.telegram_user_id === requestUrl.searchParams.get("telegram_user_id")?.replace("eq.", "")
            && session.chat_id === requestUrl.searchParams.get("chat_id")?.replace("eq.", "")) sessions.delete(id)
        }
        return new Response(null, { status: 204 })
      }
      if (method === "PATCH") {
        const id = requestUrl.searchParams.get("id")?.replace("eq.", "")
        const session = id ? sessions.get(id) : null
        if (!session) return noRows()
        Object.assign(session, body)
        return new Response(null, { status: 204 })
      }
      const telegramId = requestUrl.searchParams.get("telegram_user_id")?.replace("eq.", "")
      const chatId = requestUrl.searchParams.get("chat_id")?.replace("eq.", "")
      const sessionId = requestUrl.searchParams.get("id")?.replace("eq.", "")
      const promptFilter = requestUrl.searchParams.get("data")
      const session = sessionId
        ? sessions.get(sessionId)
        : [...sessions.values()].find(candidate => promptFilter
          && candidate.telegram_user_id === telegramId
          && candidate.chat_id === chatId
          && (candidate.data as Record<string, unknown>)?.stage === "input"
          && promptFilter.includes(String((candidate.data as Record<string, unknown>).promptId)))
      if (!session || session.telegram_user_id !== telegramId || session.chat_id !== chatId || Date.parse(String(session.expires_at)) <= Date.now()) return noRows()
      return json(session)
    }
    if (path.endsWith("/users")) return json({ id: "user-1" })
    if (path.endsWith("/telegram_groups")) return json({ workspace_id: "workspace-1" })
    if (path.endsWith("/workspace_users")) {
      const select = requestUrl.searchParams.get("select") ?? ""
      return json(select.includes("user_id") && !select.includes("roles") ? { user_id: "user-1" } : { roles: { can_update: true } })
    }
    if (path.endsWith("/scheduled_message_schedules")) {
      return requestUrl.searchParams.has("id") ? json(schedule) : json([{ id: "schedule-1" }])
    }
    if (path.endsWith("/scheduled_message_occurrences")) {
      return requestUrl.searchParams.has("id") ? json(occurrence) : json([{ ...occurrence }])
    }
    if (path.endsWith("/scheduled_message_responses")) return json(responses)
    if (path.endsWith("/notification_deliveries")) {
      const eventKey = requestUrl.searchParams.get("event_key")?.replace("eq.", "")
      if (method === "GET" && activeDeliveryMode && requestUrl.searchParams.has("scheduled_occurrence_id")) return json([{ event_key: "edit-event" }])
      if (method === "GET" && activeDeliveryMode && eventKey) return json([{ id: "delivery-edit" }])
      if (method === "GET") return json([])
      if (method === "PATCH" && requestUrl.searchParams.has("select")) {
        const scheduledDelivery = {
          id: "delivery-edit", workspace_id: "workspace-1", event_key: "scheduled-edit",
          event_type: null, scope: "group", route_id: null, recipient_user_id: null,
          destination_key: "group:-100123:22", chat_id: "-100123", thread_id: 22,
          text: "ignored", payload: {}, attempt_count: 0, entity_type: null, entity_id: null,
          reply_markup: null, parent_delivery_id: null, scheduled_operation: "edit",
        }
        return json([scheduledDelivery])
      }
      return new Response(null, { status: 204 })
    }
    return json({ message: `Unexpected request ${method} ${url}` }, 500)
  }

  function session() {
    return [...sessions.values()][0] as Record<string, unknown> | undefined
  }
  function sessionCount() {
    return sessions.size
  }
  async function callback(action: string, arg?: string, id = "callback-1", messageId?: number) {
    const active = session()
    const data = `sm:${String(active?.id)}:${action}${arg === undefined ? "" : `:${arg}`}`
    await handleScheduledCallback({
      id,
      from: { id: 456 },
      data,
      message: { chat: { id: "-100123" }, message_id: messageId ?? 701, message_thread_id: 22, ephemeral_message_id: active?.ephemeral_message_id as number | undefined },
    })
  }
  async function startManagement() {
    await handleScheduledMessage({
      text: "/manage_messages",
      from: { id: 456 },
      chat: { id: "-100123", type: "supergroup" },
      message_thread_id: 22,
      ephemeral_message_id: 90,
    })
  }
  async function prepareAdminEdit(value = "Revised title") {
    await startManagement()
    await callback("pick", "0", "pick-occurrence")
    await callback("field", "0", "choose-title")
    const promptId = (session()?.data as Record<string, unknown>)?.promptId as number
    await handleScheduledMessage({
      text: value,
      from: { id: 456 },
      chat: { id: "-100123", type: "supergroup" },
      message_thread_id: 22,
      ephemeral_message_id: 999,
      reply_to_message: { ephemeral_message_id: promptId },
    })
  }
  function telegramCalls(method: string) {
    return calls.filter(call => call.url.startsWith("https://api.telegram.org/") && call.url.endsWith(`/${method}`))
  }
  function teardown() {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL
    else process.env.VITE_SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY
    else process.env.SUPABASE_SECRET_KEY = previousKey
    if (previousTelegramToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = previousTelegramToken
  }

  return { calls, rpcCalls, occurrence, schedule, responses, session, sessionCount, callback, startManagement, prepareAdminEdit, telegramCalls, teardown, setDeliveryMode(value: boolean) { activeDeliveryMode = value } }
}

describe("scheduled Telegram flows", () => {
  it("edits a Gregorian content date and renders its converted year on the original attendance message", async () => {
    const fixture = createFixture({ state: "sent", messageType: "pre_attendance", withEditDelivery: true })
    try {
      fixture.occurrence.fields = { title: "Service", instructions: "Please arrive", date: "2026-10-03" }
      fixture.occurrence.body = "{{title}}\n{{date}}\n{{instructions}}"
      await fixture.startManagement()
      await fixture.callback("pick", "0", "pick-date")
      await fixture.callback("field", "2", "choose-date")
      const prompt = fixture.telegramCalls("sendMessage").at(-1)?.body
      assert.match(String(prompt?.text), /YYYY-MM-DD/)
      const promptId = (fixture.session()?.data as Record<string, unknown>).promptId as number
      await handleScheduledMessage({ text: "2026-10-04", from: { id: 456 }, chat: { id: "-100123", type: "supergroup" }, message_thread_id: 22, ephemeral_message_id: 999, reply_to_message: { ephemeral_message_id: promptId } })
      await fixture.callback("apply", undefined, "apply-date")
      const change = fixture.rpcCalls.find(call => call.name === "change_scheduled_occurrence")
      assert.equal(change?.body.p_field, "date")
      assert.equal(change?.body.p_value, "2026-10-04")
      const edited = fixture.telegramCalls("editMessageText").at(-1)?.body
      assert.equal(edited?.message_id, 700)
      const html = (edited?.rich_message as { html: string })?.html
      assert.match(String(html), /431004/)
      assert.match(String(html), /✅ Alex Member — 07:15/)
      assert.equal(fixture.telegramCalls("sendRichMessage").length, 0)
    } finally { fixture.teardown() }
  })
  it("selects an occurrence and keeps an edit as an ephemeral draft until Apply; one-off edits need no scope picker", async () => {
    const fixture = createFixture({ frequency: "once" })
    try {
      await fixture.prepareAdminEdit("Revised title")

      const pendingConfirmation = fixture.session()
      assert.ok(pendingConfirmation)
      assert.equal((pendingConfirmation.data as Record<string, unknown>).value, "Revised title")
      assert.equal((pendingConfirmation.data as Record<string, unknown>).stage, "confirm")
      assert.equal((pendingConfirmation.data as Record<string, unknown>).scope, "occurrence")
      assert.equal(fixture.rpcCalls.some(call => call.name === "change_scheduled_occurrence"), false)
      const confirmation = fixture.telegramCalls("editEphemeralMessageText").at(-1)?.body
      assert.match(String(confirmation?.text), /Original title → Revised title/)
      assert.match(String(confirmation?.text), /Scope: occurrence/)
      const markup = confirmation?.reply_markup as { inline_keyboard: Array<Array<{ text: string }>> }
      assert.equal(markup.inline_keyboard.flat().some(button => button.text.includes("future")), false)
      assert.equal(fixture.telegramCalls("sendMessage").length >= 2, true)

      await fixture.callback("apply", undefined, "apply-edit")

      const change = fixture.rpcCalls.filter(call => call.name === "change_scheduled_occurrence")
      assert.equal(change.length, 1)
      assert.deepEqual(change[0]?.body, {
        p_actor: "user-1", p_id: "occurrence-1", p_revision: 3,
        p_field: "title", p_value: "Revised title", p_scope: "occurrence",
      })
      assert.equal(fixture.occurrence.fields && (fixture.occurrence.fields as Record<string, string>).title, "Revised title")
    } finally {
      fixture.teardown()
    }
  })

  it("requires an explicit recurring scope, then applies the selected scope through the shared RPC", async () => {
    const fixture = createFixture({ frequency: "weekly" })
    try {
      await fixture.prepareAdminEdit("Recurring title")

      assert.equal(fixture.rpcCalls.some(call => call.name === "change_scheduled_occurrence"), false)
      const scopePrompt = fixture.telegramCalls("editEphemeralMessageText").at(-1)?.body
      assert.equal(scopePrompt?.text, "Apply this edit to:")
      const scopeMarkup = scopePrompt?.reply_markup as { inline_keyboard: Array<Array<{ text: string }>> }
      assert.deepEqual(scopeMarkup.inline_keyboard.flat().map(button => button.text), [
        "This occurrence", "This and future occurrences", "Entire series", "Cancel",
      ])

      await fixture.callback("scope", "future", "select-future")
      assert.equal(fixture.rpcCalls.some(call => call.name === "change_scheduled_occurrence"), false)
      assert.match(String(fixture.telegramCalls("editEphemeralMessageText").at(-1)?.body?.text), /Scope: future/)

      await fixture.callback("apply", undefined, "apply-future")

      const changes = fixture.rpcCalls.filter(call => call.name === "change_scheduled_occurrence")
      assert.equal(changes.length, 1)
      assert.equal(changes[0]?.body.p_scope, "future")
      assert.equal(changes[0]?.body.p_value, "Recurring title")
    } finally {
      fixture.teardown()
    }
  })

  it("never treats an ordinary group reply as private admin input or sends the prompt into a DM", async () => {
    const fixture = createFixture()
    try {
      const handled = await handleScheduledMessage({
        text: "Should be private",
        from: { id: 456 },
        chat: { id: "-100123", type: "supergroup" },
        reply_to_message: { ephemeral_message_id: 501 },
      })

      assert.equal(handled, true)
      const sent = fixture.telegramCalls("sendMessage")
      assert.equal(sent.length, 1)
      assert.equal(sent[0]?.body?.chat_id, "-100123")
      assert.deepEqual(sent[0]?.body?.ephemeral_message_parameters, { receiver_user_id: 456 })
      assert.match(String(sent[0]?.body?.text), /ephemeral reply input/)
      assert.equal(fixture.rpcCalls.some(call => call.name === "change_scheduled_occurrence" || call.name === "respond_scheduled_attendance"), false)
    } finally {
      fixture.teardown()
    }
  })

  it("rotates the flow ID atomically so restarting a flow invalidates previous controls", async () => {
    const fixture = createFixture()
    try {
      await fixture.startManagement()
      const previous = fixture.session()
      const previousId = String(previous?.id)
      const previousEphemeralId = previous?.ephemeral_message_id as number

      await fixture.startManagement()
      const current = fixture.session()

      assert.equal(fixture.sessionCount(), 1)
      assert.notEqual(current?.id, previousId)
      assert.ok(typeof current?.id === "string" && current.id.length > 20, "the id comes from the UUID in the upsert payload")
      await handleScheduledCallback({
        id: "old-control",
        from: { id: 456 },
        data: `sm:${previousId}:close`,
        message: { chat: { id: "-100123" }, ephemeral_message_id: previousEphemeralId },
      })
      assert.match(String(fixture.telegramCalls("answerCallbackQuery").at(-1)?.body?.text), /flow has ended/)
    } finally {
      fixture.teardown()
    }
  })

  it("rejects an expired admin ephemeral control and a participant button from a forged original message ID", async () => {
    const adminFixture = createFixture({ expiresAt: new Date(Date.now() - 60_000).toISOString() })
    try {
      await adminFixture.startManagement()
      await adminFixture.callback("pick", "0", "expired-admin-pick")
      assert.equal(adminFixture.rpcCalls.some(call => call.name === "change_scheduled_occurrence"), false)
      assert.equal(adminFixture.telegramCalls("editEphemeralMessageText").length, 0)
      const alert = adminFixture.telegramCalls("answerCallbackQuery").at(-1)?.body
      assert.equal(alert?.show_alert, true)
      assert.match(String(alert?.text), /no longer actionable/)
    } finally {
      adminFixture.teardown()
    }

    const participantFixture = createFixture({ state: "sent", messageType: "pre_attendance" })
    try {
      await handleScheduledCallback({
        id: "forged-original",
        from: { id: 456 },
        data: "sa:yes:occurrence-1",
        message: { chat: { id: "-100123" }, message_id: 999, message_thread_id: 22 },
      })
      assert.equal(participantFixture.rpcCalls.some(call => call.name === "respond_scheduled_attendance"), false)
      assert.equal(participantFixture.session(), undefined)
      const alert = participantFixture.telegramCalls("answerCallbackQuery").at(-1)?.body
      assert.equal(alert?.show_alert, true)
      assert.match(String(alert?.text), /not on the original message/)
    } finally {
      participantFixture.teardown()
    }

    const expiredParticipant = createFixture({
      state: "sent",
      messageType: "pre_attendance",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    })
    try {
      await handleScheduledCallback({
        id: "expired-attendance",
        from: { id: 456 },
        data: "sa:yes:occurrence-1",
        message: { chat: { id: "-100123" }, message_id: 700, message_thread_id: 22 },
      })
      assert.equal(expiredParticipant.rpcCalls.some(call => call.name === "respond_scheduled_attendance"), false)
      const alert = expiredParticipant.telegramCalls("answerCallbackQuery").at(-1)?.body
      assert.equal(alert?.show_alert, true)
      assert.match(String(alert?.text), /no longer actionable/)
    } finally {
      expiredParticipant.teardown()
    }
  })

  it("uses an ephemeral ForceReply with the saved arrival as the current value, then edits the original provider message", async () => {
    const fixture = createFixture({ state: "sent", messageType: "pre_attendance", requireArrival: true, withEditDelivery: true })
    try {
      await handleScheduledCallback({
        id: "attendance-yes",
        from: { id: 456 },
        data: "sa:yes:occurrence-1",
        message: { chat: { id: "-100123" }, message_id: 700, message_thread_id: 22 },
      })

      const prompt = fixture.telegramCalls("sendMessage").at(-1)?.body
      assert.equal(prompt?.chat_id, "-100123")
      assert.deepEqual(prompt?.ephemeral_message_parameters, { receiver_user_id: 456, callback_query_id: "attendance-yes" })
      assert.deepEqual(prompt?.reply_markup, { force_reply: true, input_field_placeholder: "Enter the replacement value" })
      assert.match(String(prompt?.text), /Current value: 07:15/)
      assert.equal(fixture.rpcCalls.some(call => call.name === "respond_scheduled_attendance"), false)
      const session = fixture.session()
      const promptId = (session?.data as Record<string, unknown>).promptId as number

      await handleScheduledMessage({
        text: "07:30",
        from: { id: 456 },
        chat: { id: "-100123", type: "supergroup" },
        message_thread_id: 22,
        ephemeral_message_id: promptId + 1,
        reply_to_message: { ephemeral_message_id: promptId },
      })

      const savedResponse = fixture.rpcCalls.find(call => call.name === "respond_scheduled_attendance")
      assert.deepEqual(savedResponse?.body, {
        p_actor: "user-1", p_id: "occurrence-1", p_revision: 3, p_status: "attending", p_arrival: "07:30",
      })
      const originalEdit = fixture.telegramCalls("editMessageText").find(call => call.body?.message_id === 700)
      assert.ok(originalEdit, "the shared delivery worker edits the recorded provider message in place")
      assert.equal(originalEdit.body?.chat_id, "-100123")
      assert.equal(fixture.telegramCalls("sendRichMessage").length, 0)
    } finally {
      fixture.teardown()
    }
  })
})
