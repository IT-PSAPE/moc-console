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
}

type RouteRow = {
  id: string
  group_chat_id: string
  thread_id: number | null
  telegram_groups: { active: boolean; removed_at: string | null } | null
}

// A Telegram delivery target. Mirrors notification_routes' (group_chat_id,
// thread_id) pair, so a configured route and a caller-supplied override
// address a destination identically.
export type NotifyDestination = {
  groupChatId: string
  threadId: number | null
}

type Target = {
  /** notification_routes.id, or "" for an override (no route row behind it). */
  routeId: string
  groupChatId: string
  threadId: number | null
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
  errorCode: number | null
  description: string
  payload: unknown
}): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    const summary = `Telegram notification failed (${args.eventType} → ${args.groupChatId}${args.threadId !== null ? `/${args.threadId}` : ""}): ${args.description.slice(0, 200)}`
    await admin.from("bug_reports").insert({
      description: summary.slice(0, 2000),
      error_context: {
        source: "notifications.dispatch",
        workspace_id: args.workspaceId,
        event_type: args.eventType,
        route_id: args.routeId,
        group_chat_id: args.groupChatId,
        thread_id: args.threadId,
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
      .select("id, group_chat_id, thread_id, telegram_groups(active, removed_at)")
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

    targets = ((data ?? []) as unknown as RouteRow[])
      .filter((r) => {
        const group = Array.isArray(r.telegram_groups) ? r.telegram_groups[0] : r.telegram_groups
        return group?.active === true && !group.removed_at
      })
      .map((r) => ({ routeId: r.id, groupChatId: r.group_chat_id, threadId: r.thread_id }))
  }

  if (targets.length === 0) return { attempted: 0, succeeded: 0, failed: 0 }

  // One template lookup per dispatch (shared across all targets), then
  // fall back to the hardcoded default when no custom row is set. An
  // override changes where a notification goes, never what it says.
  const text = await renderEventText(workspaceId, "group", eventType, payload)
  const eventKey = options.eventKey ?? fallbackEventKey(eventType, payload)

  for (const route of targets) {
    await enqueueDelivery({
      workspaceId,
      eventKey,
      eventType,
      scope: "group",
      routeId: route.routeId || null,
      chatId: route.groupChatId,
      threadId: route.threadId,
      text,
      payload,
    })
  }

  const result = await processDeliveriesForEvent(eventKey)
  return { attempted: result.attempted, succeeded: result.sent, failed: result.failed }
}
