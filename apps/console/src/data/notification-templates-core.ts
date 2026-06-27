// Pure, dependency-free template engine for Telegram notifications.
// Imported by BOTH the server (dispatch.ts / assignment.ts) and the
// settings UI (live preview), so it must stay free of Node and React.
//
// A template is plain text with {{token}} placeholders plus literal
// Telegram HTML (<b> <i> <a>). Only token *values* are HTML-escaped
// (URL tokens excepted — see RAW_TOKENS); the literal text passes
// through untouched. A line that contains tokens which ALL resolve
// empty is dropped, reproducing the old `if (x) lines.push(...)`
// behaviour. With no custom row stored, callers render
// DEFAULT_TEMPLATES, which is byte-identical to the legacy hardcoded
// output (see notification-templates-core.test.ts).

import type { NotificationEventKey } from "./notification-events";

export type TemplateScope = "group" | "dm";

export type DmMessageType =
  | "assignment.request"
  | "assignment.cue"
  | "assignment.checklist_item";

export type MessageType = NotificationEventKey | DmMessageType;

export const DM_MESSAGE_TYPES: readonly DmMessageType[] = [
  "assignment.request",
  "assignment.cue",
  "assignment.checklist_item",
];

export function scopeForMessageType(type: MessageType): TemplateScope {
  return (DM_MESSAGE_TYPES as readonly string[]).includes(type) ? "dm" : "group";
}

export type TokenSpec = { name: string; raw?: boolean };

// Telegram's HTML parser only special-cases &, <, > — quotes don't
// need escaping. Identical to the (now-removed) copies in dispatch.ts
// and assignment.ts; kept here as the single source of truth.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// URL tokens are interpolated raw into href="..." (matching the legacy
// builders, which never escaped URLs). Everything else is escaped.
const RAW_TOKEN_NAMES = new Set(["linkUrl", "streamUrl", "joinUrl"]);

function specs(...names: string[]): readonly TokenSpec[] {
  return names.map((name) =>
    RAW_TOKEN_NAMES.has(name) ? { name, raw: true } : { name },
  );
}

// Tokens are grouped by *category*: every message type in a category
// shares the same composable field set (e.g. all request events expose
// the full request record). They need not all be used by the default
// template — they exist so admins can compose whatever they want. The
// matching values are resolved server-side in server/notifications/
// enrich.ts (full DB row) with the event payload as fallback.

const REQUEST_TOKENS = specs(
  "title", "status", "priority", "category", "requesterName", "requestedBy",
  "dueDate", "createdAt", "updatedAt", "trackingCode",
  "who", "what", "whenText", "whereText", "why", "how", "notes", "flow",
  // staleDays — days since last update; populated for request.stale only.
  "staleDays",
  "linkUrl",
);

