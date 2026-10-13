import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, test } from "vitest"
import { Pool } from "pg"
import type { ApiRequest, ApiResponse } from "../../../../apps/api/server/http.js"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
if (databaseUrl) process.env.DATABASE_URL = databaseUrl

const workspaceId = randomUUID()
const userId = randomUUID()
const roleId = randomUUID()
const slug = `telegram-${workspaceId}`
const email = `telegram-${userId}@example.test`
const telegramUserId = 700_000_000 + Math.floor(Math.random() * 100_000_000)
const chatId = `-${1_000_000_000_000 + Math.floor(Math.random() * 100_000_000)}`
const updateId = Number.parseInt(randomUUID().replaceAll("-", "").slice(0, 12), 16)
const topicId = 7142

const { handleTelegramWebhook, telegramWebhookRateLimitSubject } = await import("../../../../apps/api/server/telegram-webhook.js")

suite("Telegram group registration through the webhook against PostgreSQL", () => {
  afterAll(async () => {
    if (!pool) return
    try {
      await pool.query("DELETE FROM public.telegram_webhook_updates WHERE update_id=$1", [updateId])
      await pool.query("DELETE FROM public.api_rate_limit_windows WHERE policy='telegram_webhook' AND subject_hash=$1", [telegramWebhookRateLimitSubject({ body: { message: { chat: { id: chatId } } } })])
      await pool.query("ALTER TABLE public.workspace_users DISABLE TRIGGER workspace_users_protect_last_manager")
      try {
        await pool.query("DELETE FROM public.workspace_users WHERE workspace_id=$1", [workspaceId])
        await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
      } finally {
        await pool.query("ALTER TABLE public.workspace_users ENABLE TRIGGER workspace_users_protect_last_manager")
      }
      await pool.query('DELETE FROM moc_auth."user" WHERE id=$1', [userId])
      await pool.query("DELETE FROM public.roles WHERE id=$1", [roleId])
    } finally {
      await pool.end()
    }
  })

  test("registers a forum topic, records the webhook, and acknowledges duplicate delivery once", async () => {
    if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
    process.env.DATABASE_URL = databaseUrl
    await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)', [userId, "Telegram Integration", email])
    await pool.query("INSERT INTO public.users (id,name,surname,email,telegram_chat_id) VALUES ($1,$2,$3,$4,$5)", [userId, "Telegram", "Integration", email, String(telegramUserId)])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Telegram ${workspaceId}`, slug])
    await pool.query("INSERT INTO public.roles (id,name,can_manage_roles) VALUES ($1,$2,true)", [roleId, `telegram-manager-${workspaceId}`])
    const memberTypes = await pool.query<{ id: string }>("SELECT id FROM public.workspace_member_types WHERE workspace_id=$1 AND is_default", [workspaceId])
    expect(memberTypes.rowCount).toBe(1)
    await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id,member_type_id) VALUES ($1,$2,$3,$4)", [workspaceId, userId, roleId, memberTypes.rows[0]!.id])

    const priorSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    const priorToken = process.env.TELEGRAM_BOT_TOKEN
    const priorFetch = globalThis.fetch
    const fetchBodies: Array<{ method: string; body: Record<string, unknown> }> = []
    process.env.TELEGRAM_WEBHOOK_SECRET = `secret-${randomUUID()}`
    process.env.TELEGRAM_BOT_TOKEN = `test-${randomUUID()}`
    globalThis.fetch = async (input, init) => {
      const method = String(input).split("/").pop() ?? ""
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      fetchBodies.push({ method, body })
      const result = method === "sendMessage"
        ? { message_id: 9001, reply_to_message: { forum_topic_created: { name: "Sunday Service" } } }
        : []
      return new Response(JSON.stringify({ ok: true, result }), { status: 200 })
    }

    try {
      const requestBody = {
        update_id: updateId,
        message: {
          chat: { id: Number(chatId), type: "supergroup", title: "UX Test Group", is_forum: true },
          from: { id: telegramUserId },
          message_thread_id: topicId,
          text: `/register_topic ${slug}`,
        },
      }
      let statusCode = 0
      let responseBody: unknown
      const response = {
        setHeader: () => undefined,
        status: (status: number) => {
          statusCode = status
          return response as ApiResponse
        },
        json: (body: unknown) => { responseBody = body },
      } as unknown as ApiResponse
      const request: ApiRequest = {
        method: "POST",
        body: requestBody,
        headers: { "x-telegram-bot-api-secret-token": process.env.TELEGRAM_WEBHOOK_SECRET },
      }

      await handleTelegramWebhook(request, response)
      expect(statusCode).toBe(200)
      expect(responseBody).toEqual({ ok: true })
      const registered = await pool.query<{ workspace_id: string; active: boolean }>(
        "SELECT workspace_id,active FROM public.telegram_groups WHERE chat_id=$1", [chatId],
      )
      expect(registered.rows).toEqual([{ workspace_id: workspaceId, active: false }])
      const topic = await pool.query<{ name: string; closed: boolean }>(
        "SELECT name,closed FROM public.telegram_group_topics WHERE group_chat_id=$1 AND thread_id=$2", [chatId, topicId],
      )
      expect(topic.rows).toEqual([{ name: "Sunday Service", closed: false }])
      const inbox = await pool.query<{ status: string; attempts: number }>(
        "SELECT status,attempts FROM public.telegram_webhook_updates WHERE update_id=$1", [updateId],
      )
      expect(inbox.rows).toEqual([{ status: "processed", attempts: 1 }])
      expect(fetchBodies.some(({ method }) => method === "sendMessage")).toBe(true)
      expect(fetchBodies.some(({ method }) => method === "setMyCommands")).toBe(true)

      statusCode = 0
      responseBody = undefined
      await handleTelegramWebhook(request, response)
      expect(statusCode).toBe(200)
      expect(responseBody).toEqual({ ok: true })
      expect(fetchBodies.filter(({ method }) => method === "sendMessage")).toHaveLength(1)
      const duplicate = await pool.query<{ status: string; attempts: number }>(
        "SELECT status,attempts FROM public.telegram_webhook_updates WHERE update_id=$1", [updateId],
      )
      expect(duplicate.rows).toEqual([{ status: "processed", attempts: 1 }])
    } finally {
      globalThis.fetch = priorFetch
      if (priorSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET
      else process.env.TELEGRAM_WEBHOOK_SECRET = priorSecret
      if (priorToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = priorToken
    }
  }, 30_000)
})
