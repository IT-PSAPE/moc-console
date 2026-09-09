import { buildSessionHeaders } from "@/lib/api-auth";
import { apiUrl } from "@moc/utils/api-url";
import type { NotifyDestination } from "@moc/types/streams";

export type NotificationDispatchResult = {
  ok: boolean
  attempted: number
  dispatched: number
  failed: number
  pendingRetry: number
}

// The server reuses the durable event key, so duplicate calls are safe. Callers
// may await this to know the API accepted the request, while a null result
// leaves the trigger-created outbox event available for the delivery worker.
async function notify(path: string, body: Record<string, unknown>): Promise<NotificationDispatchResult | null> {
  try {
    const headers = await buildSessionHeaders();
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.warn("Notification request was not accepted", { path, status: response.status })
      return null
    }
    return await response.json() as NotificationDispatchResult
  } catch (error) {
    console.warn("Notification request failed", { path, error })
    return null
  }
}

// `destinations` overrides the workspace's configured routing for this one
// notification. Omitted or empty means "follow notification settings". The
// API re-validates every destination against the workspace's registered
// groups, so nothing here is taken on trust.
export function notifyStreamCreated(streamId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/stream-created", {
    streamId,
    ...(destinations?.length ? { destinations } : {}),
  });
}

export function notifyMeetingCreated(meetingId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/meeting-created", {
    meetingId,
    ...(destinations?.length ? { destinations } : {}),
  });
}
