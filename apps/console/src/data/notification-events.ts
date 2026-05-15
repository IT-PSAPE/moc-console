// Event-type registry for the notification routing system.
// Imported by the admin UI (to render the list) and by the server
// dispatcher (to validate incoming event_type values). Keep
// shared-safe: no browser or Node-only imports.

export type NotificationEventKey =
  | "stream.created"
  | "meeting.created"
  | "request.created"
  | "request.status_changed"
  | "request.archived"
  | "booking.created"
  | "booking.status_changed";

export type NotificationEventDefinition = {
  key: NotificationEventKey;
  label: string;
  description: string;
};

export const NOTIFICATION_EVENTS: readonly NotificationEventDefinition[] = [
  {
    key: "stream.created",
    label: "YouTube stream created",
    description: "Fires when a stream is created in MOC Console or first discovered by syncing with YouTube.",
  },
  {
    key: "meeting.created",
    label: "Zoom meeting created",
    description: "Fires when a meeting is created in MOC Console or first discovered by syncing with Zoom.",
  },
  {
    key: "request.created",
    label: "Request created",
    description: "Fires when a new request is submitted in the requests app.",
  },
  {
    key: "request.status_changed",
    label: "Request status changed",
    description: "Fires whenever a request moves between statuses (e.g. in progress → completed).",
  },
  {
    key: "request.archived",
    label: "Request archived",
    description: "Fires when a request is archived.",
  },
  {
    key: "booking.created",
    label: "Equipment booking created",
    description: "Fires when a new equipment booking is made in the requests/bookings app.",
  },
  {
    key: "booking.status_changed",
    label: "Equipment booking status changed",
    description: "Fires whenever an equipment booking changes status.",
  },
] as const;

const KEYS = new Set<string>(NOTIFICATION_EVENTS.map((e) => e.key));

export function isNotificationEventKey(value: string): value is NotificationEventKey {
  return KEYS.has(value);
}
