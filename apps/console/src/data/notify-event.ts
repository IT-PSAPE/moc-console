import { buildSessionHeaders } from "@/lib/api-auth";
import { apiUrl } from "@moc/utils/api-url";
import type { NotifyDestination } from "@moc/types/streams";

// Fire-and-forget POST to the internal notify endpoint. The server
// atomically claims the row via `notified_at`, so duplicate calls are
// safe — only the first one fans out to configured Telegram routes.
function fireNotify(path: string, body: Record<string, unknown>): void {
  void (async () => {
    try {
      const headers = await buildSessionHeaders();
      await fetch(apiUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // swallow
    }
  })();
}

// `destinations` overrides the workspace's configured routing for this one
// notification. Omitted or empty means "follow notification settings". The
// API re-validates every destination against the workspace's registered
// groups, so nothing here is taken on trust.
export function notifyStreamCreated(streamId: string, destinations?: NotifyDestination[]): void {
  fireNotify("/api/notifications/internal/stream-created", {
    streamId,
    ...(destinations?.length ? { destinations } : {}),
  });
}

export function notifyMeetingCreated(meetingId: string, destinations?: NotifyDestination[]): void {
  fireNotify("/api/notifications/internal/meeting-created", {
    meetingId,
    ...(destinations?.length ? { destinations } : {}),
  });
}
