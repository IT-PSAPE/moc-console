import { getSupabaseAdmin } from "../supabase-admin.js"
import {
  formatDateTokens,
  isNotificationEventKey,
  renderTemplate,
  type NotificationEventKey,
  type TemplateScope,
  type TokenValues,
} from "@moc/notifications"
import { resolveTemplate } from "./templates.js"
import { fetchFormatSettings } from "./format-settings.js"
import {
  enrichBooking,
  enrichRequest,
  enrichStream,
  enrichMeeting,
  enrichVenueBooking,
} from "./enrich.js"
import { enqueueDelivery, processDeliveriesForEvent } from "./delivery-store.js"

// The optional *Id / trackingCode fields drive DB enrichment (rich
// composable tokens). They're optional so older/external senders that
// omit them still work — the scalar payload fields are the fallback.

export type StreamCreatedPayload = {
  title: string
  scheduledStartTime: string | null
  streamUrl: string | null
  streamId?: string
}

export type MeetingCreatedPayload = {
  topic: string
  startTime: string | null
  joinUrl: string | null
  meetingId?: string
}

export type RequestCreatedPayload = {
  title: string
  status: string | null
  requesterName: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestStatusChangedPayload = {
  title: string
  status: string
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestArchivedPayload = {
  title: string
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
}

export type RequestStalePayload = {
  title: string
  status?: string | null
  requesterName?: string | null
  linkUrl: string
  requestId?: string | null
  staleDays?: string | null
}

export type BookingCreatedPayload = {
  title: string
  status?: string | null
  requesterName?: string | null
  linkUrl: string
  trackingCode?: string | null
}

export type BookingStatusChangedPayload = {
  title: string
  status: string
  linkUrl: string
  trackingCode?: string | null
}

export type BookingStalePayload = {
  title: string
  status?: string | null
  linkUrl: string
  trackingCode?: string | null
  staleDays?: string | null
  staleReason?: string | null
}

// starts_at/ends_at are the booked span, always present (NOT NULL columns).
// There is deliberately no `status` field here — the trigger that enqueues
// this event never stores one; buildTokens derives the reader-facing phase
// from the span (and, for the cancelled event, from the event itself) at
// render time, so a retried delivery reports the phase true when it is sent.
export type VenueBookingCreatedPayload = {
  title: string
  requesterName: string
  trackingCode: string
  venueName: string
  startsAt: string
  endsAt: string
  linkUrl: string
  venueBookingId?: string | null
}

export type VenueBookingCancelledPayload = VenueBookingCreatedPayload

export type EventPayloadMap = {
  "stream.created": StreamCreatedPayload
  "meeting.created": MeetingCreatedPayload
  "request.created": RequestCreatedPayload
  "request.status_changed": RequestStatusChangedPayload
  "request.archived": RequestArchivedPayload
  "request.stale": RequestStalePayload
  "booking.created": BookingCreatedPayload
  "booking.status_changed": BookingStatusChangedPayload
  "booking.stale": BookingStalePayload
  "venue_booking.created": VenueBookingCreatedPayload
  "venue_booking.cancelled": VenueBookingCancelledPayload
}

type RouteRow = {
  id: string
  group_chat_id: string | null
  thread_id: number | null
  user_id: string | null
  telegram_groups: { active: boolean; removed_at: string | null } | null
  users: { telegram_chat_id: string | null } | { telegram_chat_id: string | null }[] | null
}

// A Telegram delivery target. Mirrors notification_routes' (group_chat_id,
// thread_id) pair, so a configured route and a caller-supplied override
// address a destination identically.
export type NotifyDestination = {
  groupChatId: string
  threadId: number | null
}

// A route now resolves to either a group/topic post or one person's DM —
// notification_routes enforces exactly one target (group_chat_id XOR
// user_id) at the database level; this union mirrors that at the type level
// instead of carrying nullable fields both branches would have to guard.
type GroupTarget = {
  kind: "group"
  /** notification_routes.id, or "" for an override (no route row behind it). */
  routeId: string
  groupChatId: string
  threadId: number | null
}

type DmTarget = {
  kind: "dm"
  routeId: string
  userId: string
  chatId: string
}

type Target = GroupTarget | DmTarget

export type DmRouteResolution =
  | { kind: "target"; target: DmTarget }
  | { kind: "skip_unlinked"; userId: string }

// Pure so the unlinked-user skip is directly testable without a DB: given a
// user-targeted route and that user's telegram_chat_id (already looked up),
// decide whether it becomes a send target or a visible skip. A null/empty
// chat id means the person has never linked Telegram.
export function resolveDmRouteTarget(
  routeId: string,
  userId: string,
  telegramChatId: string | null,
): DmRouteResolution {
  if (!telegramChatId) return { kind: "skip_unlinked", userId }
  return { kind: "target", target: { kind: "dm", routeId, userId, chatId: telegramChatId } }
}

/**
 * Turns caller-supplied destinations into send targets, keeping only those
 * that are genuinely registered to this workspace.
 *
 * Destinations arrive from a browser, so none of it is trusted: a chat id is
 * usable only if it belongs to an active, non-removed telegram_group of this
 * workspace, and a thread id only if that topic exists on that group and is
 * open. Anything else is dropped — the caller gets a count back and can see
 * that fewer messages went out than it asked for.
 */
async function resolveOverrideTargets(
  workspaceId: string,
  destinations: readonly NotifyDestination[],
): Promise<Target[]> {
  const admin = getSupabaseAdmin()
  const chatIds = [...new Set(destinations.map((d) => d.groupChatId))]

  const { data, error } = await admin
    .from("telegram_groups")
    .select("chat_id, active, removed_at, telegram_group_topics(thread_id, closed)")
    .eq("workspace_id", workspaceId)
    .in("chat_id", chatIds)

  if (error) {
    throw new Error(`Notification destination lookup failed: ${error.message}`)
  }

  type GroupRow = {
    chat_id: string
    active: boolean
    removed_at: string | null
    telegram_group_topics: { thread_id: number; closed: boolean }[] | null
  }

  const groups = new Map<string, GroupRow>()
  for (const row of (data ?? []) as GroupRow[]) {
    if (row.active !== true || row.removed_at) continue
    groups.set(row.chat_id, row)
  }

  const seen = new Set<string>()
  const targets: Target[] = []

  for (const destination of destinations) {
    const group = groups.get(destination.groupChatId)
    if (!group) continue

    if (destination.threadId !== null) {
      const topic = (group.telegram_group_topics ?? []).find(
        (t) => t.thread_id === destination.threadId,
      )
      if (!topic || topic.closed) continue
    }

    const key = `${destination.groupChatId}:${destination.threadId ?? "main"}`
    if (seen.has(key)) continue
    seen.add(key)

    targets.push({
      kind: "group",
      routeId: "",
      groupChatId: destination.groupChatId,
      threadId: destination.threadId,
    })
  }

  return targets
}

// Normalise to ISO; the workspace zone/format is applied later by
// renderEventText via formatDateTokens (scheduledStartTime/startTime are
// localised date tokens).
function formatScheduled(scheduled: string | null): string | null {
  if (!scheduled) return null
  const date = new Date(scheduled)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

// Mirrors public.venue_booking_phase() exactly: cancelled wins, then the
// clock against the booked span. Pure and takes `now` as a parameter so a
// message that sits in the outbox and is retried later reports the phase
// true at send time, never the phase true when the event was enqueued.
export function deriveVenueBookingPhase(
  startsAt: string,
  endsAt: string,
  cancelled: boolean,
  now: Date = new Date(),
): string {
  if (cancelled) return "cancelled"
  if (now >= new Date(endsAt)) return "completed"
  if (now >= new Date(startsAt)) return "in_progress"
  return "booked"
}

// Slots are always contiguous 30-minute blocks (enforced by
// public_submit_venue_booking), so the count is exact from the span alone —
// no need to join venue_booking_slots just to count rows.
export function venueBookingSlotCount(startsAt: string, endsAt: string): number {
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000
  return Math.max(0, Math.round(minutes / 30))
}

export function formatVenueBookingDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${minutes} min`
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`
}

function nonEmpty(values: TokenValues): TokenValues {
  const out: TokenValues = {}
  for (const [k, v] of Object.entries(values)) {
    if (v != null && v !== "") out[k] = v
  }
  return out
}

// Flatten a payload into the {{token}} values the renderer substitutes,
// enriched with the full DB record when an entity id is present. The
// scalar payload fields always win for the keys they carry (so the
// freshly-built link and event-authoritative status never regress);
// enrichment supplies the extra composable tokens.
async function buildTokens<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
): Promise<TokenValues> {
  switch (eventType) {
    case "stream.created": {
      const p = payload as StreamCreatedPayload
      const base: TokenValues = {
        title: p.title,
        scheduledStartTime: formatScheduled(p.scheduledStartTime),
        streamUrl: p.streamUrl,
      }
      const enriched = p.streamId ? await enrichStream(p.streamId) : {}
      return { ...enriched, ...nonEmpty(base) }
    }
    case "meeting.created": {
      const p = payload as MeetingCreatedPayload
      const base: TokenValues = {
        topic: p.topic,
        startTime: formatScheduled(p.startTime),
        joinUrl: p.joinUrl,
      }
      const enriched = p.meetingId ? await enrichMeeting(p.meetingId) : {}
      return { ...enriched, ...nonEmpty(base) }
    }
    case "request.created":
    case "request.status_changed":
    case "request.archived":
    case "request.stale": {
      const p = payload as RequestCreatedPayload &
        RequestStatusChangedPayload &
        RequestArchivedPayload &
        RequestStalePayload
      const base: TokenValues = {
        title: p.title,
        status: p.status,
        requesterName: p.requesterName,
        staleDays: p.staleDays,
        linkUrl: p.linkUrl,
      }
      const enriched = p.requestId ? await enrichRequest(p.requestId) : {}
      // linkUrl always from payload (built with the console base URL).
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    case "booking.created":
    case "booking.status_changed":
    case "booking.stale": {
      const p = payload as BookingCreatedPayload &
        BookingStatusChangedPayload &
        BookingStalePayload
      const base: TokenValues = {
        title: p.title,
        status: p.status,
        requesterName: p.requesterName,
        staleDays: p.staleDays,
        staleReason: p.staleReason,
        linkUrl: p.linkUrl,
      }
      const enriched = p.trackingCode
        ? await enrichBooking(p.trackingCode, workspaceId)
        : {}
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    case "venue_booking.created":
    case "venue_booking.cancelled": {
      const p = payload as VenueBookingCreatedPayload & VenueBookingCancelledPayload
      // Enrich first: the live row is what decides the phase, and it has to be
      // in hand before deriving it.
      const enriched = p.venueBookingId ? await enrichVenueBooking(p.venueBookingId) : {}
      // The stored row never carries a status, so cancellation is read two
      // ways and either is enough. The firing event covers the cancellation
      // itself; the row's own cancelled_at covers a `created` message that sat
      // in the outbox and is being retried after the booking was cancelled —
      // without it, that late delivery would announce a dead booking as
      // "Booked". Cancelled beats the clock, exactly as
      // public.venue_booking_phase() has it.
      const cancelled =
        eventType === "venue_booking.cancelled" || Boolean(enriched.cancelledAt)
      const base: TokenValues = {
        title: p.title,
        requesterName: p.requesterName,
        trackingCode: p.trackingCode,
        venueName: p.venueName,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        status: deriveVenueBookingPhase(p.startsAt, p.endsAt, cancelled),
        slotCount: String(venueBookingSlotCount(p.startsAt, p.endsAt)),
        duration: formatVenueBookingDuration(p.startsAt, p.endsAt),
        linkUrl: p.linkUrl,
      }
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    default:
      return {}
  }
}

// Resolve the workspace's template for (scope, eventType) and render it
// against the enriched tokens. Shared by group dispatch (below) and the
// stale-items cron's DM path so both render identical wording.
export async function renderEventText<K extends NotificationEventKey>(
  workspaceId: string,
  scope: TemplateScope,
  eventType: K,
  payload: EventPayloadMap[K],
): Promise<string> {
  const [template, format, tokens] = await Promise.all([
    resolveTemplate(workspaceId, scope, eventType),
    fetchFormatSettings(workspaceId),
    buildTokens(workspaceId, eventType, payload),
  ])
  return renderTemplate(
    template,
    formatDateTokens(tokens, format.timezone, format.dateFormat),
  )
}

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
  try {
    const admin = getSupabaseAdmin()
    const destination = args.userId
      ? `user ${args.userId}`
      : `${args.groupChatId}${args.threadId !== null ? `/${args.threadId}` : ""}`
    const summary = `Telegram notification failed (${args.eventType} → ${destination}): ${args.description.slice(0, 200)}`
    await admin.from("bug_reports").insert({
      description: summary.slice(0, 2000),
      error_context: {
        source: "notifications.dispatch",
        workspace_id: args.workspaceId,
        event_type: args.eventType,
        route_id: args.routeId,
        group_chat_id: args.groupChatId || null,
        thread_id: args.threadId,
        user_id: args.userId ?? null,
        telegram_error_code: args.errorCode,
        telegram_description: args.description,
        payload: args.payload,
      },
    })
  } catch (logErr) {
    // Last-resort console: never let logging crash the dispatcher.
    console.error("Failed to log notification delivery failure:", logErr)
  }
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
}

function fallbackEventKey<K extends NotificationEventKey>(eventType: K, payload: EventPayloadMap[K]): string {
  const p = payload as Record<string, string | null | undefined>
  const source = p.streamId ?? p.meetingId ?? p.requestId ?? p.trackingCode ?? p.linkUrl ?? p.title
  const status = p.status ?? ""
  return `${eventType}:${source ?? "unknown"}:${status}`
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

  let targets: Target[]

  if (options.destinations && options.destinations.length > 0) {
    targets = await resolveOverrideTargets(workspaceId, options.destinations)

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
      return { attempted: 0, succeeded: 0, failed: 0 }
    }
  } else {
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

    targets = []
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
  }

  if (targets.length === 0) return { attempted: 0, succeeded: 0, failed: 0 }

  // One template lookup per dispatch (shared across all targets), then
  // fall back to the hardcoded default when no custom row is set. An
  // override changes where a notification goes, never what it says.
  const text = await renderEventText(workspaceId, "group", eventType, payload)
  const eventKey = options.eventKey ?? fallbackEventKey(eventType, payload)

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
    })
  }

  const result = await processDeliveriesForEvent(eventKey)
  return { attempted: result.attempted, succeeded: result.sent, failed: result.failed }
}
