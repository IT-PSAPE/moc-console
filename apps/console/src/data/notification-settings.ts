import { supabase } from "@moc/data/supabase";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  type DateFormatPreset,
} from "./notification-templates-core";

// Per-workspace stale-item config. The threshold is both the "flag after
// N days idle" window and the re-nag cadence (the daily sweep re-alerts
// each item at most once per window). Default matches the DB default.
export const DEFAULT_STALE_THRESHOLD_DAYS = 3;
export const DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS = 7;
export const DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS = 7;

export type NotificationSettings = {
  workspaceId: string;
  staleThresholdDays: number;
  autoArchiveCompletedRequestsDays: number;
  autoArchiveReturnedBookingsDays: number;
  // How dates render in Telegram messages — see notification-templates-core.
  timezone: string;
  dateFormat: DateFormatPreset;
};

export async function fetchNotificationSettings(workspaceId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("stale_threshold_days, auto_archive_completed_requests_days, auto_archive_returned_bookings_days, timezone, date_format")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    workspaceId,
    staleThresholdDays: data?.stale_threshold_days ?? DEFAULT_STALE_THRESHOLD_DAYS,
    autoArchiveCompletedRequestsDays:
      data?.auto_archive_completed_requests_days ?? DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS,
    autoArchiveReturnedBookingsDays:
      data?.auto_archive_returned_bookings_days ?? DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS,
    timezone: data?.timezone ?? DEFAULT_TIMEZONE,
    dateFormat: (data?.date_format as DateFormatPreset) ?? DEFAULT_DATE_FORMAT,
  };
}

export async function updateStaleThresholdDays(workspaceId: string, days: number): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      { workspace_id: workspaceId, stale_threshold_days: days },
      { onConflict: "workspace_id" },
    );
  if (error) throw new Error(error.message);
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

// Upsert only the formatting columns so the stale threshold (and its DB
// default on first insert) is left untouched.
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
