import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import { withActor } from "@moc/backend/database"
import { defaultFollowUpIO } from "../../../../../apps/api/server/notifications/follow-ups"
import { processPendingOutboxForEntityAcrossEventTypes } from "../../../../../apps/api/server/notifications/outbox"
import { handleCallbackQuery } from "../../../../../apps/api/server/telegram-callback-query"
import { encodeActionCallback } from "../../../../../packages/notifications/src/telegram-keyboard"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const databaseTarget = databaseUrl ? new URL(databaseUrl) : null
const databaseHost = databaseTarget?.searchParams.get("host") ?? databaseTarget?.hostname ?? ""
const localDatabase = databaseHost.startsWith("/") || ["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)
const suite = databaseUrl && localDatabase ? describe : describe.skip
const pool = databaseUrl && localDatabase ? new Pool({ connectionString: databaseUrl }) : null
const workspaceId = randomUUID()
const requestId = randomUUID()
const unrelatedRequestId = randomUUID()
const deliveryIds = Array.from({ length: 7 }, () => randomUUID())
const memberId = randomUUID()

suite("request follow-up originals in disposable PostgreSQL", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,'Follow-up fixture',$2)", [workspaceId, `follow-ups-${workspaceId}`])
    await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,\'Follow-up\',$2)', [memberId, `${memberId}@example.test`])
    await pool.query("INSERT INTO public.users (id,name,surname,email,telegram_chat_id) VALUES ($1,'Follow-up','Member',$2,'tg-follow-up-member')", [memberId, `${memberId}@example.test`])
    await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name='admin'", [workspaceId, memberId])
    await withActor({ userId: null, workspaceId, role: "moc_worker" }, (db) => db.query(`INSERT INTO public.requests
      (id,workspace_id,title,requested_by,due_date,tracking_code,category,who,what,when_text,where_text,why,how)
      VALUES ($1,$2,'Follow-up request','Requester',now()+interval '1 day',$3,'event','','','','','','')`, [requestId, workspaceId, `REQ-${requestId}`]))
    await pool.query(`INSERT INTO public.notification_deliveries
      (id,workspace_id,event_key,event_type,scope,destination_key,chat_id,text,payload,status,telegram_message_id,entity_type,entity_id,parent_delivery_id,telegram_deleted_at)
      VALUES
      ($1,$2,'assignment.request:legacy-dm',NULL,'dm','dm:legacy','chat-legacy','Legacy assignment','{"parentId":"${requestId}"}'::jsonb,'sent',101,NULL,NULL,NULL,NULL),
      ($3,$2,'assignment.request:linked-dm',NULL,'dm','dm:linked','chat-linked','Linked assignment','{}'::jsonb,'sent',102,'request',$4,NULL,NULL),
      ($5,$2,'request.created:group','request.created','group','group:copy','group-chat','Group announcement','{}'::jsonb,'sent',103,'request',$4,NULL,NULL),
      ($6,$2,'assignment.checklist:excluded',NULL,'dm','dm:checklist','checklist-chat','Checklist assignment','{"parentId":"${requestId}"}'::jsonb,'sent',104,NULL,NULL,NULL,NULL),
      ($7,$2,'assignment.request:unrelated',NULL,'dm','dm:unrelated','other-chat','Other request assignment','{"parentId":"${unrelatedRequestId}"}'::jsonb,'sent',105,NULL,NULL,NULL,NULL)`,
    [deliveryIds[0], workspaceId, deliveryIds[1], requestId, deliveryIds[2], deliveryIds[3], deliveryIds[4]])
    await pool.query(`INSERT INTO public.notification_deliveries
      (id,workspace_id,event_key,event_type,scope,destination_key,chat_id,text,payload,status,telegram_message_id,entity_type,entity_id,parent_delivery_id,telegram_deleted_at)
      VALUES
      ($1,$2,'assignment.request:deleted','request.created','dm','dm:deleted','deleted-chat','Deleted message','{}'::jsonb,'sent',106,'request',$3,NULL,now()),
      ($4,$2,'follow-up:reply','request.created','dm','dm:reply','reply-chat','Reply','{}'::jsonb,'sent',107,'request',$3,$5,NULL)`,
    [randomUUID(), workspaceId, requestId, randomUUID(), deliveryIds[1]])
  })

  afterAll(async () => {
    if (!pool) return
    await pool.end()
  })

  test("selects legacy and linked request assignment DMs plus the group original only", async () => {
    const originals = await defaultFollowUpIO.fetchOriginals("request", requestId)
    expect(originals.map((original) => original.telegram_message_id).sort()).toEqual([101, 102, 103])
    expect(originals.map((original) => original.id).sort()).toEqual(deliveryIds.slice(0, 3).sort())
  })

  test("callback and Console outbox routes edit every original and clear stale action buttons", async () => {
    if (!pool) return
    const telegramCalls: Array<{ method: string; body: Record<string, unknown> }> = []
    const previousToken = process.env.TELEGRAM_BOT_TOKEN
    const previousUsername = process.env.TELEGRAM_BOT_USERNAME
    const previousConsoleUrl = process.env.CONSOLE_BASE_URL
    process.env.TELEGRAM_BOT_TOKEN = "disposable-test-token"
    process.env.TELEGRAM_BOT_USERNAME = "moc_test_bot"
    process.env.CONSOLE_BASE_URL = "https://console.example.test"
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = String(input).split("/").at(-1) ?? ""
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      telegramCalls.push({ method, body })
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 })
    })
    try {
      const callbackData = encodeActionCallback({ entityType: "request", entityId: requestId, action: "start" })
      const assignmentMessage = { chat: { id: "chat-legacy" }, message_id: 101 }
      await handleCallbackQuery({ id: "callback-from-legacy-assignment", from: { id: "tg-follow-up-member" }, data: callbackData, message: assignmentMessage })
      expect((await pool.query("SELECT status FROM public.requests WHERE id=$1", [requestId])).rows[0].status).toBe("in_progress")
      expect(telegramCalls.some((call) => call.method === "answerCallbackQuery")).toBe(true)
      expectEditedOriginals(telegramCalls)
      expectNoInvalidActionCallbacks(telegramCalls, "in_progress")
      expect(telegramCalls.some((call) => ["sendMessage", "sendRichMessage"].includes(call.method))).toBe(false)

      telegramCalls.length = 0
      await handleCallbackQuery({
        id: "complete-from-legacy-assignment",
        from: { id: "tg-follow-up-member" },
        data: encodeActionCallback({ entityType: "request", entityId: requestId, action: "complete" }),
        message: assignmentMessage,
      })
      expect((await pool.query("SELECT status FROM public.requests WHERE id=$1", [requestId])).rows[0].status).toBe("completed")
      expectEditedOriginals(telegramCalls)
      expectNoInvalidActionCallbacks(telegramCalls, "completed")
      expect(telegramCalls.some((call) => ["sendMessage", "sendRichMessage"].includes(call.method))).toBe(false)

      telegramCalls.length = 0
      await withActor({ userId: null, workspaceId, role: "moc_worker" }, (db) => db.query("UPDATE public.requests SET status='in_progress' WHERE id=$1", [requestId]))
      await withActor({ userId: null, workspaceId, role: "moc_worker" }, (db) => db.query(
        "UPDATE public.notification_outbox SET status='dispatched' WHERE entity_type='request' AND entity_id=$1",
        [requestId],
      ))
      await withActor({ userId: null, workspaceId, role: "moc_worker" }, (db) => db.query("UPDATE public.requests SET status='completed' WHERE id=$1", [requestId]))
      const result = await processPendingOutboxForEntityAcrossEventTypes("request", requestId)
      expect(result).toMatchObject({ attempted: 1, dispatched: 1, failed: 0 })
      expect((await pool.query("SELECT status FROM public.requests WHERE id=$1", [requestId])).rows[0].status).toBe("completed")
      expectEditedOriginals(telegramCalls)
      expectNoInvalidActionCallbacks(telegramCalls, "completed")
      expect(telegramCalls.some((call) => ["sendMessage", "sendRichMessage"].includes(call.method))).toBe(false)

      for (const action of ["start", "complete"] as const) {
        telegramCalls.length = 0
        await handleCallbackQuery({
          id: `stale-${action}-from-assignment`,
          from: { id: "tg-follow-up-member" },
          data: encodeActionCallback({ entityType: "request", entityId: requestId, action }),
          message: assignmentMessage,
        })
        expect((await pool.query("SELECT status FROM public.requests WHERE id=$1", [requestId])).rows[0].status).toBe("completed")
        expect(telegramCalls.find((call) => call.method === "answerCallbackQuery")?.body.text).toMatch(/current status: completed/i)
        expectEditedOriginals(telegramCalls)
        expectNoInvalidActionCallbacks(telegramCalls, "completed")
        expect(telegramCalls.some((call) => ["sendMessage", "sendRichMessage"].includes(call.method))).toBe(false)
      }
    } finally {
      vi.unstubAllGlobals()
      if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = previousToken
      if (previousUsername === undefined) delete process.env.TELEGRAM_BOT_USERNAME
      else process.env.TELEGRAM_BOT_USERNAME = previousUsername
      if (previousConsoleUrl === undefined) delete process.env.CONSOLE_BASE_URL
      else process.env.CONSOLE_BASE_URL = previousConsoleUrl
    }
  })
})

function expectEditedOriginals(calls: Array<{ method: string; body: Record<string, unknown> }>): void {
  const edited = new Set(calls
    .filter((call) => ["editMessageText", "editMessageReplyMarkup"].includes(call.method))
    .map((call) => `${call.body.chat_id}:${call.body.message_id}`))
  expect(edited).toEqual(new Set(["chat-legacy:101", "chat-linked:102", "group-chat:103"]))
}

function expectNoInvalidActionCallbacks(calls: Array<{ method: string; body: Record<string, unknown> }>, status: "in_progress" | "completed"): void {
  const edits = calls.filter((call) => call.method === "editMessageText" || call.method === "editMessageReplyMarkup")
  for (const call of edits) {
    const markup = call.body.reply_markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> } | undefined
    const callbacks = markup?.inline_keyboard?.flatMap((row) => row.map((button) => button.callback_data).filter(Boolean)) ?? []
    expect(callbacks.some((data) => data?.includes(":start:"))).toBe(false)
    if (status === "completed") expect(callbacks.some((data) => data?.includes(":complete:"))).toBe(false)
  }
}
