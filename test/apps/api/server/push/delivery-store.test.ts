import { beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  queryRows: vi.fn<(text: string, values?: readonly unknown[], client?: unknown) => Promise<Array<Record<string, unknown>>>>(),
  getWebPushVapidConfig: vi.fn<() => unknown>(),
  sendWebPush: vi.fn<(subscription: unknown, payload: string, config: unknown) => Promise<unknown>>(),
}))

vi.mock("@moc/backend/database", () => ({ queryRows: mocks.queryRows }))
vi.mock("../../../../../apps/api/server/push/web-push-config.js", () => ({ getWebPushVapidConfig: mocks.getWebPushVapidConfig }))
vi.mock("../../../../../apps/api/server/push/web-push.js", () => ({ sendWebPush: mocks.sendWebPush }))

import { enqueueConsolePush, parseConsolePushPayload, processPendingConsolePushDeliveries } from "../../../../../apps/api/server/push/delivery-store.js"

const USER_ID = "00000000-0000-4000-8000-000000000001"
const SUBSCRIPTION_ID = "00000000-0000-4000-8000-000000000002"
const DELIVERY_ID = "00000000-0000-4000-8000-000000000003"
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000004"
const PAYLOAD = { title: "A notice", body: "Details", url: "/requests", tag: "notice" }

function delivery(expirationTime: string | null = null): Record<string, unknown> {
  return {
    id: DELIVERY_ID,
    subscription_id: SUBSCRIPTION_ID,
    user_id: USER_ID,
    workspace_id: WORKSPACE_ID,
    event_key: "request.created:test",
    payload: PAYLOAD,
    attempt_count: 0,
    last_attempt_at: "2026-10-27T10:00:00.000Z",
    endpoint: "https://fcm.googleapis.com/fcm/send/subscription",
    p256dh: "client-public-key",
    auth: "client-auth-secret",
    expiration_time: expirationTime,
  }
}

