// Inline keyboards for Telegram notifications: the action buttons that
// drive api_apply_telegram_action, plus the "View"/"Scan items" buttons
// that launch the Mini App. Group chats can't use Telegram's `web_app`
// button (private chats only), so "View"/"Scan items" are plain URL
// buttons to the bot's Main Mini App (`https://t.me/<bot>?startapp=…`).

import {
  encodeMiniAppStartParam,
  type MiniAppAction,
  type MiniAppActionStyle,
  type TelegramAction,
  type TelegramActionEntityType,
} from "./telegram-mini-app.js";

export type InlineKeyboardButton = {
  text: string;
  style?: MiniAppActionStyle;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
};

export type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

export type TelegramActionCallback = {
  entityType: TelegramActionEntityType;
  entityId: string;
  action: TelegramAction;
};

const ENTITY_CODE: Record<TelegramActionEntityType, string> = {
  request: "rq",
  booking: "bk",
  venue_booking: "vb",
};
const ENTITY_TYPE_BY_CODE = new Map(
  (Object.entries(ENTITY_CODE) as [TelegramActionEntityType, string][]).map(([type, code]) => [code, type]),
);

const VALID_ACTIONS = new Set<TelegramAction>(["start", "complete", "check_out", "return", "approve", "reject"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** e.g. "a:rq:start:<uuid>" — always ≤ 64 bytes (callback_data's limit). */
export function encodeActionCallback(callback: TelegramActionCallback): string {
  return `a:${ENTITY_CODE[callback.entityType]}:${callback.action}:${callback.entityId}`;
}

export function parseActionCallback(data: string): TelegramActionCallback | null {
  const parts = data.split(":");
  if (parts.length !== 4 || parts[0] !== "a") return null;
  const [, entityCode, action, entityId] = parts;
  const entityType = ENTITY_TYPE_BY_CODE.get(entityCode);
  if (!entityType || !VALID_ACTIONS.has(action as TelegramAction) || !UUID_RE.test(entityId)) return null;
  return { entityType, entityId, action: action as TelegramAction };
}

// The actions valid for the stored status. venue_booking's stored status
// is 'auto' | 'approved' | 'rejected' | 'cancelled'; 'auto' means booked
// and awaiting an approve/reject decision. Shared by the notification
// keyboard and the Mini App (same table backs both).
export function availableTelegramActions(entityType: TelegramActionEntityType, status: string): MiniAppAction[] {
  if (entityType === "request") {
    if (status === "not_started") return [action("start", "Start", "primary"), action("complete", "Complete", "success")];
    if (status === "in_progress") return [action("complete", "Complete", "success")];
  }
  if (entityType === "booking") {
    if (status === "booked") return [action("check_out", "Check out", "primary")];
    if (status === "checked_out") return [action("return", "Return", "success")];
  }
  if (entityType === "venue_booking") {
    if (status === "auto") return [action("approve", "Approve", "success"), action("reject", "Cancel", "danger")];
    if (status === "approved") return [action("reject", "Cancel", "danger")];
  }
  return [];
}

function action(value: TelegramAction, label: string, style: MiniAppActionStyle): MiniAppAction {
  return { action: value, label, style };
}

export type KeyboardTarget =
  | { entityType: TelegramActionEntityType; entityId: string; status: string }
  | { entityType: "checklist"; entityId: string };

const SCANNABLE_BOOKING_STATUSES = new Set(["booked", "checked_out"]);

/** null when there is nothing to show. botUsername null ⇒ no Open/Scan buttons. */
export function buildNotificationKeyboard(
  target: KeyboardTarget,
  options: { botUsername: string | null },
): InlineKeyboardMarkup | null {
  const rows: InlineKeyboardButton[][] = [];

  if (target.entityType !== "checklist") {
    const actions = availableTelegramActions(target.entityType, target.status);
    if (actions.length > 0) {
      rows.push(actions.map((a) => ({
        text: a.label,
        style: a.style,
        callback_data: encodeActionCallback({ entityType: target.entityType, entityId: target.entityId, action: a.action }),
      })));
    }
  }

  if (options.botUsername) {
    const openRow: InlineKeyboardButton[] = [{
      text: target.entityType === "checklist" ? "View checklist" : "View",
      url: openUrl(options.botUsername, target),
    }];
    if (target.entityType === "booking" && SCANNABLE_BOOKING_STATUSES.has(target.status)) {
      openRow.push({ text: "Scan items", url: openUrl(options.botUsername, { entityType: "scan", entityId: target.entityId }) });
    }
    rows.push(openRow);
  }

  return rows.length > 0 ? { inline_keyboard: rows } : null;
}

function openUrl(botUsername: string, target: { entityType: TelegramActionEntityType | "checklist" | "scan"; entityId: string }): string {
  const startParam = encodeMiniAppStartParam({ kind: target.entityType, id: target.entityId });
  return `https://t.me/${botUsername}?startapp=${startParam}`;
}

const STATUS_LABELS: Record<TelegramActionEntityType, Record<string, string>> = {
  request: { not_started: "Not started", in_progress: "In progress", completed: "Completed", archived: "Archived" },
  booking: { booked: "Booked", checked_out: "Checked out", returned: "Returned", archived: "Archived" },
  venue_booking: { auto: "Booked", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" },
};

/** Human label for a stored status, e.g. for the webhook's "Already <label>" alerts. */
export function telegramStatusLabel(entityType: TelegramActionEntityType, storedStatus: string): string {
  return STATUS_LABELS[entityType][storedStatus] ?? storedStatus.replace(/_/g, " ");
}
