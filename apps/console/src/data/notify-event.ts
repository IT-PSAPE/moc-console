import { moc } from "@/lib/moc-client"
import type { NotifyDestination } from "@moc/types/streams"
import type { NotificationDispatchResult, NotificationEntityType } from "@moc/sdk"

export type { NotificationDispatchResult } from "@moc/sdk"
export type NotifyEntityType = NotificationEntityType

async function notify(
  path: string,
  operation: () => Promise<NotificationDispatchResult>,
): Promise<NotificationDispatchResult | null> {
  try {
    return await operation()
  } catch (error) {
    console.warn("Notification request failed", { path, error })
    return null
  }
}

export function notifyStreamCreated(streamId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/stream-created", () => moc.notifications.streamCreated(streamId, destinations))
}

export function notifyMeetingCreated(meetingId: string, destinations?: NotifyDestination[]): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/meeting-created", () => moc.notifications.meetingCreated(meetingId, destinations))
}

export function notifyEntityChanged(entityType: NotifyEntityType, entityId: string): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/entity-changed", () => moc.notifications.entityChanged(entityType, entityId))
}

export function notifyStreamUpdated(streamId: string): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/stream-updated", () => moc.notifications.streamUpdated(streamId))
}

export function notifyMeetingUpdated(meetingId: string): Promise<NotificationDispatchResult | null> {
  return notify("/api/notifications/internal/meeting-updated", () => moc.notifications.meetingUpdated(meetingId))
}
