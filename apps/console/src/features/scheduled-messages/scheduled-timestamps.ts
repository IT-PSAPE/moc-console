import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from '@moc/utils/zoned-date-time'

export function scheduledTimestamp(value: string, timezone: string): string {
    new Intl.DateTimeFormat('en', { timeZone: timezone })
    const iso = parseDateTimeInputToUtcIso(value, timezone)
    if (formatUtcIsoForDateTimeInput(iso, timezone) !== value) throw new Error('Choose a valid date and time in the schedule timezone')
    return iso
}

export function scheduleTimestamps(startsOn: string, expiresAt: string, timezone: string): { startsOn: string; expiresAt: string } {
    const send = scheduledTimestamp(startsOn, timezone)
    const expiry = scheduledTimestamp(expiresAt, timezone)
    const duration = Date.parse(expiry) - Date.parse(send)
    if (duration < 60_000 || duration > 8760 * 3600_000) throw new Error('Expiry must be 1 minute to 8760 hours after send')
    return { startsOn: send, expiresAt: expiry }
}

export function previewExpiry(value: string, timezone: string): string | undefined {
    try { return scheduledTimestamp(value, timezone) } catch { return undefined }
}
