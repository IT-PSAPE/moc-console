import { buildSessionHeaders } from "@/lib/api-auth";

// Fire-and-forget POST to the internal notify endpoint. The server
// atomically claims the row via `notified_at`, so duplicate calls are
// safe — only the first one fans out to configured Telegram routes.
function fireNotify(path: string, body: Record<string, unknown>): void {
  void (async () => {
    try {
      const headers = await buildSessionHeaders();
      await fetch(path, {
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

export function notifyStreamCreated(streamId: string): void {
  fireNotify("/api/notifications/internal/stream-created", { streamId });
}

export function notifyMeetingCreated(meetingId: string): void {
  fireNotify("/api/notifications/internal/meeting-created", { meetingId });
}
