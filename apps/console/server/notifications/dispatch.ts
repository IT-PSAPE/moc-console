import { getSupabaseAdmin } from "../supabase-admin.js"
import { sendTelegramMessageDetailed } from "../telegram.js"
import {
  isNotificationEventKey,
  type NotificationEventKey,
} from "../../src/data/notification-events.js"
import {
  renderTemplate,
  type TokenValues,
} from "../../src/data/notification-templates-core.js"
import { resolveTemplate } from "./templates.js"
import {
  enrichBooking,
  enrichRequest,
  enrichStream,
  enrichMeeting,
} from "./enrich.js"

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

export type EventPayloadMap = {
  "stream.created": StreamCreatedPayload
  "meeting.created": MeetingCreatedPayload
  "request.created": RequestCreatedPayload
  "request.status_changed": RequestStatusChangedPayload
  "request.archived": RequestArchivedPayload
  "booking.created": BookingCreatedPayload
  "booking.status_changed": BookingStatusChangedPayload
}

type RouteRow = {
  id: string
  group_chat_id: string
  thread_id: number | null
  telegram_groups: { active: boolean; removed_at: string | null } | null
}

function formatScheduled(scheduled: string | null): string | null {
  if (!scheduled) return null
  const date = new Date(scheduled)
  if (Number.isNaN(date.getTime())) return null
  return date.toUTCString()
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
    case "request.archived": {
      const p = payload as RequestCreatedPayload &
        RequestStatusChangedPayload &
        RequestArchivedPayload
      const base: TokenValues = {
        title: p.title,
        status: p.status,
        requesterName: p.requesterName,
        linkUrl: p.linkUrl,
      }
      const enriched = p.requestId ? await enrichRequest(p.requestId) : {}
      // linkUrl always from payload (built with the console base URL).
      return { ...enriched, ...nonEmpty(base), linkUrl: p.linkUrl }
    }
    case "booking.created":
    case "booking.status_changed": {
      const p = payload as BookingCreatedPayload & BookingStatusChangedPayload
      const base: TokenValues = {
        title: p.title,
        status: p.status,
        requesterName: p.requesterName,
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

export async function dispatchEvent<K extends NotificationEventKey>(
  workspaceId: string,
  eventType: K,
  payload: EventPayloadMap[K],
): Promise<{ attempted: number; succeeded: number }> {
  if (!isNotificationEventKey(eventType)) {
    return { attempted: 0, succeeded: 0 }
  }

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
    return { attempted: 0, succeeded: 0 }
  }

  const routes = ((data ?? []) as unknown as RouteRow[]).filter((r) => {
    const group = Array.isArray(r.telegram_groups) ? r.telegram_groups[0] : r.telegram_groups
    return group?.active === true && !group.removed_at
  })

  if (routes.length === 0) return { attempted: 0, succeeded: 0 }

  // One template lookup per dispatch (shared across all routes), then
  // fall back to the hardcoded default when no custom row is set.
  const template = await resolveTemplate(workspaceId, "group", eventType)
  const text = renderTemplate(template, await buildTokens(workspaceId, eventType, payload))
  let succeeded = 0

  for (const route of routes) {
    const send = await sendTelegramMessageDetailed(route.group_chat_id, text, {
      parseMode: "HTML",
      disableLinkPreview: true,
      ...(route.thread_id !== null ? { threadId: route.thread_id } : {}),
    })

    if (send.ok) {
      succeeded += 1
    } else {
      await logDeliveryFailure({
        workspaceId,
        eventType,
        routeId: route.id,
        groupChatId: route.group_chat_id,
        threadId: route.thread_id,
        errorCode: send.errorCode,
        description: send.description,
        payload,
      })
    }
  }

  return { attempted: routes.length, succeeded }
}
