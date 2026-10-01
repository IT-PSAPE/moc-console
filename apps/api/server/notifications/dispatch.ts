import { getSupabaseAdmin } from "../supabase-admin.js"
import { getTelegramBotUsername } from "../telegram.js"
import {
  buildNotificationKeyboard,
  eventEntityType,
  isAnnouncementEvent,
  isLoudFollowUp,
  isNotificationEventKey,
  renderFollowUpNote,
  type AnnouncementEventKey,
  type FollowUpEventKey,
  type InlineKeyboardMarkup,
  type NotificationEventKey,
} from "@moc/notifications"
import { enqueueDelivery, processDeliveriesForEvent } from "./delivery-store.js"
import { buildTokens, renderEventText, toNoteTokens } from "./dispatch-tokens.js"
import { fetchEntityStoredStatus } from "./entity-tokens.js"
import { deleteEntityOriginals, publishEntityFollowUp } from "./follow-ups.js"
import {
  resolveDmRouteTarget,
  resolveOverrideTargets,
  type NotifyDestination,
  type RouteRow,
  type Target,
} from "./dispatch-targets.js"
import type { EventPayloadMap } from "./dispatch-payloads.js"

export type { NotifyDestination } from "./dispatch-targets.js"
export {
  deriveVenueBookingPhase,
  formatVenueBookingDuration,
  renderEventText,
  venueBookingSlotCount,
} from "./dispatch-tokens.js"
export { resolveDmRouteTarget, type DmRouteResolution } from "./dispatch-targets.js"
export type {
  BookingCreatedPayload,
  BookingRequesterMutationPayload,
  BookingStatusChangedPayload,
  EventPayloadMap,
  MeetingCreatedPayload,
  MeetingUpdatedPayload,
  RequestArchivedPayload,
  RequestCreatedPayload,
  RequestRequesterMutationPayload,
  RequestStatusChangedPayload,
  StreamCreatedPayload,
  StreamUpdatedPayload,
  VenueBookingCancelledPayload,
  VenueBookingCreatedPayload,
  VenueBookingRequesterMutationPayload,
} from "./dispatch-payloads.js"

const KEYBOARD_ENTITY_TYPES = new Set(["request", "booking", "venue_booking"])

async function logDeliveryFailure(args: {
  workspaceId: string
  eventType: NotificationEventKey
  routeId: string
  groupChatId: string
  threadId: number | null
  /** Set only for a route that targets a person's DM instead of a group. */
  userId?: string | null
  errorCode: number | null
  description: string
  payload: unknown
}): Promise<void> {
  const destination = args.userId
    ? `user ${args.userId}`
    : `${args.groupChatId}${args.threadId !== null ? `/${args.threadId}` : ""}`
  console.error(`Telegram notification failed (${args.eventType} → ${destination})`, {
    source: "notifications.dispatch",
    workspaceId: args.workspaceId,
    routeId: args.routeId,
    groupChatId: args.groupChatId || null,
    threadId: args.threadId,
    userId: args.userId ?? null,
    errorCode: args.errorCode,
    description: args.description,
    payload: args.payload,
  })
}

export type DispatchOptions = {
  /**
   * Overrides the workspace's configured routing for this one event.
   *
   * A non-empty list REPLACES the notification_routes lookup — it does not
   * add to it — and works even when the workspace has no route configured
   * for this event at all. Omitted or empty falls back to the configured
   * routes, including the "no routes, send nothing" case.
   */
  destinations?: readonly NotifyDestination[]
  /** A durable source-event identity. Repeated dispatches reuse its deliveries. */
  eventKey?: string
  /**
   * The entity this event belongs to. Required for a follow-up event (it is
   * how dispatchEvent finds the announcement(s) to edit/reply to/delete) —
   * every outbox row already carries these, so the outbox always supplies
   * them. Announcement events use it only to stamp their own delivery rows.
   */
  entityType?: string
  entityId?: string
}

function fallbackEventKey<K extends NotificationEventKey>(eventType: K, payload: EventPayloadMap[K]): string {
  const p = payload as Record<string, string | null | undefined>
  const source = p.streamId ?? p.meetingId ?? p.requestId ?? p.trackingCode ?? p.linkUrl ?? p.title
  const status = p.status ?? ""
  return `${eventType}:${source ?? "unknown"}:${status}`
}