describe("Console push delivery store", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getWebPushVapidConfig.mockReturnValue({ publicKey: "public", privateKey: "private", subject: "mailto:admin@example.test" })
    mocks.sendWebPush.mockResolvedValue({ ok: true, status: 201, retryAfter: null, expired: false, retryable: false })
    mocks.queryRows.mockResolvedValue([])
  })

  test("validates payloads and allows only same-origin relative URLs", () => {
    expect(parseConsolePushPayload(PAYLOAD)).toEqual(PAYLOAD)
    for (const url of ["https://example.test/path", "//evil.example/path", "/\\evil.example", "/a".repeat(1_100)]) {
      expect(() => parseConsolePushPayload({ title: "Notice", url })).toThrow()
    }
    expect(() => parseConsolePushPayload({ title: "Notice", secret: "extra" })).toThrow()
  })

  test("enqueues one row per eligible active subscription and carries workspace membership filtering into SQL", async () => {
    mocks.queryRows.mockResolvedValueOnce([{ id: DELIVERY_ID }])
    const count = await enqueueConsolePush({ userId: USER_ID, workspaceId: WORKSPACE_ID, eventKey: "request.created:1", payload: PAYLOAD })
    expect(count).toBe(1)
    expect(mocks.queryRows).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (event_key, subscription_id) DO NOTHING"), [
      USER_ID,
      WORKSPACE_ID,
      "request.created:1",
      JSON.stringify(PAYLOAD),
      null,
    ], undefined)
    expect(mocks.queryRows.mock.calls[0]?.[0]).toContain("subscription.expiration_time > now()")
    expect(mocks.queryRows.mock.calls[0]?.[0]).toContain("public.workspace_users AS membership")
  })

  test("deduplicates event keys and rejects invalid recipient or workspace identifiers before querying", async () => {
    await expect(enqueueConsolePush({ userId: USER_ID, eventKey: "request.created:1", payload: PAYLOAD })).resolves.toBe(0)
    await expect(enqueueConsolePush({ userId: "bad", eventKey: "request.created:1", payload: PAYLOAD })).rejects.toThrow("recipient")
    await expect(enqueueConsolePush({ userId: USER_ID, workspaceId: "bad", eventKey: "request.created:1", payload: PAYLOAD })).rejects.toThrow("recipient")
    expect(mocks.queryRows).toHaveBeenCalledTimes(1)
  })

  test("sends due deliveries and marks success only for the current lease", async () => {
    mocks.queryRows
      .mockResolvedValueOnce([]) // retention cleanup
      .mockResolvedValueOnce([]) // stale-claim release
      .mockResolvedValueOnce([{ id: DELIVERY_ID }]) // due rows
      .mockResolvedValueOnce([delivery()]) // claim
      .mockResolvedValueOnce([{ exists: true }]) // membership recheck
      .mockResolvedValueOnce([{ id: DELIVERY_ID }]) // guarded completion

    await expect(processPendingConsolePushDeliveries()).resolves.toEqual({ attempted: 1, sent: 1, failed: 0, pendingRetry: 0 })
    expect(mocks.sendWebPush).toHaveBeenCalledWith(
      { endpoint: "https://fcm.googleapis.com/fcm/send/subscription", keys: { p256dh: "client-public-key", auth: "client-auth-secret" } },
      JSON.stringify(PAYLOAD),
      expect.objectContaining({ publicKey: "public" }),
    )
    expect(mocks.queryRows.mock.calls.at(-1)?.[0]).toContain("last_attempt_at=$2::timestamptz")
  })

  test("does not send to a workspace member after their membership is revoked", async () => {
    mocks.queryRows
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])
      .mockResolvedValueOnce([delivery()])
      .mockResolvedValueOnce([{ exists: false }])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])

    await expect(processPendingConsolePushDeliveries()).resolves.toEqual({ attempted: 0, sent: 0, failed: 1, pendingRetry: 0 })
    expect(mocks.sendWebPush).not.toHaveBeenCalled()
    expect(mocks.queryRows.mock.calls.at(-1)?.[0]).toContain("Recipient no longer belongs to the workspace")
  })

  test("continues delivering later rows when one subscription has a malformed stored key", async () => {
    mocks.sendWebPush
      .mockRejectedValueOnce(new Error("Invalid Web Push key"))
      .mockResolvedValueOnce({ ok: true, status: 201, retryAfter: null, expired: false, retryable: false })
    mocks.queryRows
      .mockResolvedValueOnce([]) // retention cleanup
      .mockResolvedValueOnce([]) // stale-claim release
      .mockResolvedValueOnce([{ id: DELIVERY_ID }, { id: "00000000-0000-4000-8000-000000000005" }])
      .mockResolvedValueOnce([delivery()])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])
      .mockResolvedValueOnce([{ ...delivery(), id: "00000000-0000-4000-8000-000000000005" }])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ id: "00000000-0000-4000-8000-000000000005" }])

    await expect(processPendingConsolePushDeliveries()).resolves.toEqual({ attempted: 2, sent: 1, failed: 1, pendingRetry: 0 })
    expect(mocks.sendWebPush).toHaveBeenCalledTimes(2)
  })

  test("deletes an expired subscription before attempting a network send", async () => {
    mocks.queryRows
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])
      .mockResolvedValueOnce([delivery("2000-01-01T00:00:00.000Z")])
      .mockResolvedValueOnce([{ id: SUBSCRIPTION_ID }])

    await expect(processPendingConsolePushDeliveries()).resolves.toEqual({ attempted: 0, sent: 0, failed: 1, pendingRetry: 0 })
    expect(mocks.sendWebPush).not.toHaveBeenCalled()
  })

  test("caps provider Retry-After values and retries transient transport failures", async () => {
    mocks.sendWebPush.mockResolvedValue({ ok: false, status: 429, retryAfter: "999999999999999", expired: false, retryable: true, error: "http" })
    mocks.queryRows
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])
      .mockResolvedValueOnce([delivery()])
      .mockResolvedValueOnce([{ exists: true }])
      .mockResolvedValueOnce([{ id: DELIVERY_ID }])

    await expect(processPendingConsolePushDeliveries()).resolves.toEqual({ attempted: 1, sent: 0, failed: 1, pendingRetry: 1 })
    const update = mocks.queryRows.mock.calls.at(-1)
    expect(update?.[0]).toContain("next_attempt_at=$5::timestamptz")
    expect(Date.parse(String(update?.[1]?.[4]))).toBeLessThan(Date.now() + 24 * 60 * 60_000 + 2_000)
  })

  test("rejects invalid worker batch sizes", async () => {
    await expect(processPendingConsolePushDeliveries(0)).rejects.toThrow("batch size")
    await expect(processPendingConsolePushDeliveries(501)).rejects.toThrow("batch size")
    expect(mocks.getWebPushVapidConfig).not.toHaveBeenCalled()
  })
})
