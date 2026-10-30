import type { MocTransport } from "./transport"

export type UpcomingScheduledMessage = {
  id: string
  title: string
  scheduledFor: string
  status: "scheduled" | "sending"
}

export function createOverviewClient(transport: MocTransport) {
  return {
    scheduledMessages: (workspaceId: string) => transport.call<UpcomingScheduledMessage[]>("overview", "scheduledMessages", undefined, workspaceId),
  }
}
