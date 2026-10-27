import { createECDH, randomUUID } from "node:crypto"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import { withActor } from "@moc/backend/database"
import type { PlatformOperation } from "../../../../../apps/api/server/platform/context.js"
import { operations } from "../../../../../apps/api/server/platform/push.js"
import { enqueueConsolePush, processPendingConsolePushDeliveries } from "../../../../../apps/api/server/push/delivery-store.js"

const mocks = vi.hoisted(() => ({ sendWebPush: vi.fn() }))
vi.mock("../../../../../apps/api/server/push/web-push.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../../apps/api/server/push/web-push.js")>()
  return { ...actual, sendWebPush: mocks.sendWebPush }
})

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const workspaceId = randomUUID()
const adaId = randomUUID()
const eliId = randomUUID()
const adaEndpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`
const keyPair = createECDH("prime256v1")
keyPair.generateKeys()
const clientPublicKey = keyPair.getPublicKey().toString("base64url")
const clientAuthKey = Buffer.alloc(16, 7).toString("base64url")
const previousEnvironment = new Map<string, string | undefined>()

function subscription(endpoint: string): Record<string, unknown> {
  return { endpoint, expirationTime: null, keys: { p256dh: clientPublicKey, auth: clientAuthKey } }
}

async function run<T>(operation: PlatformOperation, input: unknown, actorId = adaId): Promise<T> {
  if (!pool) throw new Error("PostgreSQL integration database is not configured")
  return withActor({ userId: actorId, workspaceId, role: "moc_app" }, async (db) =>
    operation.run({ db, userId: actorId, workspaceId }, input) as Promise<T>)
}

suite("Console push API against disposable PostgreSQL with production RLS", () => {
  beforeAll(async () => {
    if (!pool) return
    for (const name of ["DATABASE_URL", "WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "WEB_PUSH_VAPID_SUBJECT"]) {
      previousEnvironment.set(name, process.env[name])
    }
    process.env.DATABASE_URL = databaseUrl
    const vapidKeys = createECDH("prime256v1")
    vapidKeys.generateKeys()
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = vapidKeys.getPublicKey().toString("base64url")
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = vapidKeys.getPrivateKey().toString("base64url")
    process.env.WEB_PUSH_VAPID_SUBJECT = "mailto:push-admin@example.test"

    for (const id of [adaId, eliId]) {
      await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)', [id, "Push Test", `${id}@example.test`])
      await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Push','Tester',$2)", [id, `${id}@example.test`])
    }
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,'Push Test Workspace',$2)", [workspaceId, `push-${workspaceId}`])
    for (const id of [adaId, eliId]) {
      await pool.query("INSERT INTO public.workspace_users (workspace_id,user_id,role_id) SELECT $1,$2,id FROM public.roles WHERE name='admin'", [workspaceId, id])
    }
  })

  afterAll(async () => {
    await pool?.end()
    for (const [name, value] of previousEnvironment) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  test("creates, reads, and deletes only the authenticated user's subscription", async () => {
    const created = await run<{ id: string }>(operations.subscribe, { subscription: subscription(adaEndpoint) })
    expect(created.id).toMatch(/[0-9a-f-]{36}/i)
    expect(await run(operations.status, { endpoint: adaEndpoint }, eliId)).toEqual({ subscribed: false })

    await run(operations.unsubscribe, { endpoint: adaEndpoint }, eliId)
    expect(await run(operations.status, { endpoint: adaEndpoint })).toEqual({ subscribed: true })
    const stored = await pool!.query("SELECT user_id FROM moc_private.console_push_subscriptions WHERE endpoint=$1", [adaEndpoint])
    expect(stored.rows).toEqual([{ user_id: adaId }])

    await run(operations.unsubscribe, { endpoint: adaEndpoint })
    expect(await run(operations.status, { endpoint: adaEndpoint })).toEqual({ subscribed: false })
  })

  test("rejects cross-account endpoint takeover and malformed subscription data without changing ownership", async () => {
    await run(operations.subscribe, { subscription: subscription(adaEndpoint) })
    await expect(run(operations.subscribe, { subscription: subscription(adaEndpoint) }, eliId)).rejects.toMatchObject({ status: 409 })
    await expect(run(operations.subscribe, { subscription: { ...subscription(`http://fcm.googleapis.com/${randomUUID()}`) } }, eliId))
      .rejects.toMatchObject({ status: 400 })
    await expect(run(operations.subscribe, { subscription: { ...subscription(`https://fcm.googleapis.com/${randomUUID()}`), userId: adaId } }, eliId))
      .rejects.toMatchObject({ status: 400 })
    const stored = await pool!.query("SELECT user_id FROM moc_private.console_push_subscriptions WHERE endpoint=$1", [adaEndpoint])
    expect(stored.rows).toEqual([{ user_id: adaId }])
  })

  test("deduplicates queued events and blocks sends after workspace membership is revoked", async () => {
    await run(operations.subscribe, { subscription: subscription(adaEndpoint) })
    const eventKey = `push.integration:${randomUUID()}`
    const payload = { title: "A test notice", body: "This is only an integration fixture.", url: "/", tag: "integration" }
    await expect(enqueueConsolePush({ userId: adaId, workspaceId, eventKey, payload })).resolves.toBe(1)
    await expect(enqueueConsolePush({ userId: adaId, workspaceId, eventKey, payload })).resolves.toBe(0)

    await pool!.query("DELETE FROM public.workspace_users WHERE workspace_id=$1 AND user_id=$2", [workspaceId, adaId])
    await expect(enqueueConsolePush({ userId: adaId, workspaceId, eventKey: `${eventKey}:after-revoke`, payload })).resolves.toBe(0)
    mocks.sendWebPush.mockClear()
    await expect(processPendingConsolePushDeliveries()).resolves.toMatchObject({ attempted: 0, sent: 0, failed: 1 })
    expect(mocks.sendWebPush).not.toHaveBeenCalled()
    const delivery = await pool!.query("SELECT status,last_error FROM moc_private.console_push_deliveries WHERE event_key=$1", [eventKey])
    expect(delivery.rows).toEqual([{ status: "failed", last_error: "Recipient no longer belongs to the workspace" }])
  })
})
