// Contract between the Telegram Mini App (apps/request /tg) and the API
// endpoint POST /api/telegram/mini-app. The API formats every label and date,
// so the Mini App only renders what it is given.

// ─── Launch targets ────────────────────────────────────

export type MiniAppTargetKind = "request" | "booking" | "venue_booking" | "checklist" | "scan";

export type MiniAppTarget = { kind: MiniAppTargetKind; id: string };

// Telegram start params allow only [A-Za-z0-9_-] and 64 characters, so each
// target is a short prefix plus the entity uuid, e.g. "rq_<uuid>".
const START_PARAM_PREFIX: Record<MiniAppTargetKind, string> = {
  request: "rq",
  booking: "bk",
  venue_booking: "vb",
  checklist: "cl",
  scan: "sc",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeMiniAppStartParam(target: MiniAppTarget): string {
  return `${START_PARAM_PREFIX[target.kind]}_${target.id}`;
}

export function parseMiniAppStartParam(value: string | null | undefined): MiniAppTarget | null {
  if (!value) return null;
  const separator = value.indexOf("_");
  if (separator < 0) return null;
  const prefix = value.slice(0, separator);
  const id = value.slice(separator + 1);
  const kind = (Object.keys(START_PARAM_PREFIX) as MiniAppTargetKind[])
    .find((candidate) => START_PARAM_PREFIX[candidate] === prefix);
  if (!kind || !UUID_RE.test(id)) return null;
  return { kind, id };
}

// ─── Actions ───────────────────────────────────────────
// The same verbs as the Telegram inline buttons and api_apply_telegram_action.

export type TelegramActionEntityType = "request" | "booking" | "venue_booking";

export type TelegramAction = "start" | "complete" | "check_out" | "return" | "approve" | "reject";

export type MiniAppActionStyle = "primary" | "success" | "danger";

export type MiniAppAction = { action: TelegramAction; label: string; style: MiniAppActionStyle };

// ─── Details ───────────────────────────────────────────

export type MiniAppStatusColor = "yellow" | "green" | "blue" | "gray" | "purple" | "red" | "orange";

export type MiniAppStatus = { value: string; label: string; color: MiniAppStatusColor };

export type MiniAppField = { label: string; value: string };

export type MiniAppEquipmentItem = {
  /** booking_items.id */
  id: string;
  equipmentId: string;
  name: string;
  serialNumber: string;
  category: string;
};

export type MiniAppScanMode = "check_out" | "return";

export type MiniAppEntityDetail = {
  kind: TelegramActionEntityType;
  id: string;
  title: string;
  trackingCode: string | null;
  status: MiniAppStatus;
  fields: MiniAppField[];
  notes: string | null;
  /** Only actions the viewer may take right now; empty for read-only viewers. */
  actions: MiniAppAction[];
  /** Equipment bookings only. */
  equipment: MiniAppEquipmentItem[];
  /** Equipment bookings only: which scan flow applies, or null when none does or the viewer cannot update. */
  scanMode: MiniAppScanMode | null;
};

export type MiniAppChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  /** True when the viewer has update permission in the workspace. */
  canToggle: boolean;
  assigneeNames: string[];
};

export type MiniAppChecklistSection = { id: string | null; name: string; items: MiniAppChecklistItem[] };

export type MiniAppChecklistDetail = {
  kind: "checklist";
  id: string;
  name: string;
  description: string;
  scheduledAt: string;
  sections: MiniAppChecklistSection[];
};

export type MiniAppDetail = MiniAppEntityDetail | MiniAppChecklistDetail;

export type MiniAppViewer = { userId: string; name: string; canUpdate: boolean };

// ─── Requests and responses ────────────────────────────

export type MiniAppRequest =
  | { op: "view"; initData: string; target: MiniAppTarget }
  | { op: "action"; initData: string; entityType: TelegramActionEntityType; entityId: string; action: TelegramAction }
  | { op: "checklist.toggle"; initData: string; checklistId: string; itemId: string; checked: boolean }
  | { op: "booking.scan_complete"; initData: string; bookingId: string; mode: MiniAppScanMode; scannedItemIds: string[] };

export type MiniAppErrorCode =
  | "unauthorized"
  | "not_linked"
  | "forbidden"
  | "not_found"
  | "invalid_transition"
  | "invalid";

export type MiniAppResponse =
  | { ok: true; viewer: MiniAppViewer; detail: MiniAppDetail }
  | { ok: false; error: MiniAppErrorCode; message: string };
