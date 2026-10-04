import { moc } from "@/lib/moc-client"
import { DEFAULT_DATE_FORMAT, DEFAULT_TIMEZONE } from "@moc/notifications"
import type { DateFormatPreset } from "@moc/notifications"
import type { NotificationSettings } from "@moc/sdk/notification-settings"

export const DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS = 7
export const DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS = 7

export type { NotificationSettings }

export async function fetchNotificationSettings(workspaceId: string): Promise<NotificationSettings> {
  const settings = await moc.notificationSettings.get(workspaceId)
  return {
    ...settings,
    autoArchiveCompletedRequestsDays: settings.autoArchiveCompletedRequestsDays ?? DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS,
    autoArchiveReturnedBookingsDays: settings.autoArchiveReturnedBookingsDays ?? DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS,
    timezone: settings.timezone ?? DEFAULT_TIMEZONE,
    dateFormat: settings.dateFormat ?? DEFAULT_DATE_FORMAT,
  }
}

export function updateAutoArchiveDays(workspaceId: string, completedRequestsDays: number, returnedBookingsDays: number): Promise<void> {
  return moc.notificationSettings.updateAutoArchiveDays(workspaceId, completedRequestsDays, returnedBookingsDays)
}

export function updateMessageFormat(workspaceId: string, timezone: string, dateFormat: DateFormatPreset): Promise<void> {
  return moc.notificationSettings.updateMessageFormat(workspaceId, timezone, dateFormat)
}
