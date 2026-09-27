// The "booking.scan_complete" op: scanning equipment either checks a booking
// out or returns it, then posts a loud scan-summary follow-up.

import { randomUUID } from "node:crypto"

import { renderScanNote, type MiniAppResponse, type MiniAppScanMode } from "@moc/notifications"
import { publishEntityFollowUp } from "../notifications/follow-ups.js"
import { applyTelegramAction } from "../telegram-actions.js"
import { loadBooking } from "./store/booking-store.js"
import { findViewerByTelegramId, loadWorkspacePermissions } from "./store/viewer-store.js"
import { loadEntityDetailResponse } from "./view-op.js"

const TARGET_STATUS: Record<MiniAppScanMode, string> = { check_out: "checked_out", return: "returned" }
const REQUIRED_STATUS: Record<MiniAppScanMode, string> = { check_out: "booked", return: "checked_out" }
const TRANSITION_ACTION: Record<MiniAppScanMode, "check_out" | "return"> = { check_out: "check_out", return: "return" }

export async function handleScanComplete(
  telegramUserId: string,
  bookingId: string,
  mode: MiniAppScanMode,
  scannedItemIds: string[],
): Promise<MiniAppResponse> {
  const linked = await findViewerByTelegramId(telegramUserId)
  if (!linked) return { ok: false, error: "not_linked", message: "Link your Telegram account in MOC Console first." }

  const booking = await loadBooking(bookingId)
  if (!booking) return { ok: false, error: "not_found", message: "That booking could not be found." }

  const permissions = await loadWorkspacePermissions(booking.workspaceId, linked.userId)
  if (!permissions || !permissions.canRead) return { ok: false, error: "forbidden", message: "You don't have access to this workspace." }
  if (!permissions.canUpdate) return { ok: false, error: "forbidden", message: "You don't have permission to scan items." }

  const validItemIds = new Set(booking.items.map((item) => item.id))
  const scannedSet = new Set(scannedItemIds.filter((id) => validItemIds.has(id)))

  let actorName = linked.name
  if (booking.status !== TARGET_STATUS[mode]) {
    if (booking.status !== REQUIRED_STATUS[mode]) {
      return { ok: false, error: "invalid_transition", message: "This booking is no longer in the expected state." }
    }
    const result = await applyTelegramAction({ telegramUserId, entityType: "booking", entityId: bookingId, action: TRANSITION_ACTION[mode] })
    if (!result.ok) {
      if (result.error === "not_linked") return { ok: false, error: "not_linked", message: "Link your Telegram account in MOC Console first." }
      if (result.error === "forbidden") return { ok: false, error: "forbidden", message: "You don't have permission to do that." }
      if (result.error === "not_found") return { ok: false, error: "not_found", message: "That booking could not be found." }
      if (result.error === "invalid_transition") return { ok: false, error: "invalid_transition", message: "This booking is no longer in the expected state." }
      return { ok: false, error: "invalid", message: "That scan can't be completed." }
    }
    actorName = result.actorName
  }

  const missingNames = booking.items.filter((item) => !scannedSet.has(item.id)).map((item) => item.name)

  await publishEntityFollowUp({
    entityType: "booking",
    entityId: bookingId,
    eventKey: `scan:${bookingId}:${randomUUID()}`,
    note: renderScanNote({ mode, actorName, scannedCount: scannedSet.size, itemCount: booking.items.length, missingNames }),
    loud: true,
  })

  return loadEntityDetailResponse("booking", bookingId, telegramUserId)
}