async function resolveAnnouncementTargets<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
  destinations: readonly NotifyDestination[] | undefined,
): Promise<Target[] | null> {
  if (destinations && destinations.length > 0) {
    const targets = await resolveOverrideTargets(workspaceId, destinations)
    // Every requested destination failed validation. Surface it: the caller
    // explicitly asked for delivery, so silence here would look like the
    // notification simply vanished.
    if (targets.length === 0) {
      await logDeliveryFailure({
        workspaceId,
        eventType,
        routeId: "",
        groupChatId: "",
        threadId: null,
        errorCode: null,
        description:
          "Notification destination override matched no active registered group or open topic in this workspace; nothing was sent.",
        payload,
      })
      return null
    }
    return targets
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("notification_routes")
    .select("id, group_chat_id, thread_id, user_id, telegram_groups(active, removed_at), users(telegram_chat_id)")
    .eq("workspace_id", workspaceId)
    .eq("event_type", eventType)
    .eq("enabled", true)

  if (error) {
    await logDeliveryFailure({
      workspaceId,
      eventType,
      routeId: "",
      groupChatId: "",
      threadId: null,
      errorCode: null,
      description: `Route lookup failed: ${error.message}`,
      payload,
    })
    throw new Error(`Route lookup failed: ${error.message}`)
  }

  const targets: Target[] = []
  for (const r of (data ?? []) as unknown as RouteRow[]) {
    if (r.group_chat_id !== null) {
      const group = Array.isArray(r.telegram_groups) ? r.telegram_groups[0] : r.telegram_groups
      if (group?.active === true && !group.removed_at) {
        targets.push({ kind: "group", routeId: r.id, groupChatId: r.group_chat_id, threadId: r.thread_id })
      }
      continue
    }

    if (r.user_id !== null) {
      const user = Array.isArray(r.users) ? r.users[0] : r.users
      const resolution = resolveDmRouteTarget(r.id, r.user_id, user?.telegram_chat_id ?? null)
      if (resolution.kind === "skip_unlinked") {
        // The route is configured but the person has never linked
        // Telegram. Skip it, but say so — an admin who wired up a DM
        // route deserves to know it is silently delivering nothing,
        // same as an override that matches no valid destination.
        await logDeliveryFailure({
          workspaceId,
          eventType,
          routeId: r.id,
          groupChatId: "",
          threadId: null,
          userId: resolution.userId,
          errorCode: null,
          description: "Notification route targets a user who has not linked Telegram; nothing was sent for this route.",
          payload,
        })
        continue
      }
      targets.push(resolution.target)
    }
  }
  return targets
}

async function dispatchAnnouncement<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
  options: DispatchOptions,
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const targets = await resolveAnnouncementTargets(workspaceId, eventType, payload, options.destinations)
  if (!targets || targets.length === 0) return { attempted: 0, succeeded: 0, failed: 0 }

  // One template lookup per dispatch (shared across all targets), then
  // fall back to the hardcoded default when no custom row is set. An
  // override changes where a notification goes, never what it says.
  // Safe cast: dispatchEvent only reaches here after isAnnouncementEvent
  // has confirmed eventType is one of the five *.created keys.
  const text = await renderEventText(
    workspaceId,
    "group",
    eventType as AnnouncementEventKey,
    payload as EventPayloadMap[AnnouncementEventKey],
  )
  const eventKey = options.eventKey ?? fallbackEventKey(eventType, payload)

  const entityType = options.entityType ?? eventEntityType(eventType)
  const entityId = options.entityId
  const keyboard = await buildAnnouncementKeyboard(entityType, entityId)

  for (const target of targets) {
    if (target.kind === "group") {
      await enqueueDelivery({
        workspaceId,
        eventKey,
        eventType,
        scope: "group",
        routeId: target.routeId || null,
        chatId: target.groupChatId,
        threadId: target.threadId,
        text,
        payload,
        entityType,
        entityId,
        replyMarkup: keyboard,
      })
      continue
    }

    // A route-driven DM still renders the event's group-scope template
    // above (there is no per-event DM template — "dm" template scope is
    // reserved for assignment messages, a different MessageType). Only the
    // destination changes: no thread, and the delivery is scoped/attributed
    // to the recipient the same way an assignment DM is.
    await enqueueDelivery({
      workspaceId,
      eventKey,
      eventType,
      scope: "dm",
      routeId: target.routeId,
      recipientUserId: target.userId,
      chatId: target.chatId,
      threadId: null,
      text,
      payload,
      entityType,
      entityId,
      replyMarkup: keyboard,
    })
  }

  const result = await processDeliveriesForEvent(eventKey)
  return { attempted: result.attempted, succeeded: result.sent, failed: result.failed }
}

async function buildAnnouncementKeyboard(entityType: string, entityId: string | undefined): Promise<InlineKeyboardMarkup | null> {
  if (!entityId || !KEYBOARD_ENTITY_TYPES.has(entityType)) return null
  const status = await fetchEntityStoredStatus(entityType as "request" | "booking" | "venue_booking", entityId)
  if (status === null) return null
  return buildNotificationKeyboard(
    { entityType: entityType as "request" | "booking" | "venue_booking", entityId, status },
    { botUsername: getTelegramBotUsername() },
  )
}

async function dispatchFollowUp<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
  options: DispatchOptions,
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const eventKey = options.eventKey ?? fallbackEventKey(eventType, payload)
  const entityType = options.entityType ?? eventEntityType(eventType)
  const entityId = options.entityId

  if (!entityId) {
    console.error("Follow-up event dispatched without an entityId; nothing to follow up", {
      source: "notifications.dispatch",
      eventType,
      eventKey,
    })
    return { attempted: 0, succeeded: 0, failed: 0 }
  }

  const ref = { entityType: entityType as never, entityId }

  if (eventType.endsWith(".requester_deleted")) {
    await deleteEntityOriginals({ ...ref, eventKey })
    return { attempted: 1, succeeded: 1, failed: 0 }
  }

  const tokens = await buildTokens(workspaceId, eventType, payload)
  const note = renderFollowUpNote(eventType as FollowUpEventKey, toNoteTokens(tokens))
  const loud = isLoudFollowUp(eventType as FollowUpEventKey)
  await publishEntityFollowUp({ ...ref, eventKey, note, loud })
  return { attempted: 1, succeeded: 1, failed: 0 }
}

export async function dispatchEvent<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
  options: DispatchOptions = {},
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  if (!isNotificationEventKey(eventType)) {
    return { attempted: 0, succeeded: 0, failed: 0 }
  }

  if (isAnnouncementEvent(eventType)) {
    return dispatchAnnouncement(workspaceId, eventType, payload, options)
  }

  // A follow-up for a deleted entity must not crash enrichment: buildTokens
  // and every enrich* function it calls are best-effort and return {} for a
  // missing row, and publishEntityFollowUp/deleteEntityOriginals never
  // throw — they log and return.
  return dispatchFollowUp(workspaceId, eventType, payload, options)
}
