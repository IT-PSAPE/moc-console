import type { ItemKind } from "@moc/types/discussion"
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js"

export const ITEM_TABLES: Record<ItemKind, string> = {
  request: "requests",
  equipment: "equipment",
  booking: "bookings",
  "venue-booking": "venue_bookings",
  checklist: "checklists",
  stream: "streams",
  meeting: "zoom_meetings",
  broadcast: "broadcasts",
  "scheduled-message": "scheduled_message_occurrences",
}

export type DiscussionTarget = { kind: ItemKind; itemId: string }
export type DiscussionCursor = DiscussionTarget & { createdAt: string; id: string }

export function discussionTarget(input: Record<string, unknown>): DiscussionTarget {
  const kind = stringField(input, "kind")
  if (!Object.hasOwn(ITEM_TABLES, kind)) throw new PlatformInputError("Invalid item kind")
  return { kind: kind as ItemKind, itemId: uuidField(input, "itemId").toLowerCase() }
}

export function discussionCursor(input: Record<string, unknown>, target: DiscussionTarget): DiscussionCursor | null {
  if (input.cursor === undefined || input.cursor === null) return null
  try {
    const value = stringField(input, "cursor")
    if (value.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid cursor")
    const record = objectInput(JSON.parse(Buffer.from(value, "base64url").toString("utf8")), ["kind", "itemId", "createdAt", "id"])
    const cursorTarget = discussionTarget(record)
    const createdAt = stringField(record, "createdAt")
    const date = new Date(createdAt)
    if (cursorTarget.kind !== target.kind || cursorTarget.itemId !== target.itemId ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}Z$/.test(createdAt) ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== createdAt.slice(0, 19)) throw new Error("Invalid cursor")
    return { ...cursorTarget, createdAt, id: uuidField(record, "id").toLowerCase() }
  } catch {
    throw new PlatformInputError("Invalid cursor")
  }
}

export function encodeDiscussionCursor(cursor: DiscussionCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

export function commentBody(input: Record<string, unknown>): string {
  const body = stringField(input, "body").trim()
  if (!body) throw new PlatformInputError("Comment cannot be empty")
  if (body.length > 10000) throw new PlatformInputError("Comment cannot exceed 10,000 characters")
  return body
}
