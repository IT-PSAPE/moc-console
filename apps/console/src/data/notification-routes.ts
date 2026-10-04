import { moc } from "@/lib/moc-client"
import type { NotificationEventKey } from "@moc/notifications"
import type { NotificationRoute } from "@moc/sdk/notification-settings"

export type { NotificationRoute }

export function fetchNotificationRoutes(workspaceId: string): Promise<NotificationRoute[]> {
  return moc.notificationSettings.routes(workspaceId)
}

export function fetchNotificationRoutesForTarget(workspaceId: string, groupChatId: string, threadId: number | null): Promise<NotificationRoute[]> {
  return moc.notificationSettings.routesForTarget(workspaceId, groupChatId, threadId)
}

export function fetchNotificationRoutesForUser(workspaceId: string, userId: string): Promise<NotificationRoute[]> {
  return moc.notificationSettings.routesForUser(workspaceId, userId)
}

export function createNotificationRoute(params: { workspaceId: string; eventType: NotificationEventKey; groupChatId: string; threadId: number | null }): Promise<NotificationRoute> {
  return moc.notificationSettings.createRoute(params.workspaceId, params.eventType, params.groupChatId, params.threadId)
}

export function createUserNotificationRoute(params: { workspaceId: string; eventType: NotificationEventKey; userId: string }): Promise<NotificationRoute> {
  return moc.notificationSettings.createUserRoute(params.workspaceId, params.eventType, params.userId)
}

export function deleteNotificationRoute(workspaceId: string, id: string): Promise<void> {
  return moc.notificationSettings.deleteRoute(workspaceId, id)
}

export function setNotificationRouteEnabled(workspaceId: string, id: string, enabled: boolean): Promise<void> {
  return moc.notificationSettings.setRouteEnabled(workspaceId, id, enabled)
}
