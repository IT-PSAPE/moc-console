import {
  formatUtcIsoForDateTimeInput,
  formatUtcIsoInTimezone,
  parseDateTimeInputToUtcIso,
} from "./zoned-date-time"

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function formatUtcIsoInBrowserTimeZone(iso: string | null, options?: Intl.DateTimeFormatOptions & { fallback?: string }): string {
  return formatUtcIsoInTimezone(iso, getBrowserTimeZone(), options)
}

export function formatUtcIsoForBrowserDateTimeInput(iso: string | null): string {
  return formatUtcIsoForDateTimeInput(iso, getBrowserTimeZone())
}

export function parseBrowserDateTimeInputToUtcIso(value: string): string {
  return parseDateTimeInputToUtcIso(value, getBrowserTimeZone())
}
