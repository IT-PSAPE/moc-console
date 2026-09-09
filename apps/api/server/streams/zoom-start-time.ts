/**
 * Mirrors `normalizeZoomStartTime` in apps/console/src/data/zoom-meeting-sync.ts,
 * which reaches @moc/utils for the zone maths. That package exports raw
 * TypeScript, which a Vercel function cannot resolve at runtime, so the offset
 * resolution is reimplemented here against Intl only. Both copies must agree:
 * they write the same `zoom_meetings.start_time` column, and a disagreement
 * would move a meeting by the zone's offset on every alternate sync.
 */

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const SHORT_OFFSET = /^GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/

/** An unknown zone falls back to UTC rather than throwing mid-sweep. */
function resolveTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return timezone
  } catch {
    return "UTC"
  }
}

function getOffsetMinutes(timezone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timezone),
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date)

  const match = (parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT").match(SHORT_OFFSET)
  if (!match) return 0

  const sign = match[1] === "-" ? -1 : 1
  return sign * ((Number(match[2] ?? 0) * 60) + Number(match[3] ?? 0))
}

function parseLocalDateTimeToUtcIso(value: string, timezone: string): string | null {
  const match = value.match(LOCAL_DATE_TIME)
  if (!match) return null

  const [year, month, day, hour, minute, second] = [match[1], match[2], match[3], match[4], match[5], match[6] ?? "0"].map(Number)
  const localMs = Date.UTC(year, month - 1, day, hour, minute, second)
  let utcMs = localMs

  // Re-run the offset against the resolved instant so DST-aware zones settle:
  // the offset that applies depends on the instant the offset is used to find.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const nextUtcMs = localMs - (getOffsetMinutes(timezone, new Date(utcMs)) * 60_000)
    if (nextUtcMs === utcMs) break
    utcMs = nextUtcMs
  }

  return new Date(utcMs).toISOString()
}

/**
 * Zoom reports a meeting's start either as a UTC instant or as wall-clock time
 * in the meeting's own timezone, so an offset-less value has to be resolved
 * through that zone before it can be stored as UTC.
 */
export function normalizeZoomStartTime(startTime: string | null, timezone: string): string | null {
  if (!startTime) return null
  if (/z$/i.test(startTime) || /[+-]\d{2}:\d{2}$/.test(startTime)) {
    const parsed = Date.parse(startTime)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
  }
  return parseLocalDateTimeToUtcIso(startTime.slice(0, 19), timezone)
}