const BOOKING_TOKENS = specs(
  "title", "status", "requesterName", "bookedBy",
  "checkedOutAt", "expectedReturnAt", "returnedAt", "notes", "trackingCode",
  "itemCount", "equipmentName", "equipmentNames",
  "equipmentCategory", "equipmentLocation", "equipmentSerial",
  // staleDays / staleReason — populated for booking.stale only.
  "staleDays", "staleReason",
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

const CUE_TOKENS = specs(
  "title", "eventName", "eventDescription", "eventScheduledAt", "eventDuration",
  "trackName", "cueStart", "cueDuration", "cueType", "cueNotes",
  "duty", "assigneeName", "linkUrl",
);

const CHECKLIST_TOKENS = specs(
  "title", "checklistName", "checklistDescription", "checklistScheduledAt",
  "sectionName", "itemChecked", "duty", "assigneeName", "linkUrl",
);

export const TEMPLATE_TOKENS: Record<MessageType, readonly TokenSpec[]> = {
  "stream.created": STREAM_TOKENS,
  "meeting.created": MEETING_TOKENS,
  "request.created": REQUEST_TOKENS,
  "request.status_changed": REQUEST_TOKENS,
  "request.archived": REQUEST_TOKENS,
  "request.stale": REQUEST_TOKENS,
  "booking.created": BOOKING_TOKENS,
  "booking.status_changed": BOOKING_TOKENS,
  "booking.stale": BOOKING_TOKENS,
  // Request assignment shares the request category, plus the DM-only
  // duty / assignee fields.
  "assignment.request": specs(
    ...REQUEST_TOKENS.map((t) => t.name), "duty", "assigneeName",
  ),
  "assignment.cue": CUE_TOKENS,
  "assignment.checklist_item": CHECKLIST_TOKENS,
};

// Friendly built-in wording with a modest amount of emoji. These are
// the fallback messages when a workspace has not set a custom template.
// Keep every line either token-free (always shown) or driven by a
// single token (auto-dropped when that token is empty) so optional
// fields collapse cleanly — see renderTemplate + the core tests.
export const DEFAULT_TEMPLATES: Record<MessageType, string> = {
  "stream.created":
    "✨ <b>New YouTube Stream scheduled</b>\n\n📌 <b>Title:</b> {{title}}\n🗓 <b>Scheduled:</b> Starts {{scheduledStartTime}}\n\n🔗 <a href=\"{{streamUrl}}\">Watch the stream</a>",
  "meeting.created":
    "✨ <b>New Zoom meeting scheduled</b>\n\n📌 <b>Title:</b> {{topic}}\n🗓 <b>Scheduled:</b> Starts {{startTime}}\n\n🔗 <a href=\"{{joinUrl}}\">Join the meeting</a>",
  "request.created":
    "✨ <b>New request just came in</b>\n\n📌 <b>Title:</b> {{title}}\n🙋 <b>From:</b> {{requesterName}}\n🗂️ <b>Category:</b> {{category}}\n🎯 <b>Priority:</b> {{priority}}\n📅 <b>Due:</b> {{dueDate}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "request.status_changed":
    "📣 <b>Request status updated</b>\n\n📌 <b>Title:</b> {{title}}\n🔄 Now: <i>{{status}}</i>\n🙋 <b>From:</b> {{requesterName}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "request.archived":
    "📣 <b>Request archived</b>\n\n📌 <b>Title:</b> {{title}}\n🙋 <b>From:</b> {{requesterName}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "request.stale":
    "⏰ <b>Request needs attention</b>\n\n📌 <b>Title:</b> {{title}}\n🔄 <b>Status:</b> <i>{{status}}</i>\n⏳ Untouched for {{staleDays}} day(s)\n🙋 <b>From:</b> {{requesterName}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "booking.created":
    "✨ <b>New equipment booking</b>\n\n📌 <b>Title:</b> {{title}} — {{itemCount}} item(s)\n🙋 <b>From:</b> {{requesterName}}\n🔄 <b>Status:</b> <i>{{status}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">Open the booking</a>",
  "booking.status_changed":
    "📣 <b>Equipment booking updated</b>\n\n📌 <b>Title:</b> {{title}} — {{itemCount}} item(s)\n🔄 Now: <i>{{status}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">Open the booking</a>",
  "booking.stale":
    "⏰ <b>Booking needs attention</b>\n\n📌 <b>Title:</b> {{title}} — {{itemCount}} item(s)\n🔄 <b>Status:</b> <i>{{status}}</i>\n⚠️ {{staleReason}}\n⏳ Outstanding for {{staleDays}} day(s)\n\n🔗 <a href=\"{{linkUrl}}\">Open the booking</a>",
  "assignment.request":
    "👋 Hey {{assigneeName}}!\nYou've been assigned to a request\n\n📌 <b>Title:</b> {{title}}\n🛠 <b>Duty:</b> <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Request Details</a>",
  "assignment.cue":
    "👋 Hey {{assigneeName}}!\nYou've been assigned to a cue\n\n📌 <b>Title:</b> {{title}}\n📋 <b>Event:</b> {{eventName}}\n🛠 Duty: <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Event Details</a>",
  "assignment.checklist_item":
    "👋 Hey {{assigneeName}}!\nYou've been assigned to a checklist item\n\n📌 <b>Title:</b> {{title}}\n📋 <b>Checklist:</b> {{checklistName}}\n🛠 Duty: <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Checklist Details</a>",
};

export type TokenValues = Record<string, string | null | undefined>;

const TOKEN_RE = /\{\{(\w+)\}\}/g;

function isEmpty(value: string | null | undefined): boolean {
  return value == null || value === "";
}

function resolveToken(name: string, value: string | null | undefined): string {
  if (isEmpty(value)) return "";
  return RAW_TOKEN_NAMES.has(name) ? (value as string) : escapeHtml(value as string);
}

/**
 * Render a template against resolved token values.
 *
 * - {{token}} → escaped value (raw for URL tokens); unknown/empty → "".
 * - Literal text (incl. <b>/<i>/<a>) passes through untouched.
 * - A line whose tokens ALL resolve empty is dropped entirely.
 * - Runs of blank lines collapse to one; leading/trailing blanks trimmed.
 */
export function renderTemplate(body: string, values: TokenValues): string {
  const kept: string[] = [];

  for (const line of body.split("\n")) {
    const tokens = [...line.matchAll(TOKEN_RE)];
    if (tokens.length > 0 && tokens.every((m) => isEmpty(values[m[1]]))) {
      continue; // every token on this line is empty → drop the line
    }
    kept.push(line.replace(TOKEN_RE, (_, name: string) => resolveToken(name, values[name])));
  }

  // Collapse consecutive blanks and trim leading/trailing blank lines.
  const out: string[] = [];
  for (const line of kept) {
    const blank = line.trim() === "";
    if (blank && (out.length === 0 || out[out.length - 1].trim() === "")) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].trim() === "") out.pop();

  return out.join("\n");
}

