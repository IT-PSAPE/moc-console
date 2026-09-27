// The token vocabulary for every templatable message type. Only
// announcement events (see event-routing.ts) and the two assignment DMs
// are templatable/editable — every other event now renders a short
// follow-up note instead (see telegram-notes.ts), so their token lists
// don't need to live here.

import type { AnnouncementEventKey } from "./event-routing.js";

export type TemplateScope = "group" | "dm";

export type DmMessageType = "assignment.request" | "assignment.checklist_item";

export type MessageType = AnnouncementEventKey | DmMessageType;

export const DM_MESSAGE_TYPES: readonly DmMessageType[] = [
  "assignment.request",
  "assignment.checklist_item",
];

export function scopeForMessageType(type: MessageType): TemplateScope {
  return (DM_MESSAGE_TYPES as readonly string[]).includes(type) ? "dm" : "group";
}

export type TokenSpec = { name: string; raw?: boolean };

// Telegram's rich-message HTML parser only special-cases &, <, > — quotes
// don't need escaping.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// URL tokens are interpolated raw into href="..." — never escaped.
export const RAW_TOKEN_NAMES = new Set(["linkUrl", "streamUrl", "joinUrl"]);

function specs(...names: string[]): readonly TokenSpec[] {
  return names.map((name) =>
    RAW_TOKEN_NAMES.has(name) ? { name, raw: true } : { name },
  );
}

// linkUrl stays a valid (if unused-by-default) token on every type that
// used to render it as a "🔗 Open …" line — the notification's inline
// keyboard now carries that Open button instead, but a workspace that
// customised its template around {{linkUrl}} keeps working.
const REQUEST_TOKENS = specs(
  "title", "status", "priority", "category", "requesterName", "requestedBy",
  "dueDate", "createdAt", "updatedAt", "trackingCode",
  "who", "what", "whenText", "whereText", "why", "how", "notes", "flow",
  "linkUrl",
);

const BOOKING_TOKENS = specs(
  "title", "status", "requesterName", "bookedBy",
  "checkedOutAt", "expectedReturnAt", "returnedAt", "notes", "trackingCode",
  "itemCount", "equipmentName", "equipmentNames",
  "equipmentCategory", "equipmentLocation", "equipmentSerial",
  "linkUrl",
);

const VENUE_BOOKING_TOKENS = specs(
  "title", "status", "requesterName",
  "venueName", "venueLocation", "eventName",
  "startsAt", "endsAt", "slotCount", "duration", "notes",
  "repeatPattern", "occurrenceCount",
  "trackingCode",
  "linkUrl",
);

const STREAM_TOKENS = specs(
  "title", "description", "scheduledStartTime", "actualStartTime",
  "status", "privacyStatus", "isForKids", "latencyPreference", "tags",
  "createdAt", "streamUrl",
);

const MEETING_TOKENS = specs(
  "topic", "description", "startTime", "duration", "timezone",
  "meetingType", "waitingRoom", "recurrenceType", "createdAt", "joinUrl",
);

const CHECKLIST_TOKENS = specs(
  "title", "checklistName", "checklistDescription", "checklistScheduledAt",
  "sectionName", "itemChecked", "assigneeName", "linkUrl",
);

export const TEMPLATE_TOKENS: Record<MessageType, readonly TokenSpec[]> = {
  "stream.created": STREAM_TOKENS,
  "meeting.created": MEETING_TOKENS,
  "request.created": REQUEST_TOKENS,
  "booking.created": BOOKING_TOKENS,
  "venue_booking.created": VENUE_BOOKING_TOKENS,
  // Request assignment shares the request category, plus the DM-only
  // duty / assignee fields.
  "assignment.request": specs(
    ...REQUEST_TOKENS.map((t) => t.name), "duty", "assigneeName",
  ),
  "assignment.checklist_item": CHECKLIST_TOKENS,
};

// Human labels for the settings UI.
export const DM_MESSAGE_LABELS: Record<DmMessageType, string> = {
  "assignment.request": "Request assignment",
  "assignment.checklist_item": "Checklist item assignment",
};
