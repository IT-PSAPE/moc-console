// Short, one-line rich-HTML notes for follow-up events: no block wrapper,
// so they work equally well as an edited original's <footer> line and,
// when loud, as the text of a reply. Wrap in <p> yourself when sending
// one as a reply body — sendRichMessage needs a block-level root.

import { escapeHtml } from "./template-tokens.js";
import type { FollowUpEventKey } from "./event-routing.js";
import type { MiniAppScanMode, TelegramAction } from "./telegram-mini-app.js";

type NoteTokens = Record<string, string | null | undefined>;

function tokenValue(tokens: NoteTokens, name: string): string {
  const raw = tokens[name];
  return raw && raw.trim() !== "" ? escapeHtml(raw) : "";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled follow-up event: ${String(value)}`);
}

const VENUE_DECISION_NOTE: Record<string, string> = {
  approved: "✅ Approved",
  rejected: "🚫 Rejected",
  auto: "↩️ Restored — awaiting a decision",
};

/** One-line note for a follow-up event; used both as the footer and, when loud, the reply. */
export function renderFollowUpNote(eventType: FollowUpEventKey, tokens: NoteTokens): string {
  switch (eventType) {
    case "request.requester_updated":
    case "booking.requester_updated":
    case "venue_booking.requester_updated": {
      const changeSummary = tokenValue(tokens, "changeSummary");
      return changeSummary ? `✏️ Updated by requester — ${changeSummary}` : "✏️ Updated by requester";
    }
    case "request.requester_deleted":
    case "booking.requester_deleted":
    case "venue_booking.requester_deleted":
      return "🗑️ Deleted by requester";
    case "request.status_changed":
    case "booking.status_changed": {
      const status = tokenValue(tokens, "status");
      return status ? `🔄 Status changed to ${status}` : "🔄 Status changed";
    }
    case "request.archived":
      return "🗄️ Archived";
    case "venue_booking.cancelled": {
      const cancelReason = tokenValue(tokens, "cancelReason");
      return cancelReason ? `🚫 Cancelled — ${cancelReason}` : "🚫 Cancelled";
    }
    case "venue_booking.status_changed":
      return VENUE_DECISION_NOTE[tokens.decision ?? ""] ?? "🔄 Status changed";
    case "stream.updated": {
      const changeSummary = tokenValue(tokens, "changeSummary");
      return changeSummary ? `✏️ Stream updated — ${changeSummary}` : "✏️ Stream details updated";
    }
    case "meeting.updated": {
      const changeSummary = tokenValue(tokens, "changeSummary");
      return changeSummary ? `✏️ Meeting updated — ${changeSummary}` : "✏️ Meeting details updated";
    }
    default:
      return assertNever(eventType);
  }
}

const ACTION_TEXT: Record<TelegramAction, { emoji: string; verb: string }> = {
  start: { emoji: "▶️", verb: "Started" },
  complete: { emoji: "✅", verb: "Completed" },
  check_out: { emoji: "📤", verb: "Checked out" },
  return: { emoji: "📥", verb: "Returned" },
  approve: { emoji: "✅", verb: "Approved" },
  reject: { emoji: "🚫", verb: "Cancelled" },
};

/** e.g. ("start", "Craig") → "▶️ Started by Craig". */
export function renderActionNote(action: TelegramAction, actorName: string): string {
  const { emoji, verb } = ACTION_TEXT[action];
  return `${emoji} ${verb} by ${escapeHtml(actorName)}`;
}

const SCAN_MODE_LABEL: Record<MiniAppScanMode, string> = { check_out: "Check-out", return: "Return" };

export function renderScanNote(input: {
  mode: MiniAppScanMode;
  actorName: string;
  scannedCount: number;
  itemCount: number;
  missingNames: string[];
}): string {
  const base = `📋 ${SCAN_MODE_LABEL[input.mode]} scan by ${escapeHtml(input.actorName)} — ${input.scannedCount}/${input.itemCount} items scanned.`;
  if (input.missingNames.length === 0) return base;
  return `${base} Missing: ${input.missingNames.map((name) => escapeHtml(name)).join(", ")}`;
}

function formatFallbackTime(date: Date): string {
  return `${date.toISOString().slice(11, 16)} UTC`;
}

/**
 * Appends the latest-change footer, e.g. "▶️ Started by Craig · 14:02". Callers
 * pass a freshly rendered announcement each time, so footers never stack.
 * Telegram renders <tg-time> in each reader's own time zone; the inner text is
 * only the fallback.
 */
export function appendUpdateFooter(richHtml: string, note: string, updatedAt: Date): string {
  const unixSeconds = Math.floor(updatedAt.getTime() / 1000);
  const time = `<tg-time unix="${unixSeconds}" format="t">${formatFallbackTime(updatedAt)}</tg-time>`;
  return `${richHtml}\n<footer>${note} · ${time}</footer>`;
}

const STRIKABLE_BLOCK_RE = /<(p|h[1-6]|footer)>([\s\S]*?)<\/\1>/g;

/** Deleted state for an original that could not be deleted: a banner, then the old content struck through block by block. */
export function renderDeletedOriginal(richHtml: string): string {
  const struck = richHtml.replace(STRIKABLE_BLOCK_RE, "<$1><s>$2</s></$1>");
  return `<p><b>🗑️ Deleted by requester</b></p>\n${struck}`;
}
