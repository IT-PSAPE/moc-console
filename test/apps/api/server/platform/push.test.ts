import { createECDH } from "node:crypto"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { PlatformContext } from "../../../../../apps/api/server/platform/context.js"

const mocks = vi.hoisted(() => ({
  getWebPushPublicKey: vi.fn<() => string | null>(),
  enqueueConsolePush: vi.fn<(args: Record<string, unknown>) => Promise<number>>(),
  consumeRateLimit: vi.fn<(policy: unknown, subjectHash: string) => Promise<{ allowed: boolean }>>(),
}))

vi.mock("../../../../../apps/api/server/push/web-push-config.js", () => ({ getWebPushPublicKey: mocks.getWebPushPublicKey }))
vi.mock("../../../../../apps/api/server/push/delivery-store.js", () => ({ enqueueConsolePush: mocks.enqueueConsolePush }))
vi.mock("../../../../../apps/api/server/rate-limit.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../../apps/api/server/rate-limit.js")>()
  return { ...actual, consumeRateLimit: mocks.consumeRateLimit }
})

import { operations } from "../../../../../apps/api/server/platform/push.js"

const USER_ID = "00000000-0000-4000-8000-000000000001"
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/test-subscription"

function subscription(endpoint = ENDPOINT, expirationTime: number | null = null): Record<string, unknown> {
  const clientKeys = createECDH("prime256v1")
  clientKeys.generateKeys()
  return {
    endpoint,
    expirationTime,
    keys: { p256dh: clientKeys.getPublicKey().toString("base64url"), auth: Buffer.alloc(16, 2).toString("base64url") },
  }
}

function context(query: ReturnType<typeof vi.fn>, userId = USER_ID): PlatformContext {
  return { db: { query } as unknown as PlatformContext["db"], userId, workspaceId: "" }
}

describe("Console push platform operations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getWebPushPublicKey.mockReturnValue("public-vapid-key")
    mocks.enqueueConsolePush.mockResolvedValue(1)
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true })
  })

  test("reports the public VAPID key and leaves all secrets out of config", async () => {
    const result = await operations.config.run(context(vi.fn()), null)
    expect(result).toEqual({ enabled: true, publicKey: "public-vapid-key" })
    expect(operations.config.permission).toBe("authenticated")
  })

  test("config disables subscription when the public key is absent", async () => {
    mocks.getWebPushPublicKey.mockReturnValue(null)
    expect(await operations.config.run(context(vi.fn()), null)).toEqual({ enabled: false, publicKey: null })
  })

  test("stores a subscription under the authenticated user", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: "subscription-1" }] })
    const result = await operations.subscribe.run(context(query), { subscription: subscription() })
    expect(result).toEqual({ id: "subscription-1" })
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO moc_private.console_push_subscriptions"), [
      USER_ID,
      ENDPOINT,
      expect.any(String),
      expect.any(String),
      null,
    ])
  })

  test("refreshes the keys only when an existing endpoint belongs to the authenticated user", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "subscription-1" }] })
    await expect(operations.subscribe.run(context(query), { subscription: subscription() })).resolves.toEqual({ id: "subscription-1" })
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("WHERE user_id=$1 AND endpoint=$2 RETURNING id"), [
      USER_ID,
      ENDPOINT,
      expect.any(String),
      expect.any(String),
      null,
    ])
  })

  test("rejects a subscription endpoint already owned by another account without transferring it", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    await expect(operations.subscribe.run(context(query, "00000000-0000-4000-8000-000000000002"), { subscription: subscription() }))
      .rejects.toMatchObject({ status: 409, code: "conflict" })
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[1]?.[1]?.[0]).toBe("00000000-0000-4000-8000-000000000002")
  })

  test.each([
    subscription("http://fcm.googleapis.com/fcm/send/insecure"),
    subscription("https://127.0.0.1/internal"),
    { ...subscription(), keys: { p256dh: "invalid", auth: "invalid" } },
    subscription(ENDPOINT, Date.now() - 10_000),
    { ...subscription(), userId: "00000000-0000-4000-8000-000000000002" },
  ])("rejects unsafe or forged subscription input before the database", async (payload) => {
    const query = vi.fn()
    await expect(operations.subscribe.run(context(query), { subscription: payload })).rejects.toMatchObject({ status: 400 })
    expect(query).not.toHaveBeenCalled()
  })

  test("status and unsubscribe remain scoped to the authenticated user", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ subscribed: false }] })
    expect(await operations.status.run(context(query), { endpoint: ENDPOINT })).toEqual({ subscribed: false })
    await operations.unsubscribe.run(context(query), { endpoint: ENDPOINT })
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE user_id=$1 AND endpoint=$2"), [USER_ID, ENDPOINT])
    expect(query).toHaveBeenNthCalledWith(2, "DELETE FROM moc_private.console_push_subscriptions WHERE user_id=$1 AND endpoint=$2", [USER_ID, ENDPOINT])
  })

  test("queues a fixed self-test only for the caller's registered endpoint", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: "subscription-1" }] })
    expect(await operations.test.run(context(query), { endpoint: ENDPOINT })).toEqual({ queued: true })
    expect(mocks.enqueueConsolePush).toHaveBeenCalledWith(expect.objectContaining({
      userId: USER_ID,
      subscriptionId: "subscription-1",
      payload: { title: "Console push is ready", body: "Push delivery is working.", url: "/", tag: "console-push-test" },
    }))
  })

  test("does not queue a self-test for an endpoint outside the caller's account", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] })
    expect(await operations.test.run(context(query), { endpoint: ENDPOINT })).toEqual({ queued: false })
    expect(mocks.enqueueConsolePush).not.toHaveBeenCalled()
  })

  test("rejects test requests over the existing authenticated notification limit", async () => {
    const query = vi.fn()
    mocks.consumeRateLimit.mockResolvedValue({ allowed: false })
    await expect(operations.test.run(context(query), { endpoint: ENDPOINT })).rejects.toMatchObject({ status: 429 })
    expect(query).not.toHaveBeenCalled()
  })
})
