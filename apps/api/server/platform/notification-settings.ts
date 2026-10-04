import type { DateFormatPreset, MessageType, NotificationEventKey, TemplateScope } from "@moc/notifications"
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE, DEFAULT_TEMPLATES, NOTIFICATION_EVENTS } from "@moc/notifications"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, stringField, uuidField } from "./input.js"

type SettingsRow = { auto_archive_completed_requests_days: number | null; auto_archive_returned_bookings_days: number | null; timezone: string | null; date_format: string | null }
type TemplateRow = { id: string; workspace_id: string; scope: string; message_type: string; body: string; created_at: string; updated_at: string }
type RouteRow = { id: string; workspace_id: string; event_type: string; group_chat_id: string | null; thread_id: number | string | null; user_id: string | null; enabled: boolean; created_at: string; updated_at: string }
type GroupRow = { chat_id: string; title: string; type: string; is_forum: boolean; active: boolean; workspace_id: string; added_at: string; removed_at: string | null }
type TopicRow = { group_chat_id: string; thread_id: number | string; name: string; closed: boolean }

const ROUTE_FIELDS = "id, workspace_id, event_type, group_chat_id, thread_id, user_id, enabled, created_at::text, updated_at::text"
const TEMPLATE_FIELDS = "id, workspace_id, scope, message_type, body, created_at::text, updated_at::text"
const eventKeys = new Set<string>(NOTIFICATION_EVENTS.map((event) => event.key))
const messageTypes = new Set<string>(Object.keys(DEFAULT_TEMPLATES))
const dateFormats: readonly DateFormatPreset[] = ["day-month-time", "day-month-year-time", "weekday-24h"]

function emptyInput(input: unknown): void {
  if (input === null || (typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0)) return
  objectInput(input, [])
}

function positiveDays(input: Record<string, unknown>, key: string): number {
  const value = input[key]
  if (!Number.isInteger(value) || (value as number) < 1) throw new Error(`Invalid ${key}`)
  return value as number
}

function readScope(value: string): TemplateScope {
  if (value !== "group" && value !== "dm") throw new Error("Invalid template scope")
  return value
}

function readMessageType(value: string): MessageType {
  if (!messageTypes.has(value)) throw new Error("Invalid message type")
  return value as MessageType
}

function readEventType(value: string): NotificationEventKey {
  if (!eventKeys.has(value)) throw new Error("Invalid notification event")
  return value as NotificationEventKey
}

function mapTemplate(row: TemplateRow) {
  return { id: row.id, workspaceId: row.workspace_id, scope: readScope(row.scope), messageType: readMessageType(row.message_type), body: row.body, createdAt: row.created_at, updatedAt: row.updated_at }
}

function mapRoute(row: RouteRow) {
  return { id: row.id, workspaceId: row.workspace_id, eventType: readEventType(row.event_type), groupChatId: row.group_chat_id, threadId: row.thread_id === null ? null : Number(row.thread_id), userId: row.user_id, enabled: row.enabled, createdAt: row.created_at, updatedAt: row.updated_at }
}

function notFound(message: string): Error {
  const error = new Error(message) as Error & { status: number; code: string }
  error.status = 404
  error.code = "not_found"
  return error
}

async function fetchRoutes(context: PlatformContext, where: string, values: unknown[]) {
  const result = await context.db.query<RouteRow>(`SELECT ${ROUTE_FIELDS} FROM public.notification_routes WHERE workspace_id = $1 ${where}`, values)
  return result.rows.map(mapRoute)
}

