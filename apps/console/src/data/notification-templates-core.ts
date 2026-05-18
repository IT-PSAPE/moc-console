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

export const TEMPLATE_TOKENS: Record<MessageType, readonly TokenSpec[]> = {
  "stream.created": [
    { name: "title" },
    { name: "scheduledStartTime" },
    { name: "streamUrl", raw: true },
  ],
  "meeting.created": [
    { name: "topic" },
    { name: "startTime" },
    { name: "joinUrl", raw: true },
  ],
  "request.created": [
    { name: "title" },
    { name: "status" },
    { name: "requesterName" },
    { name: "linkUrl", raw: true },
  ],
  "request.status_changed": [
    { name: "title" },
    { name: "status" },
    { name: "requesterName" },
    { name: "linkUrl", raw: true },
  ],
  "request.archived": [
    { name: "title" },
    { name: "requesterName" },
    { name: "linkUrl", raw: true },
  ],
  "booking.created": [
    { name: "title" },
    { name: "status" },
    { name: "requesterName" },
    { name: "linkUrl", raw: true },
  ],
  "booking.status_changed": [
    { name: "title" },
    { name: "status" },
    { name: "linkUrl", raw: true },
  ],
  "assignment.request": [
    { name: "title" },
    { name: "duty" },
    { name: "assigneeName" },
    { name: "linkUrl", raw: true },
  ],
  "assignment.cue": [
    { name: "title" },
    { name: "eventName" },
    { name: "duty" },
    { name: "assigneeName" },
    { name: "linkUrl", raw: true },
  ],
  "assignment.checklist_item": [
    { name: "title" },
    { name: "checklistName" },
    { name: "duty" },
    { name: "assigneeName" },
    { name: "linkUrl", raw: true },
  ],
};

// Friendly built-in wording with a modest amount of emoji. These are
// the fallback messages when a workspace has not set a custom template.
// Keep every line either token-free (always shown) or driven by a
// single token (auto-dropped when that token is empty) so optional
// fields collapse cleanly — see renderTemplate + the core tests.
export const DEFAULT_TEMPLATES: Record<MessageType, string> = {
  "stream.created":
    "🔴 <b>We're going live on YouTube</b>\n\n{{title}}\n🗓 Starts {{scheduledStartTime}}\n\n🔗 <a href=\"{{streamUrl}}\">Watch the stream</a>",
  "meeting.created":
    "📅 <b>New Zoom meeting scheduled</b>\n\n{{topic}}\n🗓 Starts {{startTime}}\n\n🔗 <a href=\"{{joinUrl}}\">Join the meeting</a>",
  "request.created":
    "✨ <b>New request just came in</b>\n\n{{title}}\n🙋 From {{requesterName}}\n📌 Status: <i>{{status}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "request.status_changed":
    "🔄 <b>Request status updated</b>\n\n{{title}}\n📌 Now: <i>{{status}}</i>\n🙋 From {{requesterName}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "request.archived":
    "🗄️ <b>Request archived</b>\n\n{{title}}\n🙋 From {{requesterName}}\n\n🔗 <a href=\"{{linkUrl}}\">Open the request</a>",
  "booking.created":
    "🎒 <b>New equipment booking</b>\n\n{{title}}\n🙋 From {{requesterName}}\n📌 Status: <i>{{status}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">Open the booking</a>",
  "booking.status_changed":
    "🔄 <b>Equipment booking updated</b>\n\n{{title}}\n📌 Now: <i>{{status}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">Open the booking</a>",
  "assignment.request":
    "👋 Hey {{assigneeName}}!\n🎯 <b>You've been assigned to a request</b>\n\n{{title}}\n🛠 Duty: <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Request Details</a>",
  "assignment.cue":
    "👋 Hey {{assigneeName}}!\n🎬 <b>You've been assigned to a cue</b>\n\n{{title}}\n📋 Event: {{eventName}}\n🛠 Duty: <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Event Details</a>",
  "assignment.checklist_item":
    "👋 Hey {{assigneeName}}!\n✅ <b>You've been assigned to a checklist item</b>\n\n{{title}}\n📋 Checklist: {{checklistName}}\n🛠 Duty: <i>{{duty}}</i>\n\n🔗 <a href=\"{{linkUrl}}\">View Full Checklist Details</a>",
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

// Sample data for the settings live-preview. Values are intentionally
// realistic so admins see escaping behaviour (e.g. the & in a title).
export const SAMPLE_TOKENS: Record<MessageType, TokenValues> = {
  "stream.created": {
    title: "Sunday Service — Worship & Word",
    scheduledStartTime: "Sun, 18 May 2026 09:00:00 GMT",
    streamUrl: "https://youtube.com/watch?v=abc123",
  },
  "meeting.created": {
    topic: "Production Team Sync",
    startTime: "Mon, 19 May 2026 14:00:00 GMT",
    joinUrl: "https://zoom.us/j/123456789",
  },
  "request.created": {
    title: "Lower-third graphic for guest speaker",
    status: "not started",
    requesterName: "Tendai M.",
    linkUrl: "https://app.example.com/requests/123",
  },
  "request.status_changed": {
    title: "Lower-third graphic for guest speaker",
    status: "in progress",
    requesterName: "Tendai M.",
    linkUrl: "https://app.example.com/requests/123",
  },
  "request.archived": {
    title: "Lower-third graphic for guest speaker",
    requesterName: "Tendai M.",
    linkUrl: "https://app.example.com/requests/123",
  },
  "booking.created": {
    title: "Sony FX6 + tripod",
    status: "pending",
    requesterName: "Rumbi K.",
    linkUrl: "https://app.example.com/bookings/45",
  },
  "booking.status_changed": {
    title: "Sony FX6 + tripod",
    status: "approved",
    linkUrl: "https://app.example.com/bookings/45",
  },
  "assignment.request": {
    title: "Lower-third graphic for guest speaker",
    duty: "Design",
    assigneeName: "Craig C.",
    linkUrl: "https://app.example.com/requests/123",
  },
  "assignment.cue": {
    title: "Roll opening VT",
    eventName: "Sunday Service",
    duty: "Playback",
    assigneeName: "Craig C.",
    linkUrl: "https://app.example.com/cue-sheet/events/77",
  },
  "assignment.checklist_item": {
    title: "Check radio mic batteries",
    checklistName: "Pre-service audio",
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
