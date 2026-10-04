// Server-side read of a workspace's Telegram message-formatting prefs
// (time zone + date-format preset) from notification_settings. Best-effort:
// a missing row or DB hiccup
// falls back to the defaults so a formatting lookup never silences a
// notification. The matching write path lives in the settings data layer
// (src/data/notification-settings.ts).

import { queryRows } from "@moc/backend/database";
import type { QueryResultRow } from "pg";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  type DateFormatPreset,
} from "@moc/notifications";

export type FormatSettings = {
  timezone: string;
  dateFormat: DateFormatPreset;
};

type FormatSettingsRow = QueryResultRow & { timezone: string | null; date_format: string | null };

export async function fetchFormatSettings(workspaceId: string): Promise<FormatSettings> {
  try {
    const [data] = await queryRows<FormatSettingsRow>(
      "SELECT timezone, date_format FROM public.notification_settings WHERE workspace_id = $1 LIMIT 1",
      [workspaceId],
    );
    return {
      timezone: data?.timezone || DEFAULT_TIMEZONE,
      dateFormat: (data?.date_format as DateFormatPreset) || DEFAULT_DATE_FORMAT,
    };
  } catch {
    return { timezone: DEFAULT_TIMEZONE, dateFormat: DEFAULT_DATE_FORMAT };
  }
}
