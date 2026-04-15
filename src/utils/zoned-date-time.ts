type DateTimeParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

function resolveTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return timezone
  } catch {
    return "UTC"
  }
}

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: resolveTimeZone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
}

function getDateTimeParts(iso: string, timezone: string): DateTimeParts {
  const parts = getFormatter(timezone).formatToParts(new Date(iso))

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
    second: parts.find((part) => part.type === "second")?.value ?? "00",
  }
}

function parseShortOffset(offset: string): number {
  const match = offset.match(/^GMT(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)?$/)

  if (!match) return 0

  const sign = match[1] === "-" ? -1 : 1
  const hours = Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)

  return sign * ((hours * 60) + minutes)
}

function getOffsetMinutes(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timezone),
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date)

  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT"

  return parseShortOffset(offset)
}

function parseDateTimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)

  if (!match) {
    throw new Error(`Invalid datetime-local value: ${value}`)
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  }
}

export function formatUtcIsoForDateTimeInput(iso: string | null, timezone: string): string {
  if (!iso) return ""

  const parts = getDateTimeParts(iso, timezone)

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function formatUtcIsoForZoomApi(iso: string, timezone: string): string {
  const parts = getDateTimeParts(iso, timezone)

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

export function parseDateTimeInputToUtcIso(value: string, timezone: string): string {
  const parts = parseDateTimeLocal(value)
  let utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  // Re-run the offset calculation against the resolved instant so DST-aware zones settle correctly.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offsetMinutes = getOffsetMinutes(timezone, new Date(utcMs))
    const nextUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
      - (offsetMinutes * 60_000)

    if (nextUtcMs === utcMs) break
    utcMs = nextUtcMs
  }

  return new Date(utcMs).toISOString()
}

type DateTimeFormatOptions = Intl.DateTimeFormatOptions & {
  fallback?: string
}

export function formatUtcIsoInTimezone(iso: string | null, timezone: string, options?: DateTimeFormatOptions): string {
  if (!iso) return options?.fallback ?? "Not set"

  const formatOptions: Intl.DateTimeFormatOptions & { fallback?: string } = { ...(options ?? {}) }
  delete formatOptions.fallback
  const hasStyleShortcut = "dateStyle" in formatOptions || "timeStyle" in formatOptions
  const defaultOptions: Intl.DateTimeFormatOptions = hasStyleShortcut
    ? {}
    : {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }

  return new Intl.DateTimeFormat(undefined, {
    ...defaultOptions,
    ...formatOptions,
    timeZone: resolveTimeZone(timezone),
  }).format(new Date(iso))
}
