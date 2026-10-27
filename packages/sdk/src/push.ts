import type { MocTransport } from "./transport"

export type PushConfiguration = { enabled: boolean; publicKey: string | null }
export type PushSubscriptionResult = { id: string }
export type PushSubscriptionStatus = { subscribed: boolean }
export type PushTestResult = { queued: boolean }

export function createPushClient(transport: MocTransport) {
  return {
    config: () => transport.call<PushConfiguration>("push", "config"),
    subscribe: (subscription: PushSubscriptionJSON) =>
      transport.call<PushSubscriptionResult>("push", "subscribe", { subscription }),
    status: (endpoint: string) =>
      transport.call<PushSubscriptionStatus>("push", "status", { endpoint }),
    unsubscribe: (endpoint: string) =>
      transport.call<void>("push", "unsubscribe", { endpoint }),
    test: (endpoint: string) =>
      transport.call<PushTestResult>("push", "test", { endpoint }),
  }
}
