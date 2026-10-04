import { moc } from "@/lib/moc-client"
import type { MessageType, TemplateScope } from "@moc/notifications"
import type { NotificationTemplate } from "@moc/sdk/notification-settings"

export type { NotificationTemplate }

export function fetchNotificationTemplates(workspaceId: string): Promise<NotificationTemplate[]> {
  return moc.notificationSettings.templates(workspaceId)
}

export function upsertNotificationTemplate(params: { workspaceId: string; scope: TemplateScope; messageType: MessageType; body: string }): Promise<NotificationTemplate> {
  return moc.notificationSettings.upsertTemplate(params.workspaceId, params.scope, params.messageType, params.body)
}

export function deleteNotificationTemplate(params: { workspaceId: string; scope: TemplateScope; messageType: MessageType }): Promise<void> {
  return moc.notificationSettings.deleteTemplate(params.workspaceId, params.scope, params.messageType)
}