export const operations: Record<string, PlatformOperation> = {
  get: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<SettingsRow>(
        `SELECT auto_archive_completed_requests_days, auto_archive_returned_bookings_days, timezone, date_format
         FROM public.notification_settings WHERE workspace_id = $1`, [context.workspaceId],
      )
      const row = result.rows[0]
      return {
        workspaceId: context.workspaceId,
        autoArchiveCompletedRequestsDays: row?.auto_archive_completed_requests_days ?? 7,
        autoArchiveReturnedBookingsDays: row?.auto_archive_returned_bookings_days ?? 7,
        timezone: row?.timezone ?? DEFAULT_TIMEZONE,
        dateFormat: (row?.date_format as DateFormatPreset | undefined) ?? DEFAULT_DATE_FORMAT,
      }
    },
  },
  updateAutoArchiveDays: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["completedRequestsDays", "returnedBookingsDays"])
      const completed = positiveDays(record, "completedRequestsDays")
      const returned = positiveDays(record, "returnedBookingsDays")
      await context.db.query(
        `INSERT INTO public.notification_settings (workspace_id, auto_archive_completed_requests_days, auto_archive_returned_bookings_days)
         VALUES ($1, $2, $3) ON CONFLICT (workspace_id) DO UPDATE SET
         auto_archive_completed_requests_days = EXCLUDED.auto_archive_completed_requests_days,
         auto_archive_returned_bookings_days = EXCLUDED.auto_archive_returned_bookings_days`,
        [context.workspaceId, completed, returned],
      )
      return null
    },
  },
  updateMessageFormat: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["timezone", "dateFormat"])
      const timezone = stringField(record, "timezone")
      const dateFormat = stringField(record, "dateFormat")
      if (!dateFormats.includes(dateFormat as DateFormatPreset)) throw new Error("Invalid date format")
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }) } catch { throw new Error("Invalid timezone") }
      await context.db.query(
        `INSERT INTO public.notification_settings (workspace_id, timezone, date_format) VALUES ($1, $2, $3)
         ON CONFLICT (workspace_id) DO UPDATE SET timezone = EXCLUDED.timezone, date_format = EXCLUDED.date_format`,
        [context.workspaceId, timezone, dateFormat],
      )
      return null
    },
  },
  templates: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      const result = await context.db.query<TemplateRow>(`SELECT ${TEMPLATE_FIELDS} FROM public.notification_message_templates WHERE workspace_id = $1 ORDER BY scope, message_type`, [context.workspaceId])
      return result.rows.map(mapTemplate)
    },
  },
  upsertTemplate: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["scope", "messageType", "body"])
      const scope = readScope(stringField(record, "scope"))
      const messageType = readMessageType(stringField(record, "messageType"))
      const body = stringField(record, "body")
      const expectedScope: TemplateScope = messageType.startsWith("assignment.") ? "dm" : "group"
      if (scope !== expectedScope) throw new Error("Template scope does not match message type")
      const result = await context.db.query<TemplateRow>(
        `INSERT INTO public.notification_message_templates (workspace_id, scope, message_type, body)
         VALUES ($1, $2, $3, $4) ON CONFLICT (workspace_id, scope, message_type) DO UPDATE
         SET body = EXCLUDED.body, updated_at = now() RETURNING ${TEMPLATE_FIELDS}`,
        [context.workspaceId, scope, messageType, body],
      )
      return result.rows[0] ? mapTemplate(result.rows[0]) : null
    },
  },
  deleteTemplate: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["scope", "messageType"])
      const scope = readScope(stringField(record, "scope"))
      const messageType = readMessageType(stringField(record, "messageType"))
      await context.db.query("DELETE FROM public.notification_message_templates WHERE workspace_id = $1 AND scope = $2 AND message_type = $3", [context.workspaceId, scope, messageType])
      return null
    },
  },
  routes: {
    permission: "can_read",
    async run(context, input) { emptyInput(input); return fetchRoutes(context, "ORDER BY event_type, created_at", [context.workspaceId]) },
  },
  routesForTarget: {
    permission: "can_read",
    async run(context, input) {
      const record = objectInput(input, ["groupChatId", "threadId"])
      const groupChatId = stringField(record, "groupChatId")
      const threadId = record.threadId
      if (threadId !== null && (!Number.isSafeInteger(threadId) || (threadId as number) < 0)) throw new Error("Invalid threadId")
      const result = await context.db.query<RouteRow>(
        `SELECT ${ROUTE_FIELDS} FROM public.notification_routes WHERE workspace_id = $1 AND group_chat_id = $2
         AND thread_id IS NOT DISTINCT FROM $3::bigint ORDER BY event_type, created_at`,
        [context.workspaceId, groupChatId, threadId],
      )
      return result.rows.map(mapRoute)
    },
  },
  routesForUser: {
    permission: "can_read",
    async run(context, input) {
      const record = objectInput(input, ["userId"])
      return fetchRoutes(context, "AND user_id = $2 ORDER BY event_type, created_at", [context.workspaceId, uuidField(record, "userId")])
    },
  },
  createRoute: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["eventType", "groupChatId", "threadId"])
      const eventType = readEventType(stringField(record, "eventType"))
      const groupChatId = stringField(record, "groupChatId")
      const threadId = record.threadId
      if (threadId !== null && (!Number.isSafeInteger(threadId) || (threadId as number) < 0)) throw new Error("Invalid threadId")
      const result = await context.db.query<RouteRow>(
        `INSERT INTO public.notification_routes (workspace_id, event_type, group_chat_id, thread_id)
         SELECT $1, $2, g.chat_id, $4 FROM public.telegram_groups g
         WHERE g.workspace_id = $1 AND g.chat_id = $3 AND g.removed_at IS NULL
         RETURNING ${ROUTE_FIELDS}`,
        [context.workspaceId, eventType, groupChatId, threadId],
      )
      if (!result.rows[0]) throw notFound("Telegram group not found")
      return mapRoute(result.rows[0])
    },
  },
  createUserRoute: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["eventType", "userId"])
      const eventType = readEventType(stringField(record, "eventType"))
      const userId = uuidField(record, "userId")
      const result = await context.db.query<RouteRow>(
        `INSERT INTO public.notification_routes (workspace_id, event_type, user_id)
         SELECT $1, $2, m.user_id FROM public.workspace_users m WHERE m.workspace_id = $1 AND m.user_id = $3
         RETURNING ${ROUTE_FIELDS}`,
        [context.workspaceId, eventType, userId],
      )
      if (!result.rows[0]) throw notFound("Workspace member not found")
      return mapRoute(result.rows[0])
    },
  },
  deleteRoute: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["id"])
      const result = await context.db.query("DELETE FROM public.notification_routes WHERE workspace_id = $1 AND id = $2", [context.workspaceId, uuidField(record, "id")])
      if (result.rowCount === 0) throw notFound("Notification route not found")
      return null
    },
  },
  setRouteEnabled: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["id", "enabled"])
      if (typeof record.enabled !== "boolean") throw new Error("Invalid enabled")
      const result = await context.db.query("UPDATE public.notification_routes SET enabled = $3 WHERE workspace_id = $1 AND id = $2", [context.workspaceId, uuidField(record, "id"), record.enabled])
      if (result.rowCount === 0) throw notFound("Notification route not found")
      return null
    },
  },
  telegramGroups: {
    permission: "can_read",
    async run(context, input) {
      emptyInput(input)
      const groups = await context.db.query<GroupRow>(
        `SELECT chat_id, title, type, is_forum, active, workspace_id, added_at::text, removed_at::text
         FROM public.telegram_groups WHERE workspace_id = $1 AND removed_at IS NULL ORDER BY added_at DESC`,
        [context.workspaceId],
      )
      const topics = await context.db.query<TopicRow>(
        `SELECT t.group_chat_id, t.thread_id, t.name, t.closed FROM public.telegram_group_topics t
         JOIN public.telegram_groups g ON g.chat_id = t.group_chat_id WHERE g.workspace_id = $1 AND g.removed_at IS NULL
         ORDER BY t.group_chat_id, t.thread_id`,
        [context.workspaceId],
      )
      const topicsByGroup = new Map<string, Array<{ threadId: number; name: string; closed: boolean }>>()
      for (const topic of topics.rows) topicsByGroup.set(topic.group_chat_id, [...(topicsByGroup.get(topic.group_chat_id) ?? []), { threadId: Number(topic.thread_id), name: topic.name, closed: topic.closed }])
      return groups.rows.map((group) => ({ chatId: group.chat_id, title: group.title, type: group.type, isForum: group.is_forum, active: group.active, workspaceId: group.workspace_id, addedAt: group.added_at, removedAt: group.removed_at, topics: topicsByGroup.get(group.chat_id) ?? [] }))
    },
  },
  setTelegramGroupActive: {
    permission: "can_manage_roles",
    async run(context, input) {
      const record = objectInput(input, ["chatId", "active"])
      if (typeof record.active !== "boolean") throw new Error("Invalid active")
      const result = await context.db.query("UPDATE public.telegram_groups SET active = $3 WHERE workspace_id = $1 AND chat_id = $2 AND removed_at IS NULL", [context.workspaceId, stringField(record, "chatId"), record.active])
      if (result.rowCount === 0) throw notFound("Telegram group not found")
      return null
    },
  },
}