/** Token names referenced by a template that are not valid for `type`. */
export function validateTemplate(type: MessageType, body: string): string[] {
  const valid = new Set(TEMPLATE_TOKENS[type].map((t) => t.name));
  const unknown = new Set<string>();
  for (const m of body.matchAll(TOKEN_RE)) {
    if (!valid.has(m[1])) unknown.add(m[1]);
  }
  return [...unknown];
}

// ── Date / time formatting ────────────────────────────────────────────
// Every date in a Telegram message is rendered in the workspace's
// configured time zone using a named preset. Enrichment (server-side)
// returns raw ISO strings; formatDateTokens localises them at the render
// boundary, once the workspace's settings are known. Pure + Intl-only so
// it runs unchanged on the server and in the settings live-preview.

export type DateFormatPreset =
  | "day-month-time"        // 21 May, 7:00 PM   (default)
  | "day-month-year-time"   // 21 May 2026, 7:00 PM
  | "weekday-24h";          // Thu, 21 May 2026, 19:00

export const DEFAULT_TIMEZONE = "Africa/Harare";
export const DEFAULT_DATE_FORMAT: DateFormatPreset = "day-month-time";

// Dropdown metadata for the settings UI (value, human label, live example).
export const DATE_FORMAT_OPTIONS: ReadonlyArray<{
  value: DateFormatPreset;
  label: string;
  example: string;
}> = [
  { value: "day-month-time", label: "Day & month + time", example: "21 May, 7:00 PM" },
  { value: "day-month-year-time", label: "Full date + time", example: "21 May 2026, 7:00 PM" },
  { value: "weekday-24h", label: "Weekday + 24-hour", example: "Thu, 21 May 2026, 19:00" },
];

// Token names whose values are ISO timestamps to localise. Everything
// else (clock durations, free-text dates, the meeting's own `timezone`)
// passes through untouched.
const DATE_TOKEN_NAMES = new Set<string>([
  "dueDate", "createdAt", "updatedAt",
  "checkedOutAt", "expectedReturnAt", "returnedAt",
  "scheduledStartTime", "actualStartTime",
  "startTime",
  "eventScheduledAt", "checklistScheduledAt",
]);

function resolveTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * Format an ISO timestamp in `timezone` using a named preset. Returns ""
 * for empty/invalid input (so an empty optional token stays empty and its
 * template line is dropped). Falls back to UTC for an unknown zone and to
 * the 12-hour day+month preset for an unknown key. en-GB gives the
 * day-before-month order; parts are reassembled by hand so punctuation
 * and casing match the presets exactly across environments.
 */
export function formatInstant(
  iso: string | null | undefined,
  timezone: string,
  preset: DateFormatPreset,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const timeZone = resolveTimeZone(timezone);

  if (preset === "weekday-24h") {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone, weekday: "short", day: "numeric", month: "short",
      year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    return `${part(p, "weekday")}, ${part(p, "day")} ${part(p, "month")} ${part(p, "year")}, ${part(p, "hour")}:${part(p, "minute")}`;
  }

  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone, day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(date);
  const time = `${part(p, "hour")}:${part(p, "minute")} ${part(p, "dayPeriod").toUpperCase()}`;
  return preset === "day-month-year-time"
    ? `${part(p, "day")} ${part(p, "month")} ${part(p, "year")}, ${time}`
    : `${part(p, "day")} ${part(p, "month")}, ${time}`;
}

/**
 * Return a copy of `values` with every ISO date token rendered in the
 * workspace's zone/format. Non-date and empty tokens are left untouched.
 */
export function formatDateTokens(
  values: TokenValues,
  timezone: string,
  preset: DateFormatPreset,
): TokenValues {
  const out: TokenValues = { ...values };
  for (const name of DATE_TOKEN_NAMES) {
    const v = out[name];
    if (v != null && v !== "") out[name] = formatInstant(v, timezone, preset);
  }
  return out;
}

