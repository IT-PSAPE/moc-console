// Date / time formatting for notification tokens. Every date in a
// Telegram message is rendered in the workspace's configured time zone
// using a named preset. Enrichment (server-side) returns raw ISO
// strings; formatDateTokens localises them at the render boundary, once
// the workspace's settings are known. Pure + Intl-only so it runs
// unchanged on the server and in the settings live-preview.

import type { TokenValues } from "./render-template.js";

export type DateFormatPreset =
  | "day-month-time"        // 21 May, 7:00 PM   (default)
  | "day-month-year-time"   // 21 May 2026, 7:00 PM
  | "weekday-24h";          // Thu, 21 May 2026, 19:00

export const DEFAULT_TIMEZONE = "Africa/Harare";
export const DEFAULT_DATE_FORMAT: DateFormatPreset = "day-month-time";

// Dropdown metadata for the settings UI (value, human label, live example).
export const DATE_FORMAT_OPTIONS: ReadonlyArray<{
  value: DateFormatPreset;
  label: string;
  example: string;
}> = [
  { value: "day-month-time", label: "Day & month + time", example: "21 May, 7:00 PM" },
  { value: "day-month-year-time", label: "Full date + time", example: "21 May 2026, 7:00 PM" },
  { value: "weekday-24h", label: "Weekday + 24-hour", example: "Thu, 21 May 2026, 19:00" },
];

// Token names whose values are ISO timestamps to localise. Everything
// else (clock durations, free-text dates, the meeting's own `timezone`)
// passes through untouched.
const DATE_TOKEN_NAMES = new Set<string>([
  "dueDate", "createdAt", "updatedAt",
  "checkedOutAt", "expectedReturnAt", "returnedAt",
  "scheduledStartTime", "actualStartTime",
  "startTime",
  "checklistScheduledAt",
  "startsAt", "endsAt", "cancelledAt",
]);

function resolveTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * Format an ISO timestamp in `timezone` using a named preset. Returns ""
 * for empty/invalid input (so an empty optional token stays empty and its
 * template line is dropped). Falls back to UTC for an unknown zone and to
 * the 12-hour day+month preset for an unknown key. en-GB gives the
 * day-before-month order; parts are reassembled by hand so punctuation
 * and casing match the presets exactly across environments.
 */
export function formatInstant(
  iso: string | null | undefined,
  timezone: string,
  preset: DateFormatPreset,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const timeZone = resolveTimeZone(timezone);

  if (preset === "weekday-24h") {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone, weekday: "short", day: "numeric", month: "short",
      year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    return `${part(p, "weekday")}, ${part(p, "day")} ${part(p, "month")} ${part(p, "year")}, ${part(p, "hour")}:${part(p, "minute")}`;
  }

  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone, day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(date);
  const time = `${part(p, "hour")}:${part(p, "minute")} ${part(p, "dayPeriod").toUpperCase()}`;
  return preset === "day-month-year-time"
    ? `${part(p, "day")} ${part(p, "month")} ${part(p, "year")}, ${time}`
    : `${part(p, "day")} ${part(p, "month")}, ${time}`;
}

/**
 * Return a copy of `values` with every ISO date token rendered in the
 * workspace's zone/format. Non-date and empty tokens are left untouched.
 */
export function formatDateTokens(
  values: TokenValues,
  timezone: string,
  preset: DateFormatPreset,
): TokenValues {
  const out: TokenValues = { ...values };
  for (const name of DATE_TOKEN_NAMES) {
    const v = out[name];
    if (v != null && v !== "") out[name] = formatInstant(v, timezone, preset);
  }
  return out;
}
