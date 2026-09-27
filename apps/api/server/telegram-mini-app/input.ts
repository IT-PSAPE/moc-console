// Hand-written validation of the Mini App request body into `MiniAppRequest`
// (the repo has no zod dependency and the contract asks for none). Every
// branch is exhaustive over the documented `op` values so an unrecognised
// shape always falls through to the final "Unknown operation" error.

import type {
  MiniAppRequest,
  MiniAppScanMode,
  MiniAppTargetKind,
  TelegramAction,
  TelegramActionEntityType,
} from "@moc/notifications"

const MAX_INIT_DATA_LENGTH = 4_096
const MAX_SCANNED_ITEMS = 200

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TARGET_KINDS: readonly MiniAppTargetKind[] = ["request", "booking", "venue_booking", "checklist", "scan"]
const ENTITY_TYPES: readonly TelegramActionEntityType[] = ["request", "booking", "venue_booking"]
const ACTIONS: readonly TelegramAction[] = ["start", "complete", "check_out", "return", "approve", "reject"]
const SCAN_MODES: readonly MiniAppScanMode[] = ["check_out", "return"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
}

function parseInitData(body: Record<string, unknown>): string | null {
  const initData = body.initData
  return typeof initData === "string" && initData.length > 0 && initData.length <= MAX_INIT_DATA_LENGTH ? initData : null
}

function parseView(body: Record<string, unknown>, initData: string): MiniAppRequest | string {
  if (!isRecord(body.target)) return "Missing target"
  const { kind, id } = body.target
  if (!isOneOf(kind, TARGET_KINDS)) return "Invalid target kind"
  if (!isUuid(id)) return "Invalid target id"
  return { op: "view", initData, target: { kind, id } }
}

function parseAction(body: Record<string, unknown>, initData: string): MiniAppRequest | string {
  const { entityType, entityId, action } = body
  if (!isOneOf(entityType, ENTITY_TYPES)) return "Invalid entity type"
  if (!isUuid(entityId)) return "Invalid entity id"
  if (!isOneOf(action, ACTIONS)) return "Invalid action"
  return { op: "action", initData, entityType, entityId, action }
}

function parseChecklistToggle(body: Record<string, unknown>, initData: string): MiniAppRequest | string {
  const { checklistId, itemId, checked } = body
  if (!isUuid(checklistId)) return "Invalid checklist id"
  if (!isUuid(itemId)) return "Invalid item id"
  if (typeof checked !== "boolean") return "Invalid checked flag"
  return { op: "checklist.toggle", initData, checklistId, itemId, checked }
}

function parseScanComplete(body: Record<string, unknown>, initData: string): MiniAppRequest | string {
  const { bookingId, mode, scannedItemIds } = body
  if (!isUuid(bookingId)) return "Invalid booking id"
  if (!isOneOf(mode, SCAN_MODES)) return "Invalid scan mode"
  if (!Array.isArray(scannedItemIds) || scannedItemIds.length > MAX_SCANNED_ITEMS || !scannedItemIds.every(isUuid)) {
    return "Invalid scanned item ids"
  }
  return { op: "booking.scan_complete", initData, bookingId, mode, scannedItemIds }
}

export function parseMiniAppRequest(body: unknown): MiniAppRequest | string {
  if (!isRecord(body)) return "Invalid request body"
  const initData = parseInitData(body)
  if (!initData) return "Missing initData"

  if (body.op === "view") return parseView(body, initData)
  if (body.op === "action") return parseAction(body, initData)
  if (body.op === "checklist.toggle") return parseChecklistToggle(body, initData)
  if (body.op === "booking.scan_complete") return parseScanComplete(body, initData)
  return "Unknown operation"
}
