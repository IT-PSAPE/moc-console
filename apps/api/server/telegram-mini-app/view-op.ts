// The "view" op, plus the shared "load this entity's detail for this viewer"
// path reused after a mutation (action / scan) to return a refreshed view.

import { availableTelegramActions, type MiniAppResponse, type MiniAppTarget, type MiniAppViewer } from "@moc/notifications"
import { deriveVenueBookingPhase } from "../notifications/dispatch-tokens.js"
import { fetchFormatSettings } from "../notifications/format-settings.js"
import { loadBooking } from "./store/booking-store.js"
import { loadChecklist } from "./store/checklist-store.js"
import { loadRequest, loadRequestCategoryName } from "./store/request-store.js"
import { loadVenueBooking } from "./store/venue-booking-store.js"
import { findViewerByTelegramId, loadWorkspacePermissions } from "./store/viewer-store.js"
import { buildBookingDetail, buildChecklistDetail, buildRequestDetail, buildVenueBookingDetail } from "./view-builders.js"

export type ViewerContext = { viewer: MiniAppViewer; canUpdate: boolean }

export type MiniAppOpError = Extract<MiniAppResponse, { ok: false }>

function errorResponse(error: MiniAppOpError["error"], message: string): MiniAppOpError {
  return { ok: false, error, message }
}

export async function resolveViewerContext(telegramUserId: string, workspaceId: string): Promise<ViewerContext | MiniAppOpError> {
  const linked = await findViewerByTelegramId(telegramUserId)
  if (!linked) return errorResponse("not_linked", "Link your Telegram account in MOC Console first.")

  const permissions = await loadWorkspacePermissions(workspaceId, linked.userId)
  if (!permissions || !permissions.canRead) return errorResponse("forbidden", "You don't have access to this workspace.")

  return { viewer: { userId: linked.userId, name: linked.name, canUpdate: permissions.canUpdate }, canUpdate: permissions.canUpdate }
}

/** Loads and builds the detail for a request/booking/venue_booking/checklist entity id. Shared by the view op and post-mutation refreshes. */
export async function loadEntityDetailResponse(
  kind: "request" | "booking" | "venue_booking" | "checklist",
  id: string,
  telegramUserId: string,
): Promise<MiniAppResponse> {
  if (kind === "request") {
    const request = await loadRequest(id)
    if (!request) return errorResponse("not_found", "That request could not be found.")
    const context = await resolveViewerContext(telegramUserId, request.workspaceId)
    if ("error" in context) return context
    const [categoryName, format] = await Promise.all([
      loadRequestCategoryName(request.workspaceId, request.category),
      fetchFormatSettings(request.workspaceId),
    ])
    const actions = context.canUpdate ? availableTelegramActions("request", request.status) : []
    const detail = buildRequestDetail(request, categoryName ?? request.category, format, actions)
    return { ok: true, viewer: context.viewer, detail }
  }

  if (kind === "booking") {
    const booking = await loadBooking(id)
    if (!booking) return errorResponse("not_found", "That booking could not be found.")
    const context = await resolveViewerContext(telegramUserId, booking.workspaceId)
    if ("error" in context) return context
    const format = await fetchFormatSettings(booking.workspaceId)
    const actions = context.canUpdate ? availableTelegramActions("booking", booking.status) : []
    const detail = buildBookingDetail(booking, format, actions, context.canUpdate)
    return { ok: true, viewer: context.viewer, detail }
  }

  if (kind === "venue_booking") {
    const venueBooking = await loadVenueBooking(id)
    if (!venueBooking) return errorResponse("not_found", "That venue booking could not be found.")
    const context = await resolveViewerContext(telegramUserId, venueBooking.workspaceId)
    if ("error" in context) return context
    const format = await fetchFormatSettings(venueBooking.workspaceId)
    const phase = deriveVenueBookingPhase(venueBooking.status, venueBooking.startsAt, venueBooking.endsAt)
    const actions = context.canUpdate ? availableTelegramActions("venue_booking", venueBooking.status) : []
    const detail = buildVenueBookingDetail(venueBooking, phase, format, actions)
    return { ok: true, viewer: context.viewer, detail }
  }

  const checklist = await loadChecklist(id)
  if (!checklist) return errorResponse("not_found", "That checklist could not be found.")
  const context = await resolveViewerContext(telegramUserId, checklist.workspaceId)
  if ("error" in context) return context
  const detail = buildChecklistDetail(checklist, context.canUpdate)
  return { ok: true, viewer: context.viewer, detail }
}

const TARGET_KIND_TO_ENTITY_KIND: Record<MiniAppTarget["kind"], "request" | "booking" | "venue_booking" | "checklist"> = {
  request: "request",
  booking: "booking",
  venue_booking: "venue_booking",
  checklist: "checklist",
  scan: "booking",
}

export async function handleView(telegramUserId: string, target: MiniAppTarget): Promise<MiniAppResponse> {
  return loadEntityDetailResponse(TARGET_KIND_TO_ENTITY_KIND[target.kind], target.id, telegramUserId)
}
