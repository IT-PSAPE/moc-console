/**
 * A Telegram delivery target chosen at creation time to override where a
 * `stream.created` / `meeting.created` notification is sent.
 *
 * `threadId: null` means the group's main chat; a number targets one forum
 * topic inside it. The pair mirrors `notification_routes.group_chat_id` +
 * `thread_id`, so an override and a configured route address a destination
 * the same way.
 *
 * The client only ever sends destinations it read back from the workspace's
 * registered groups, and the API re-validates every one against that same
 * list before sending — a chat id arriving from a browser is never trusted.
 */
export type NotifyDestination = {
  groupChatId: string
  threadId: number | null
}

/** Stable key for a destination, for React lists and de-duplication. */
export function notifyDestinationKey(destination: NotifyDestination): string {
  return `${destination.groupChatId}:${destination.threadId ?? "main"}`
}

export function sameNotifyDestination(a: NotifyDestination, b: NotifyDestination): boolean {
  return a.groupChatId === b.groupChatId && a.threadId === b.threadId
}
