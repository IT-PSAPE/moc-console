import { describe, expect, test } from "vitest"
import type { MocTransport } from "../../../packages/sdk/src/transport"
import { createPushClient } from "../../../packages/sdk/src/push"

type Call = { capability: string; operation: string; input: unknown; workspaceId?: string }

function createTransport() {
  const calls: Call[] = []
  const transport = {
    call: async <T>(capability: string, operation: string, input?: unknown, workspaceId?: string): Promise<T> => {
      calls.push({ capability, operation, input, workspaceId })
      return null as T
    },
    request: async <T>(): Promise<T> => null as T,
    url: (path: string) => path,
  } satisfies MocTransport
  return { transport, calls }
}

describe("push SDK client", () => {
  test("uses the authenticated push capability contract", async () => {
    const { transport, calls } = createTransport()
    const push = createPushClient(transport)
    const subscription = {
      endpoint: "https://push.example.test/subscription/1",
      expirationTime: null,
      keys: { p256dh: "p256dh-value", auth: "auth-value" },
    } satisfies PushSubscriptionJSON

    await push.config()
    await push.subscribe(subscription)
    await push.status(subscription.endpoint)
    await push.test(subscription.endpoint)
    await push.unsubscribe(subscription.endpoint)

    expect(calls).toEqual([
      { capability: "push", operation: "config", input: undefined, workspaceId: undefined },
      { capability: "push", operation: "subscribe", input: { subscription }, workspaceId: undefined },
      { capability: "push", operation: "status", input: { endpoint: subscription.endpoint }, workspaceId: undefined },
      { capability: "push", operation: "test", input: { endpoint: subscription.endpoint }, workspaceId: undefined },
      { capability: "push", operation: "unsubscribe", input: { endpoint: subscription.endpoint }, workspaceId: undefined },
    ])
  })
})
