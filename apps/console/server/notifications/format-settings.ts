// Server-side read of a workspace's Telegram message-formatting prefs
// (time zone + date-format preset) from notification_settings, via the
// service-role admin client. Best-effort: a missing row or DB hiccup
// falls back to the defaults so a formatting lookup never silences a
// notification. The matching write path lives in the settings data layer
// (src/data/notification-settings.ts).

import { getSupabaseAdmin } from "../supabase-admin.js";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  type DateFormatPreset,
} from "../../src/data/notification-templates-core.js";

export type FormatSettings = {
  timezone: string;
  dateFormat: DateFormatPreset;
};

export async function fetchFormatSettings(workspaceId: string): Promise<FormatSettings> {
  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("notification_settings")
      .select("timezone, date_format")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    return {
      timezone: data?.timezone || DEFAULT_TIMEZONE,
      dateFormat: (data?.date_format as DateFormatPreset) || DEFAULT_DATE_FORMAT,
    };
  } catch {
    return { timezone: DEFAULT_TIMEZONE, dateFormat: DEFAULT_DATE_FORMAT };
  }
}
