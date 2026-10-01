import { supabase } from "@moc/data/supabase";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  type DateFormatPreset,
} from "@moc/notifications";

export const DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS = 7;
export const DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS = 7;

export type NotificationSettings = {
  workspaceId: string;
  autoArchiveCompletedRequestsDays: number;
  autoArchiveReturnedBookingsDays: number;
  // How dates render in Telegram messages — see formatDateTokens in @moc/notifications.
  timezone: string;
  dateFormat: DateFormatPreset;
};

export async function fetchNotificationSettings(workspaceId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("auto_archive_completed_requests_days, auto_archive_returned_bookings_days, timezone, date_format")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    workspaceId,
    autoArchiveCompletedRequestsDays:
      data?.auto_archive_completed_requests_days ?? DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS,
    autoArchiveReturnedBookingsDays:
      data?.auto_archive_returned_bookings_days ?? DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS,
    timezone: data?.timezone ?? DEFAULT_TIMEZONE,
    dateFormat: (data?.date_format as DateFormatPreset) ?? DEFAULT_DATE_FORMAT,
  };
}

export async function updateAutoArchiveDays(
  workspaceId: string,
  completedRequestsDays: number,
  returnedBookingsDays: number,
): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      {
        workspace_id: workspaceId,
        auto_archive_completed_requests_days: completedRequestsDays,
        auto_archive_returned_bookings_days: returnedBookingsDays,
      },
      { onConflict: "workspace_id" },
    );
  if (error) throw new Error(error.message);
}

// Update formatting independently of the auto-archive settings.
export async function updateMessageFormat(
  workspaceId: string,
  timezone: string,
  dateFormat: DateFormatPreset,
): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      { workspace_id: workspaceId, timezone, date_format: dateFormat },
      { onConflict: "workspace_id" },
    );
  if (error) throw new Error(error.message);
}
