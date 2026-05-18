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

export type StreamCreatedPayload = {
  title: string
  scheduledStartTime: string | null
  streamUrl: string | null
}

export type MeetingCreatedPayload = {
  topic: string
  startTime: string | null
  joinUrl: string | null
}

export type RequestCreatedPayload = {
  title: string
  status: string | null
  requesterName: string | null
  linkUrl: string
}

export type RequestStatusChangedPayload = {
  title: string
  status: string
  requesterName?: string | null
  linkUrl: string
}

export type RequestArchivedPayload = {
  title: string
  requesterName?: string | null
  linkUrl: string
}

export type BookingCreatedPayload = {
  title: string
  status?: string | null
  requesterName?: string | null
  linkUrl: string
}

export type BookingStatusChangedPayload = {
  title: string
  status: string
  linkUrl: string
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

// Flatten a payload into the {{token}} values the renderer substitutes.
// Date/URL derivation lives here; escaping + line-collapse is the
// renderer's job. Token names must match TEMPLATE_TOKENS in the core.
function buildTokens<K extends NotificationEventKey>(
  eventType: K,
  payload: EventPayloadMap[K],
): TokenValues {
  switch (eventType) {
    case "stream.created": {
      const p = payload as StreamCreatedPayload
      return {
        title: p.title,
        scheduledStartTime: formatScheduled(p.scheduledStartTime),
        streamUrl: p.streamUrl,
      }
    }
    case "meeting.created": {
      const p = payload as MeetingCreatedPayload
      return {
        topic: p.topic,
        startTime: formatScheduled(p.startTime),
        joinUrl: p.joinUrl,
      }
    }
    case "request.created": {
      const p = payload as RequestCreatedPayload
      return { title: p.title, status: p.status, requesterName: p.requesterName, linkUrl: p.linkUrl }
    }
    case "request.status_changed": {
      const p = payload as RequestStatusChangedPayload
      return { title: p.title, status: p.status, requesterName: p.requesterName, linkUrl: p.linkUrl }
    }
    case "request.archived": {
      const p = payload as RequestArchivedPayload
      return { title: p.title, requesterName: p.requesterName, linkUrl: p.linkUrl }
    }
    case "booking.created": {
      const p = payload as BookingCreatedPayload
      return { title: p.title, status: p.status, requesterName: p.requesterName, linkUrl: p.linkUrl }
    }
    case "booking.status_changed": {
      const p = payload as BookingStatusChangedPayload
      return { title: p.title, status: p.status, linkUrl: p.linkUrl }
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
  const text = renderTemplate(template, buildTokens(eventType, payload))
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