// Sample data for the settings live-preview. Values are intentionally
// realistic so admins see escaping behaviour (e.g. the & in a title).
const REQUEST_SAMPLE: TokenValues = {
  title: "Lower-third graphic for guest speaker",
  status: "in progress",
  priority: "High",
  category: "Graphics",
  requesterName: "Tendai M.",
  requestedBy: "Tendai M.",
  dueDate: "Wed, 21 May 2026 17:00:00 GMT",
  createdAt: "Mon, 18 May 2026 08:12:00 GMT",
  updatedAt: "Mon, 18 May 2026 09:30:00 GMT",
  trackingCode: "REQ-4F2A9C",
  who: "Guest speaker — Dr. A. Banda",
  what: "Name + title lower-third for the 2nd session",
  whenText: "Sunday 2nd service",
  whereText: "Main auditorium",
  why: "Introduce the guest on screen",
  how: "Match the current sermon series template",
  notes: "Spelling confirmed with the office",
  flow: "Session 2 → after worship",
  linkUrl: "https://app.example.com/requests/123",
};

const BOOKING_SAMPLE: TokenValues = {
  title: "Sunday Service Setup",
  status: "booked",
  requesterName: "Rumbi K.",
  bookedBy: "Rumbi K.",
  checkedOutAt: "Fri, 22 May 2026 07:00:00 GMT",
  expectedReturnAt: "Sun, 24 May 2026 20:00:00 GMT",
  returnedAt: "",
  notes: "Outside shoot — handle with care",
  trackingCode: "BKG-77C1",
  itemCount: "3",
  equipmentName: "Sony FX6",
  equipmentNames: "Sony FX6, Sennheiser MKH-416, Manfrotto tripod",
  equipmentCategory: "Camera",
  equipmentLocation: "Store room B, shelf 2",
  equipmentSerial: "FX6-99213",
  linkUrl: "https://app.example.com/equipment/bookings",
};

// Sample data for the settings live-preview. Values are intentionally
// realistic so admins see escaping behaviour (e.g. the & in a title).
export const SAMPLE_TOKENS: Record<MessageType, TokenValues> = {
  "stream.created": {
    title: "Sunday Service — Worship & Word",
    description: "Live broadcast of the 2nd service",
    scheduledStartTime: "Sun, 18 May 2026 09:00:00 GMT",
    actualStartTime: "",
    status: "created",
    privacyStatus: "unlisted",
    isForKids: "No",
    latencyPreference: "normal",
    tags: "service, worship, live",
    createdAt: "Sat, 17 May 2026 18:40:00 GMT",
    streamUrl: "https://youtube.com/watch?v=abc123",
  },
  "meeting.created": {
    topic: "Production Team Sync",
    description: "Weekly run-through and assignments",
    startTime: "Mon, 19 May 2026 14:00:00 GMT",
    duration: "60 min",
    timezone: "Africa/Harare",
    meetingType: "scheduled",
    waitingRoom: "On",
    recurrenceType: "weekly",
    createdAt: "Mon, 12 May 2026 11:00:00 GMT",
    joinUrl: "https://zoom.us/j/123456789",
  },
  "request.created": { ...REQUEST_SAMPLE, status: "not started" },
  "request.status_changed": REQUEST_SAMPLE,
  "request.archived": { ...REQUEST_SAMPLE, status: "archived" },
  "request.stale": { ...REQUEST_SAMPLE, status: "in progress", staleDays: "5" },
  "booking.created": BOOKING_SAMPLE,
  "booking.status_changed": {
    ...BOOKING_SAMPLE,
    status: "returned",
    returnedAt: "Sun, 24 May 2026 19:30:00 GMT",
  },
  "booking.stale": {
    ...BOOKING_SAMPLE,
    status: "checked_out",
    staleReason: "Overdue for return",
    staleDays: "4",
  },
  "assignment.request": { ...REQUEST_SAMPLE, duty: "Design", assigneeName: "Craig C." },
  "assignment.cue": {
    title: "Roll opening VT",
    eventName: "Sunday Service",
    eventDescription: "2nd service — full programme",
    eventScheduledAt: "Sun, 18 May 2026 09:00:00 GMT",
    eventDuration: "120 min",
    trackName: "Vision Mixing",
    cueStart: "00:05:30",
    cueDuration: "00:01:15",
    cueType: "Video",
    cueNotes: "Fade audio under at the end",
    duty: "Playback",
    assigneeName: "Craig C.",
    linkUrl: "https://app.example.com/cue-sheet/events/77",
  },
  "assignment.checklist_item": {
    title: "Check radio mic batteries",
    checklistName: "Pre-service audio",
    checklistDescription: "Audio readiness for the 2nd service",
    checklistScheduledAt: "Sun, 18 May 2026 08:00:00 GMT",
    sectionName: "Microphones",
    itemChecked: "No",
    duty: "Audio",
    assigneeName: "Craig C.",
    linkUrl: "https://app.example.com/cue-sheet/checklist/9",
  },
};

// Human labels for the settings UI.
export const DM_MESSAGE_LABELS: Record<DmMessageType, string> = {
  "assignment.request": "Request assignment",
  "assignment.cue": "Cue assignment",
  "assignment.checklist_item": "Checklist item assignment",
};
