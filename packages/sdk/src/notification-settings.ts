import type { DateFormatPreset, MessageType, NotificationEventKey, TemplateScope } from "@moc/notifications"
import type { MocTransport } from "./transport"

export type NotificationSettings = {
  workspaceId: string
  autoArchiveCompletedRequestsDays: number
  autoArchiveReturnedBookingsDays: number
  timezone: string
  dateFormat: DateFormatPreset
}

export type NotificationTemplate = {
  id: string
  workspaceId: string
  scope: TemplateScope
  messageType: MessageType
  body: string
  createdAt: string
  updatedAt: string
}

export type NotificationRoute = {
  id: string
  workspaceId: string
  eventType: NotificationEventKey
  groupChatId: string | null
  threadId: number | null
  userId: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type TelegramGroupTopic = { threadId: number; name: string; closed: boolean }
export type TelegramGroup = {
  chatId: string
  title: string
  type: string
  isForum: boolean
  active: boolean
  workspaceId: string
  addedAt: string
  removedAt: string | null
  topics: TelegramGroupTopic[]
}

export function createNotificationSettingsClient(transport: MocTransport) {
  return {
    get: (workspaceId: string) => transport.call<NotificationSettings>("notification-settings", "get", undefined, workspaceId),
    updateAutoArchiveDays: (workspaceId: string, completedRequestsDays: number, returnedBookingsDays: number) =>
      transport.call<void>("notification-settings", "updateAutoArchiveDays", { completedRequestsDays, returnedBookingsDays }, workspaceId),
    updateMessageFormat: (workspaceId: string, timezone: string, dateFormat: DateFormatPreset) =>
      transport.call<void>("notification-settings", "updateMessageFormat", { timezone, dateFormat }, workspaceId),
    templates: (workspaceId: string) => transport.call<NotificationTemplate[]>("notification-settings", "templates", undefined, workspaceId),
    upsertTemplate: (workspaceId: string, scope: TemplateScope, messageType: MessageType, body: string) =>
      transport.call<NotificationTemplate>("notification-settings", "upsertTemplate", { scope, messageType, body }, workspaceId),
    deleteTemplate: (workspaceId: string, scope: TemplateScope, messageType: MessageType) =>
      transport.call<void>("notification-settings", "deleteTemplate", { scope, messageType }, workspaceId),
    routes: (workspaceId: string) => transport.call<NotificationRoute[]>("notification-settings", "routes", undefined, workspaceId),
    routesForTarget: (workspaceId: string, groupChatId: string, threadId: number | null) =>
      transport.call<NotificationRoute[]>("notification-settings", "routesForTarget", { groupChatId, threadId }, workspaceId),
    routesForUser: (workspaceId: string, userId: string) =>
      transport.call<NotificationRoute[]>("notification-settings", "routesForUser", { userId }, workspaceId),
    createRoute: (workspaceId: string, eventType: NotificationEventKey, groupChatId: string, threadId: number | null) =>
      transport.call<NotificationRoute>("notification-settings", "createRoute", { eventType, groupChatId, threadId }, workspaceId),
    createUserRoute: (workspaceId: string, eventType: NotificationEventKey, userId: string) =>
      transport.call<NotificationRoute>("notification-settings", "createUserRoute", { eventType, userId }, workspaceId),
    deleteRoute: (workspaceId: string, id: string) => transport.call<void>("notification-settings", "deleteRoute", { id }, workspaceId),
    setRouteEnabled: (workspaceId: string, id: string, enabled: boolean) =>
      transport.call<void>("notification-settings", "setRouteEnabled", { id, enabled }, workspaceId),
    telegramGroups: (workspaceId: string) => transport.call<TelegramGroup[]>("notification-settings", "telegramGroups", undefined, workspaceId),
    setTelegramGroupActive: (workspaceId: string, chatId: string, active: boolean) =>
      transport.call<void>("notification-settings", "setTelegramGroupActive", { chatId, active }, workspaceId),
  }
}
