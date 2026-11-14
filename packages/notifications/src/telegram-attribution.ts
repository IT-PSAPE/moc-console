import { escapeHtml } from "./template-tokens.js";

export type TelegramActor = { source: "member" | "requester" | "automation" | "unknown"; name?: string | null };
export type TelegramAttribution = TelegramActor & { action: "created" | "updated" | "assigned" | "sent" | "resent" | "deleted" | "archived" | "registered" | "linked" };

const attributionActions: Record<TelegramAttribution["action"], string> = {
  created: "Created",
  updated: "Updated",
  assigned: "Assigned",
  sent: "Sent",
  resent: "Resent",
  deleted: "Deleted",
  archived: "Archived",
  registered: "Registered",
  linked: "Linked",
};

export function readTelegramActor(value: unknown): TelegramActor {
  if (!value || typeof value !== "object" || !("source" in value)) return { source: "unknown" };
  const { source } = value;
  if (source !== "member" && source !== "requester" && source !== "automation") return { source: "unknown" };
  return { source, name: "name" in value && typeof value.name === "string" ? value.name : null };
}

export function readTelegramActorFromPayload(payload: unknown): TelegramActor {
  return readTelegramActor(payload && typeof payload === "object" && "telegramActor" in payload ? payload.telegramActor : null);
}

function attributionText({ action, source, name }: TelegramAttribution): string {
  const verb = attributionActions[action];
  const actor = name?.trim().replace(/\s+/g, " ");
  const displayName = actor ? Array.from(actor).slice(0, 120).join("") : null;
  if (source === "automation") return `Automation · ${verb}${displayName ? ` by ${displayName}` : " automatically"}`;
  if (source === "requester") return `${verb} by ${displayName ?? "the requester"}`;
  if (source === "member" && displayName) return `${verb} by ${displayName}`;
  return `${verb} · Actor not recorded`;
}

export function renderTelegramAttribution(attribution: TelegramAttribution): string {
  return escapeHtml(attributionText(attribution));
}

export function appendAttributionFooter(richHtml: string, attribution: TelegramAttribution): string {
  return `${richHtml}\n<footer>${renderTelegramAttribution(attribution)}</footer>`;
}

export function appendPlainTelegramFooter(text: string, attribution?: TelegramAttribution): string {
  const footer = attribution ? attributionText(attribution) : "MOC Console automation";
  const limit = 4096 - footer.length - 2;
  const body = text.length > limit ? `${text.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/, "")}…` : text;
  return `${body}\n\n${footer}`;
}
