import { getSupabaseAdmin } from "../supabase-admin.js"
import { sendTelegramMessageDetailed } from "../telegram.js"
import {
  isNotificationEventKey,
  type NotificationEventKey,
} from "../../src/data/notification-events.js"

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

// Telegram HTML parser only special-cases &, <, >.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatScheduled(scheduled: string | null): string | null {
  if (!scheduled) return null
  const date = new Date(scheduled)
  if (Number.isNaN(date.getTime())) return null
  return date.toUTCString()
}

function buildMessage<K extends NotificationEventKey>(
  eventType: K,
  payload: EventPayloadMap[K],
): string {
  switch (eventType) {
    case "stream.created": {
      const p = payload as StreamCreatedPayload
      const lines: string[] = [`<b>New YouTube stream</b>`, "", escapeHtml(p.title)]
      const when = formatScheduled(p.scheduledStartTime)
      if (when) lines.push(`Scheduled for ${escapeHtml(when)}`)
      if (p.streamUrl) lines.push("", `<a href="${p.streamUrl}">Open stream</a>`)
      return lines.join("\n")
    }
    case "meeting.created": {
      const p = payload as MeetingCreatedPayload
      const lines: string[] = [`<b>New Zoom meeting</b>`, "", escapeHtml(p.topic)]
      const when = formatScheduled(p.startTime)
      if (when) lines.push(`Scheduled for ${escapeHtml(when)}`)
      if (p.joinUrl) lines.push("", `<a href="${p.joinUrl}">Join meeting</a>`)
      return lines.join("\n")
    }
    case "request.created": {
      const p = payload as RequestCreatedPayload
      const lines: string[] = [`<b>New request</b>`, "", escapeHtml(p.title)]
      if (p.requesterName) lines.push(`From: ${escapeHtml(p.requesterName)}`)
      if (p.status) lines.push(`Status: <i>${escapeHtml(p.status)}</i>`)
      lines.push("", `<a href="${p.linkUrl}">Open request</a>`)
      return lines.join("\n")
    }
    case "request.status_changed": {
      const p = payload as RequestStatusChangedPayload
      const lines: string[] = [
        `<b>Request status updated</b>`,
        "",
        escapeHtml(p.title),
        `Status: <i>${escapeHtml(p.status)}</i>`,
      ]
      if (p.requesterName) lines.push(`From: ${escapeHtml(p.requesterName)}`)
      lines.push("", `<a href="${p.linkUrl}">Open request</a>`)
      return lines.join("\n")
    }
    case "request.archived": {
      const p = payload as RequestArchivedPayload
      const lines: string[] = [`<b>Request archived</b>`, "", escapeHtml(p.title)]
      if (p.requesterName) lines.push(`From: ${escapeHtml(p.requesterName)}`)
      lines.push("", `<a href="${p.linkUrl}">Open request</a>`)
      return lines.join("\n")
    }
    case "booking.created": {
      const p = payload as BookingCreatedPayload
      const lines: string[] = [`<b>New equipment booking</b>`, "", escapeHtml(p.title)]
      if (p.requesterName) lines.push(`From: ${escapeHtml(p.requesterName)}`)
      if (p.status) lines.push(`Status: <i>${escapeHtml(p.status)}</i>`)
      lines.push("", `<a href="${p.linkUrl}">Open booking</a>`)
      return lines.join("\n")
    }
    case "booking.status_changed": {
      const p = payload as BookingStatusChangedPayload
      return [
        `<b>Equipment booking updated</b>`,
        "",
        escapeHtml(p.title),
        `Status: <i>${escapeHtml(p.status)}</i>`,
        "",
        `<a href="${p.linkUrl}">Open booking</a>`,
      ].join("\n")
    }
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

  const text = buildMessage(eventType, payload)
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
