import { moc } from "@/lib/moc-client"
import type { TelegramGroup, TelegramGroupTopic } from "@moc/sdk/notification-settings"

export type { TelegramGroup, TelegramGroupTopic }

export function fetchTelegramGroups(workspaceId: string): Promise<TelegramGroup[]> {
  return moc.notificationSettings.telegramGroups(workspaceId)
}

export function setTelegramGroupActive(workspaceId: string, chatId: string, active: boolean): Promise<void> {
  return moc.notificationSettings.setTelegramGroupActive(workspaceId, chatId, active)
}
