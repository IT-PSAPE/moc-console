import { moc } from "@/lib/moc-client"
import type { TelegramGroup as RegisteredTelegramGroup, TelegramGroupTopic as RegisteredTelegramGroupTopic } from "@moc/sdk/notification-settings"

export type TelegramGroupTopic = Omit<RegisteredTelegramGroupTopic, "threadId"> & { threadId: number | null }
export type TelegramGroup = Omit<RegisteredTelegramGroup, "topics"> & { topics: TelegramGroupTopic[] }

function withGeneralTopic(group: RegisteredTelegramGroup): TelegramGroup {
  const general = group.topics.find(topic => topic.threadId === 1)
  return {
    ...group,
    // Telegram's General destination is sent without message_thread_id.
    topics: [
      { threadId: null, name: "General", closed: general?.closed ?? false },
      ...group.topics.filter(topic => topic.threadId !== 1),
    ],
  }
}

export async function fetchTelegramGroups(workspaceId: string): Promise<TelegramGroup[]> {
  const groups = await moc.notificationSettings.telegramGroups(workspaceId)
  return groups.map(withGeneralTopic)
}

export function setTelegramGroupActive(workspaceId: string, chatId: string, active: boolean): Promise<void> {
  return moc.notificationSettings.setTelegramGroupActive(workspaceId, chatId, active)
}
